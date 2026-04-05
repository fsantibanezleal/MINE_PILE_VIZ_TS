import path from "node:path";
import { access, readFile } from "node:fs/promises";
import { ZodError, type ZodType } from "zod";
import {
  DEFAULT_FULL_RENDER_STRIDE,
  DEFAULT_FULL_RENDER_THRESHOLD,
} from "@/lib/app-config";
import {
  deriveShellCells,
  deriveSurfaceCells,
} from "@/lib/stockpile-rendering";
import { normalizeQualityValue } from "@/lib/quality-values";
import { buildMassWeightedQualitySummary } from "@/lib/quality-summary";
import type {
  AppManifest,
  BeltBlockRecord,
  BeltSnapshot,
  CircuitGraph,
  ObjectRegistryEntry,
  ObjectSummary,
  PileCellRecord,
  PileDataset,
  PileDatasetMeta,
  ProfilerIndex,
  ProfilerObjectManifest,
  ProfilerSnapshot,
  ProfilerSummaryRow,
  QualityDefinition,
  QualityValueMap,
} from "@/types/app-data";
import { readArrowRows } from "@/lib/server/arrow";
import {
  AppDataContractError,
  getErrorMessage,
} from "@/lib/server/app-data-errors";
import {
  circuitGraphSchema,
  manifestSchema,
  objectRegistryEntrySchema,
  objectSummarySchema,
  pileDatasetMetaSchema,
  profilerIndexSchema,
  profilerObjectManifestSchema,
  qualityDefinitionSchema,
} from "@/lib/server/schemas";

function getDensePileRef(entry: ObjectRegistryEntry) {
  return entry.livePileRef ?? entry.stockpileRef ?? null;
}

function getAppDataRoot() {
  const configuredRoot = process.env.APP_DATA_ROOT?.trim();

  return configuredRoot
    ? path.resolve(configuredRoot)
    : path.join(
        /* turbopackIgnore: true */ process.cwd(),
        ".local",
        "app-data",
        "v1",
      );
}

export function getConfiguredAppDataRoot() {
  return getAppDataRoot();
}

function getRelativeDisplayPath(targetPath: string) {
  return path.relative(getAppDataRoot(), targetPath).split(path.sep).join("/");
}

function resolveAppPath(relativePath: string) {
  const trimmedPath = relativePath.trim();

  if (!trimmedPath) {
    throw new AppDataContractError({
      code: "invalid_reference",
      title: "Invalid app-ready reference",
      message: "A required app-ready file path is empty.",
      details: ["The runtime received an empty relative path from the cache contract."],
    });
  }

  if (path.isAbsolute(trimmedPath)) {
    throw new AppDataContractError({
      code: "invalid_reference",
      title: "Invalid app-ready reference",
      message: "App-ready references must stay relative to the cache root.",
      relativePath: trimmedPath,
      details: ["Absolute paths are not allowed inside the app-ready contract."],
    });
  }

  const root = getAppDataRoot();
  const resolvedPath = path.resolve(root, trimmedPath);
  const rootPrefix = `${root}${path.sep}`;

  if (resolvedPath !== root && !resolvedPath.startsWith(rootPrefix)) {
    throw new AppDataContractError({
      code: "invalid_reference",
      title: "Invalid app-ready reference",
      message: "The app-ready contract points outside the configured cache root.",
      relativePath: trimmedPath,
      details: ["Relative paths must stay under the configured app-ready cache root."],
    });
  }

  return {
    absolutePath: resolvedPath,
    relativePath: getRelativeDisplayPath(resolvedPath),
  };
}

export function resolveAppFile(relativePath: string) {
  return resolveAppPath(relativePath).absolutePath;
}

function wrapReadError(
  error: unknown,
  label: string,
  relativePath: string,
  invalidCode: "invalid_json" | "invalid_arrow",
) {
  const message = getErrorMessage(error);

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  ) {
    return new AppDataContractError({
      code: "missing_file",
      title: "App-ready file missing",
      message: `${label} could not be found in the configured app-ready cache.`,
      status: 404,
      relativePath,
      details: ["The file is required by the current cache contract."],
      cause: error,
    });
  }

  return new AppDataContractError({
    code: invalidCode,
    title:
      invalidCode === "invalid_json"
        ? "Invalid app-ready JSON"
        : "Invalid app-ready Arrow file",
    message:
      invalidCode === "invalid_json"
        ? `${label} could not be parsed as JSON.`
        : `${label} could not be parsed as Arrow IPC data.`,
    relativePath,
    details: [message],
    cause: error,
  });
}

