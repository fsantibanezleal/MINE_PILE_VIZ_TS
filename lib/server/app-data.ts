import path from "node:path";
import { access, readFile } from "node:fs/promises";
import {
  DEFAULT_FULL_RENDER_STRIDE,
  DEFAULT_FULL_RENDER_THRESHOLD,
} from "@/lib/app-config";
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
} from "@/types/app-data";
import { readArrowRows } from "@/lib/server/arrow";
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

function getAppDataRoot() {
  return process.env.APP_DATA_ROOT
    ? path.resolve(process.env.APP_DATA_ROOT)
    : path.join(
        /* turbopackIgnore: true */ process.cwd(),
        ".local",
        "app-data",
        "v1",
      );
}

export function resolveAppFile(relativePath: string) {
  return path.join(getAppDataRoot(), /* turbopackIgnore: true */ relativePath);
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const content = await readFile(resolveAppFile(relativePath), "utf8");
  return JSON.parse(content) as T;
}

function mapQualityValues(
  row: Record<string, unknown>,
  qualityIds: string[],
): Record<string, number | null> {
  return Object.fromEntries(
    qualityIds.map((qualityId) => {
      const rawValue = row[qualityId];
      return [
        qualityId,
        typeof rawValue === "number" && Number.isFinite(rawValue) ? rawValue : null,
      ];
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

export async function getAppManifest(): Promise<AppManifest> {
  const raw = await readJsonFile<unknown>("manifest.json");
  return manifestSchema.parse(raw);
}

export async function getQualityDefinitions(): Promise<QualityDefinition[]> {
  const manifest = await getAppManifest();
  const raw = await readJsonFile<unknown>(manifest.paths.qualities);
  return qualityDefinitionSchema.array().parse(raw);
}

export async function getObjectRegistry(): Promise<ObjectRegistryEntry[]> {
  const manifest = await getAppManifest();
  const raw = await readJsonFile<unknown>(manifest.paths.registry);
  return objectRegistryEntrySchema.array().parse(raw);
}

export async function getCircuitGraph(): Promise<CircuitGraph> {
  const manifest = await getAppManifest();
  const raw = await readJsonFile<unknown>(manifest.paths.circuit);
  return circuitGraphSchema.parse(raw);
}

export async function getLiveObjectSummaries(): Promise<ObjectSummary[]> {
  const manifest = await getAppManifest();
  const raw = await readJsonFile<unknown>(manifest.paths.liveSummaries);
  return objectSummarySchema.array().parse(raw);
}

export async function getLiveBeltSnapshot(beltId: string): Promise<BeltSnapshot> {
  const [registry, qualities] = await Promise.all([
    getObjectRegistry(),
    getQualityDefinitions(),
  ]);
  const beltEntry = registry.find((entry) => entry.objectId === beltId && entry.liveRef);

  if (!beltEntry?.liveRef) {
    throw new Error(`No live belt snapshot registered for ${beltId}.`);
  }

  const rows = await readArrowRows(resolveAppFile(beltEntry.liveRef));
  const qualityIds = qualities.map((quality) => quality.id);
  const blocks: BeltBlockRecord[] = rows.map((row) => ({
    position: Number(row.position ?? 0),
    massTon: Number(row.massTon ?? 0),
    timestampOldestMs: Number(row.timestampOldestMs ?? 0),
    timestampNewestMs: Number(row.timestampNewestMs ?? 0),
    qualityValues: mapQualityValues(row, qualityIds),
  }));

  const totals = blocks.reduce(
    (accumulator, block) => {
      accumulator.massTon += block.massTon;

      qualityIds.forEach((qualityId) => {
        const value = block.qualityValues[qualityId];
        if (value !== null) {
          accumulator.qualitySums[qualityId] =
            (accumulator.qualitySums[qualityId] ?? 0) + value * block.massTon;
        }
      });

      return accumulator;
    },
    {
      massTon: 0,
      qualitySums: {} as Record<string, number>,
    },
  );

  const qualityAverages = Object.fromEntries(
    qualityIds.map((qualityId) => [
      qualityId,
      totals.massTon > 0 && totals.qualitySums[qualityId] !== undefined
        ? totals.qualitySums[qualityId]! / totals.massTon
        : null,
    ]),
  );

  return {
    objectId: beltEntry.objectId,
    displayName: beltEntry.displayName,
    timestamp:
      blocks.length > 0
        ? new Date(blocks[blocks.length - 1]!.timestampNewestMs).toISOString()
        : new Date(0).toISOString(),
    totalMassTon: totals.massTon,
    blockCount: blocks.length,
    qualityAverages,
    blocks,
  };
}

export async function getStockpileDataset(pileId: string): Promise<PileDataset> {
  const [registry, qualities] = await Promise.all([
    getObjectRegistry(),
    getQualityDefinitions(),
  ]);
  const pileEntry = registry.find(
    (entry) => entry.objectId === pileId && entry.stockpileRef,
  );

  if (!pileEntry?.stockpileRef) {
    throw new Error(`No stockpile dataset registered for ${pileId}.`);
  }

  const rawMeta = await readJsonFile<unknown>(pileEntry.stockpileRef);
  const meta = pileDatasetMetaSchema.parse(rawMeta) as PileDatasetMeta;
  const qualityIds = qualities.map((quality) => quality.id);
  const [cells, surfaceCells, shellCells] = await Promise.all([
    readArrowRows(resolveAppFile(meta.files.cells)).then((rows) =>
      mapPileCells(rows, qualityIds),
    ),
    meta.files.surface
      ? readArrowRows(resolveAppFile(meta.files.surface)).then((rows) =>
          mapPileCells(rows, qualityIds),
        )
      : Promise.resolve([]),
    meta.files.shell
      ? readArrowRows(resolveAppFile(meta.files.shell)).then((rows) =>
          mapPileCells(rows, qualityIds),
        )
      : Promise.resolve([]),
  ]);

  return {
    ...meta,
    suggestedFullStride: meta.suggestedFullStride || DEFAULT_FULL_RENDER_STRIDE,
    fullModeThreshold: meta.fullModeThreshold || DEFAULT_FULL_RENDER_THRESHOLD,
    cells,
    surfaceCells,
    shellCells,
  };
}

export async function getProfilerIndex(): Promise<ProfilerIndex> {
  const manifest = await getAppManifest();
  const raw = await readJsonFile<unknown>(manifest.paths.profilerIndex);
  return profilerIndexSchema.parse(raw);
}

export async function getProfilerSummary(): Promise<ProfilerSummaryRow[]> {
  const [manifest, qualities] = await Promise.all([
    getAppManifest(),
    getQualityDefinitions(),
  ]);
  const qualityIds = qualities.map((quality) => quality.id);
  const rows = await readArrowRows(resolveAppFile(manifest.paths.profilerSummary));

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
    throw new Error(`No profiler manifest registered for ${objectId}.`);
  }

  const raw = await readJsonFile<unknown>(entry.manifestRef);
  return profilerObjectManifestSchema.parse(raw);
}

export async function getProfilerSnapshot(
  objectId: string,
  snapshotId: string,
): Promise<ProfilerSnapshot> {
  const [manifest, qualities] = await Promise.all([
    getProfilerObjectManifest(objectId),
    getQualityDefinitions(),
  ]);
  const relativePath = manifest.snapshotPathTemplate.replace("[snapshotId]", snapshotId);
  const qualityIds = qualities.map((quality) => quality.id);
  const rows = await readArrowRows(resolveAppFile(relativePath));

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