function parseWithSchema<T>(
  raw: unknown,
  schema: ZodType<T>,
  label: string,
  relativePath: string,
) {
  try {
    return schema.parse(raw);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues
        .slice(0, 4)
        .map((issue) => {
          const issuePath = issue.path.length > 0 ? issue.path.join(".") : "<root>";
          return `${issuePath}: ${issue.message}`;
        });

      throw new AppDataContractError({
        code: "invalid_schema",
        title: "Invalid app-ready schema",
        message: `${label} does not match the documented app-ready contract.`,
        relativePath,
        details,
        cause: error,
      });
    }

    throw error;
  }
}

async function readJsonFile<T>(relativePath: string, label: string): Promise<T> {
  const resolved = resolveAppPath(relativePath);
  let content = "";

  try {
    content = await readFile(resolved.absolutePath, "utf8");
  } catch (error) {
    throw wrapReadError(error, label, resolved.relativePath, "invalid_json");
  }

  try {
    return JSON.parse(content) as T;
  } catch (error) {
    throw wrapReadError(error, label, resolved.relativePath, "invalid_json");
  }
}

async function readArrowFile(relativePath: string, label: string) {
  const resolved = resolveAppPath(relativePath);

  try {
    return await readArrowRows(resolved.absolutePath);
  } catch (error) {
    throw wrapReadError(error, label, resolved.relativePath, "invalid_arrow");
  }
}

async function readOptionalArrowFile(relativePath: string | undefined, label: string) {
  if (!relativePath) {
    return null;
  }

  try {
    return await readArrowFile(relativePath, label);
  } catch (error) {
    if (error instanceof AppDataContractError) {
      return null;
    }

    throw error;
  }
}

function mapQualityValues(
  row: Record<string, unknown>,
  qualityIds: string[],
): QualityValueMap {
  return Object.fromEntries(
    qualityIds.map((qualityId) => {
      return [qualityId, normalizeQualityValue(row[qualityId])];
    }),
  );
}

function mapPileCells(
  rows: Array<Record<string, unknown>>,
  qualityIds: string[],
): PileCellRecord[] {
  return rows.map((row) => ({
    ix: Number(row.ix ?? 0),
    iy: Number(row.iy ?? 0),
    iz: Number(row.iz ?? 0),
    massTon: Number(row.massTon ?? 0),
    timestampOldestMs: Number(row.timestampOldestMs ?? 0),
    timestampNewestMs: Number(row.timestampNewestMs ?? 0),
    qualityValues: mapQualityValues(row, qualityIds),
  }));
}

export async function appDataExists() {
  try {
    await access(resolveAppFile("manifest.json"));
    return true;
  } catch {
    return false;
  }
}

export function assertManifestCapability(
  manifest: AppManifest,
  capability: keyof AppManifest["capabilities"],
  routeLabel: string,
) {
  if (!manifest.capabilities[capability]) {
    throw new AppDataContractError({
      code: "capability_disabled",
      title: `${routeLabel} is not available in this cache`,
      message: `The manifest disables the ${capability} capability for this app-ready cache.`,
      details: [`Manifest capability \`${capability}\` is set to false.`],
    });
  }
}

export async function getAppManifest(): Promise<AppManifest> {
  const raw = await readJsonFile<unknown>("manifest.json", "App manifest");
  return parseWithSchema(raw, manifestSchema, "App manifest", "manifest.json");
}

export async function getQualityDefinitions(): Promise<QualityDefinition[]> {
  const manifest = await getAppManifest();
  const raw = await readJsonFile<unknown>(
    manifest.paths.qualities,
    "Quality definitions",
  );
  return parseWithSchema(
    raw,
    qualityDefinitionSchema.array(),
    "Quality definitions",
    manifest.paths.qualities,
  );
}

export async function getObjectRegistry(): Promise<ObjectRegistryEntry[]> {
  const manifest = await getAppManifest();
  const raw = await readJsonFile<unknown>(manifest.paths.registry, "Object registry");
  return parseWithSchema(
    raw,
    objectRegistryEntrySchema.array(),
    "Object registry",
    manifest.paths.registry,
  );
}

export async function getCircuitGraph(): Promise<CircuitGraph> {
  const manifest = await getAppManifest();
  const raw = await readJsonFile<unknown>(manifest.paths.circuit, "Circuit graph");
  return parseWithSchema(
    raw,
    circuitGraphSchema,
    "Circuit graph",
    manifest.paths.circuit,
  );
}

export async function getLiveObjectSummaries(): Promise<ObjectSummary[]> {
  const manifest = await getAppManifest();
  const raw = await readJsonFile<unknown>(
    manifest.paths.liveSummaries,
    "Live object summaries",
  );
  return parseWithSchema(
    raw,
    objectSummarySchema.array(),
    "Live object summaries",
    manifest.paths.liveSummaries,
  );
}

export async function getLiveBeltSnapshot(beltId: string): Promise<BeltSnapshot> {
  const [registry, qualities] = await Promise.all([
    getObjectRegistry(),
    getQualityDefinitions(),
  ]);
  const beltEntry = registry.find((entry) => entry.objectId === beltId && entry.liveRef);

  if (!beltEntry?.liveRef) {
    throw new AppDataContractError({
      code: "missing_object",
      title: "Belt snapshot not registered",
      message: `No live belt snapshot is registered for '${beltId}'.`,
      status: 404,
      details: ["The selected belt is missing a liveRef entry in the object registry."],
    });
  }

  const rows = await readArrowFile(
    beltEntry.liveRef,
    `Live belt snapshot for ${beltEntry.displayName}`,
  );
  const qualityIds = qualities.map((quality) => quality.id);
  const blocks: BeltBlockRecord[] = rows.map((row) => ({
    position: Number(row.position ?? 0),
    massTon: Number(row.massTon ?? 0),
    timestampOldestMs: Number(row.timestampOldestMs ?? 0),
    timestampNewestMs: Number(row.timestampNewestMs ?? 0),
    qualityValues: mapQualityValues(row, qualityIds),
  }));

  const totalMassTon = blocks.reduce((sum, block) => sum + block.massTon, 0);
  const qualityAverages = buildMassWeightedQualitySummary(blocks, qualities);

  return {
    objectId: beltEntry.objectId,
    displayName: beltEntry.displayName,
    timestamp:
      blocks.length > 0
        ? new Date(blocks[blocks.length - 1]!.timestampNewestMs).toISOString()
        : new Date(0).toISOString(),
    totalMassTon,
    blockCount: blocks.length,
    qualityAverages,
    blocks,
  };
}

export async function getLivePileDataset(pileId: string): Promise<PileDataset> {
  const [registry, qualities] = await Promise.all([
    getObjectRegistry(),
    getQualityDefinitions(),
  ]);
  const pileEntry = registry.find((entry) => entry.objectId === pileId);
  const pileRef = pileEntry ? getDensePileRef(pileEntry) : null;

  if (!pileEntry || !pileRef) {
    throw new AppDataContractError({
      code: "missing_object",
      title: "Current pile dataset not registered",
      message: `No dense current pile dataset is registered for '${pileId}'.`,
      status: 404,
      details: [
        "The selected pile is missing a livePileRef entry in the object registry.",
      ],
    });
  }

  const rawMeta = await readJsonFile<unknown>(
    pileRef,
    `Current pile metadata for ${pileEntry.displayName}`,
  );
  const meta = parseWithSchema(
    rawMeta,
    pileDatasetMetaSchema,
    `Current pile metadata for ${pileEntry.displayName}`,
    pileRef,
  ) as PileDatasetMeta;
  const qualityIds = qualities.map((quality) => quality.id);
  const [cellRows, surfaceRows, shellRows] = await Promise.all([
    readArrowFile(meta.files.cells, `Current pile cells for ${pileEntry.displayName}`),
    readOptionalArrowFile(
      meta.files.surface,
      `Current pile surface cells for ${pileEntry.displayName}`,
    ),
    readOptionalArrowFile(
      meta.files.shell,
      `Current pile shell cells for ${pileEntry.displayName}`,
    ),
  ]);
  const cells = mapPileCells(cellRows, qualityIds);
  const surfaceCells = surfaceRows
    ? mapPileCells(surfaceRows, qualityIds)
    : meta.dimension === 3
      ? deriveSurfaceCells(cells)
      : cells;
  const shellCells = shellRows
    ? mapPileCells(shellRows, qualityIds)
    : meta.dimension === 3
      ? deriveShellCells(cells)
      : cells;

  return {
    ...meta,
    suggestedFullStride: meta.suggestedFullStride || DEFAULT_FULL_RENDER_STRIDE,
    fullModeThreshold: meta.fullModeThreshold || DEFAULT_FULL_RENDER_THRESHOLD,
    cells,
    surfaceCells,
    shellCells,
  };
}

export async function getStockpileDataset(pileId: string): Promise<PileDataset> {
  return getLivePileDataset(pileId);
}

export async function getProfilerIndex(): Promise<ProfilerIndex> {
  const manifest = await getAppManifest();
  const raw = await readJsonFile<unknown>(manifest.paths.profilerIndex, "Profiler index");
  return parseWithSchema(
    raw,
    profilerIndexSchema,
    "Profiler index",
    manifest.paths.profilerIndex,
  );
}

export async function getProfilerSummary(): Promise<ProfilerSummaryRow[]> {
  const [manifest, qualities] = await Promise.all([
    getAppManifest(),
    getQualityDefinitions(),
  ]);
  const qualityIds = qualities.map((quality) => quality.id);
  const rows = await readArrowFile(
    manifest.paths.profilerSummary,
    "Profiler summary",
  );

  return rows.map((row) => ({
    snapshotId: String(row.snapshotId ?? ""),
    timestamp: String(row.timestamp ?? ""),
    objectId: String(row.objectId ?? ""),
    objectType: row.objectType === "pile" ? "pile" : "belt",
    displayName: String(row.displayName ?? ""),
    dimension: Number(row.dimension ?? 1) as 1 | 2 | 3,
    massTon: Number(row.massTon ?? 0),
    qualityValues: mapQualityValues(row, qualityIds),
  }));
}

export async function getProfilerObjectManifest(
  objectId: string,
): Promise<ProfilerObjectManifest> {
  const index = await getProfilerIndex();
  const entry = index.objects.find((candidate) => candidate.objectId === objectId);

  if (!entry) {
    throw new AppDataContractError({
      code: "missing_object",
      title: "Profiler object not registered",
      message: `No profiler manifest is registered for '${objectId}'.`,
      status: 404,
      details: ["The selected object is not present in profiler/index.json."],
    });
  }

  const raw = await readJsonFile<unknown>(
    entry.manifestRef,
    `Profiler manifest for ${entry.displayName}`,
  );
  return parseWithSchema(
    raw,
    profilerObjectManifestSchema,
    `Profiler manifest for ${entry.displayName}`,
    entry.manifestRef,
  );
}

export async function getProfilerSnapshot(
  objectId: string,
  snapshotId: string,
): Promise<ProfilerSnapshot> {
  const [manifest, qualities] = await Promise.all([
    getProfilerObjectManifest(objectId),
    getQualityDefinitions(),
  ]);

  if (!manifest.snapshotIds.includes(snapshotId)) {
    throw new AppDataContractError({
      code: "missing_object",
      title: "Profiler snapshot not registered",
      message: `Snapshot '${snapshotId}' is not registered for '${objectId}'.`,
      status: 404,
      details: ["The requested snapshot id is missing from the profiler object manifest."],
    });
  }

  const relativePath = manifest.snapshotPathTemplate.replace("[snapshotId]", snapshotId);
  const qualityIds = qualities.map((quality) => quality.id);
  const rows = await readArrowFile(
    relativePath,
    `Profiler snapshot '${snapshotId}' for ${manifest.displayName}`,
  );

  return {
    objectId: manifest.objectId,
    displayName: manifest.displayName,
    objectType: manifest.objectType,
    snapshotId,
    timestamp: String(rows[0]?.timestamp ?? new Date(0).toISOString()),
    dimension: manifest.dimension,
    rows: mapPileCells(rows, qualityIds),
  };
}
