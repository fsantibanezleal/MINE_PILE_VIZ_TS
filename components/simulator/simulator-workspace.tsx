"use client";

import {
  startTransition,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BeltBlockStrip } from "@/components/live/belt-block-strip";
import { BeltMassHistogram } from "@/components/live/belt-mass-histogram";
import { PileAnchorFrame } from "@/components/stockpiles/pile-anchor-frame";
import { Pile3DCanvas } from "@/components/stockpiles/pile-3d-canvas";
import {
  PileColumnView,
  PileHeatmapView,
} from "@/components/stockpiles/pile-views";
import { InlineNotice } from "@/components/ui/inline-notice";
import { MassDistributionChart } from "@/components/ui/mass-distribution-chart";
import { MetricGrid } from "@/components/ui/metric-grid";
import { ProfiledPropertiesPanel } from "@/components/ui/profiled-properties-panel";
import { QualityLegend } from "@/components/ui/quality-legend";
import { QualitySelector } from "@/components/ui/quality-selector";
import { RouteBasisPanel } from "@/components/ui/route-basis-panel";
import { WorkspaceJumpLinks } from "@/components/ui/workspace-jump-links";
import { CellFocusPanel } from "@/components/ui/cell-focus-panel";
import { deriveNumericColorDomain } from "@/lib/color";
import { deriveCellExtents } from "@/lib/data-stats";
import { buildMassDistribution } from "@/lib/mass-distribution";
import { formatMassTon, formatTimestamp } from "@/lib/format";
import { getQualityValueKey } from "@/lib/quality-values";
import {
  buildAdaptiveFullRenderPlan,
  deriveShellCells,
  deriveSurfaceCells,
} from "@/lib/stockpile-rendering";
import { buildSimulatorLaneSnapshot } from "@/lib/simulator-lane";
import {
  buildSimulatorDischargeLanes,
  getSimulatorLaneBelts,
  getSimulatorPileNodes,
  type SimulatorDischargeBelt,
  type SimulatorDischargeMergeNode,
} from "@/lib/simulator-topology";
import {
  buildHrefWithQuery,
  resolveQuerySelection,
} from "@/lib/workspace-route-state";
import type {
  BeltSnapshot,
  CircuitGraph,
  PileCellRecord,
  PileDataset,
  ProfilerIndex,
  ProfilerSnapshot,
  ProfilerSummaryRow,
  QualityDefinition,
  QualityValueMap,
  StockpileViewMode,
} from "@/types/app-data";

interface SimulatorWorkspaceProps {
  graph: CircuitGraph;
  index: ProfilerIndex;
  qualities: QualityDefinition[];
}

type SliceAxis = "x" | "y" | "z";
type SimulatorSource = "current-stockpile" | "profiler-snapshot";

interface SimulatorCentralObjectData {
  objectId: string;
  displayName: string;
  objectRole: "physical" | "virtual";
  timestamp: string;
  dimension: 1 | 2 | 3;
  extents: {
    x: number;
    y: number;
    z: number;
  };
  occupiedCellCount: number;
  surfaceCellCount: number;
  defaultQualityId: string;
  availableQualityIds: string[];
  viewModes: StockpileViewMode[];
  suggestedFullStride: number;
  fullModeThreshold: number;
  qualityAverages: QualityValueMap;
  inputs: PileDataset["inputs"];
  outputs: PileDataset["outputs"];
  cells: PileCellRecord[];
  surfaceCells: PileCellRecord[];
  shellCells: PileCellRecord[];
  source: SimulatorSource;
  snapshotId?: string;
}

interface DischargeLaneCardProps {
  belt: SimulatorDischargeBelt;
  snapshot?: BeltSnapshot;
  quality: QualityDefinition | undefined;
  loading: boolean;
  error?: string;
}

interface MergeNodeCardProps {
  mergeNode: SimulatorDischargeMergeNode;
}

function isSameCell(left: PileCellRecord, right: PileCellRecord) {
  return left.ix === right.ix && left.iy === right.iy && left.iz === right.iz;
}

function getRowsExtents(rows: PileCellRecord[]) {
  return deriveCellExtents(rows);
}

function buildSummaryValuesFromCells(
  cells: PileCellRecord[],
  qualities: QualityDefinition[],
) {
  const qualityValues: QualityValueMap = {};

  qualities.forEach((quality) => {
    if (quality.kind === "numerical") {
      const numericCells = cells.filter((cell) => {
        const value = cell.qualityValues[quality.id];
        return typeof value === "number" && Number.isFinite(value) && cell.massTon > 0;
      });

      if (numericCells.length === 0) {
        qualityValues[quality.id] = null;
        return;
      }

      const representedMass = numericCells.reduce((sum, cell) => sum + cell.massTon, 0);
      qualityValues[quality.id] =
        numericCells.reduce((sum, cell) => {
          const value = cell.qualityValues[quality.id];
          return sum + (typeof value === "number" ? value : 0) * cell.massTon;
        }, 0) / Math.max(representedMass, 1);
      return;
    }

    const groupedMass = new Map<string, { value: QualityValueMap[string]; massTon: number }>();

    cells.forEach((cell) => {
      const value = cell.qualityValues[quality.id];

      if ((value === null || value === undefined) || cell.massTon <= 0) {
        return;
      }

      const key = getQualityValueKey(value);

      if (!key) {
        return;
      }

      const current = groupedMass.get(key);

      if (current) {
        current.massTon += cell.massTon;
        return;
      }

      groupedMass.set(key, {
        value,
        massTon: cell.massTon,
      });
    });

    const dominant = [...groupedMass.values()].sort((left, right) => right.massTon - left.massTon)[0];
    qualityValues[quality.id] = dominant?.value ?? null;
  });

  return qualityValues;
}

function normalizeDatasetData(dataset: PileDataset): SimulatorCentralObjectData {
  return {
    objectId: dataset.objectId,
    displayName: dataset.displayName,
    objectRole: dataset.objectRole,
    timestamp: dataset.timestamp,
    dimension: dataset.dimension,
    extents: dataset.extents,
    occupiedCellCount: dataset.occupiedCellCount,
    surfaceCellCount: dataset.surfaceCellCount,
    defaultQualityId: dataset.defaultQualityId,
    availableQualityIds: dataset.availableQualityIds,
    viewModes: dataset.viewModes,
    suggestedFullStride: dataset.suggestedFullStride,
    fullModeThreshold: dataset.fullModeThreshold,
    qualityAverages: dataset.qualityAverages,
    inputs: dataset.inputs,
    outputs: dataset.outputs,
    cells: dataset.cells,
    surfaceCells: dataset.surfaceCells,
    shellCells: dataset.shellCells,
    source: "current-stockpile",
  };
}

function normalizeSnapshotData(
  snapshot: ProfilerSnapshot,
  graph: CircuitGraph,
  summaryRow: ProfilerSummaryRow | undefined,
  qualities: QualityDefinition[],
): SimulatorCentralObjectData {
  const selectedNode = graph.nodes.find((node) => node.objectId === snapshot.objectId);
  const extents = getRowsExtents(snapshot.rows);
  const surfaceCells =
    snapshot.dimension === 3 ? deriveSurfaceCells(snapshot.rows) : snapshot.rows;
  const shellCells =
    snapshot.dimension === 3 ? deriveShellCells(snapshot.rows) : [];
  const qualityAverages = summaryRow?.qualityValues ?? buildSummaryValuesFromCells(snapshot.rows, qualities);
  const defaultQualityId =
    qualities.find((quality) => quality.id in qualityAverages)?.id ?? qualities[0]?.id ?? "";
  const availableQualityIds = qualities
    .filter(
      (quality) =>
        quality.id in qualityAverages ||
        snapshot.rows.some((row) => quality.id in row.qualityValues),
    )
    .map((quality) => quality.id);

  return {
    objectId: snapshot.objectId,
    displayName: snapshot.displayName,
    objectRole: "physical",
    timestamp: snapshot.timestamp,
    dimension: snapshot.dimension,
    extents,
    occupiedCellCount: snapshot.rows.length,
    surfaceCellCount: surfaceCells.length,
    defaultQualityId,
    availableQualityIds,
    viewModes:
      snapshot.dimension === 3 ? ["surface", "shell", "full", "slice"] : ["full"],
    suggestedFullStride: 1,
    fullModeThreshold: Math.max(snapshot.rows.length, 1),
    qualityAverages,
    inputs: selectedNode?.inputs ?? [],
    outputs: selectedNode?.outputs ?? [],
    cells: snapshot.rows,
    surfaceCells,
    shellCells,
    source: "profiler-snapshot",
    snapshotId: snapshot.snapshotId,
  };
}

async function fetchJson<T>(url: string, fallbackMessage: string) {
  const response = await fetch(url);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | {
          error?: {
            message?: string;
          };
        }
      | null;

    throw new Error(payload?.error?.message ?? fallbackMessage);
  }

  return (await response.json()) as T;
}

function getDefaultViewMode(dataset: SimulatorCentralObjectData): StockpileViewMode {
  if (dataset.dimension !== 3) {
    return dataset.viewModes[0] ?? "full";
  }

  const canSafelyRenderFull =
    dataset.viewModes.includes("full") &&
    dataset.occupiedCellCount <= dataset.fullModeThreshold;

  if (canSafelyRenderFull) {
    return "full";
  }

  return dataset.viewModes.includes("surface")
    ? "surface"
    : (dataset.viewModes[0] ?? "full");
}

function SimulatorDischargeLaneCard({
  belt,
  snapshot,
  quality,
  loading,
  error,
}: DischargeLaneCardProps) {
  return (
    <article className="simulator-belt-card">
      <div className="simulator-belt-card__header">
        <div>
          <div className="section-label">{belt.objectRole === "virtual" ? "Virtual belt" : "Belt"}</div>
          <h3>{belt.label}</h3>
        </div>
        <div className="simulator-belt-card__meta">
          <span>Stage {belt.stageIndex + 1}</span>
          <strong>Depth {belt.depth}</strong>
        </div>
      </div>
      {loading ? <div className="loading-banner">Loading belt content...</div> : null}
      {error ? (
        <InlineNotice tone="error" title="Belt snapshot unavailable">
          {error}
        </InlineNotice>
      ) : null}
      {snapshot ? (
        <div className="belt-strip-panel">
          <MetricGrid
            metrics={[
              { label: "Blocks", value: String(snapshot.blockCount) },
              { label: "Mass", value: formatMassTon(snapshot.totalMassTon) },
              { label: "Current UTC", value: formatTimestamp(snapshot.timestamp) },
            ]}
          />
          <BeltBlockStrip snapshot={snapshot} quality={quality} />
          <BeltMassHistogram snapshot={snapshot} quality={quality} />
        </div>
      ) : null}
    </article>
  );
}

function SimulatorMergeNodeCard({ mergeNode }: MergeNodeCardProps) {
  return (
    <article className="simulator-merge-card">
      <div className="simulator-merge-card__header">
        <div>
          <div className="section-label">Virtual merge</div>
          <h3>{mergeNode.label}</h3>
        </div>
        <div className="simulator-belt-card__meta">
          <span>Stage {mergeNode.stageIndex + 1}</span>
          <strong>{mergeNode.downstreamBelts.length} downstream</strong>
        </div>
      </div>
      <p className="muted-text">
        This virtual stockpile groups the selected direct reclaim stream before material
        reaches the downstream conveyor context.
      </p>
      <MetricGrid
        metrics={[
          {
            label: "Downstream belts",
            value: String(mergeNode.downstreamBelts.length),
          },
          {
            label: "Role",
            value: mergeNode.objectRole === "virtual" ? "Virtual pile" : "Physical pile",
          },
        ]}
      />
      {mergeNode.downstreamBelts.length > 0 ? (
        <div className="anchor-list">
          {mergeNode.downstreamBelts.map((belt) => (
            <div key={belt.objectId} className="anchor-list__item">
              <div className="anchor-list__meta">
                <strong>{belt.label}</strong>
                <span>
                  {belt.objectRole === "virtual" ? "Virtual belt" : "Physical belt"}
                </span>
              </div>
              <span>Stage {belt.stageIndex + 1}</span>
            </div>
          ))}
        </div>
      ) : (
        <InlineNotice tone="info" title="No downstream conveyors">
          No downstream belt objects are currently reachable from this merge node.
        </InlineNotice>
      )}
    </article>
  );
}

export function SimulatorWorkspace({
  graph,
  index,
  qualities,
}: SimulatorWorkspaceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pileNodes = useMemo(() => getSimulatorPileNodes(graph), [graph]);
  const pileIds = pileNodes.map((node) => node.objectId);
  const fallbackPileId =
    pileIds.includes(index.defaultObjectId) ? index.defaultObjectId : (pileIds[0] ?? "");
  const initialSelectedObjectId = resolveQuerySelection(
    searchParams.get("object"),
    pileIds,
    fallbackPileId,
  );
  const initialSelectedQualityId = resolveQuerySelection(
    searchParams.get("quality"),
    qualities.map((quality) => quality.id),
    qualities[0]?.id ?? "",
  );

  const [selectedObjectId, setSelectedObjectId] = useState(initialSelectedObjectId);
  const [selectedQualityId, setSelectedQualityId] = useState(initialSelectedQualityId);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState("");
  const [selectedOutputId, setSelectedOutputId] = useState("");
  const [summaryRows, setSummaryRows] = useState<ProfilerSummaryRow[]>([]);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [centralData, setCentralData] = useState<SimulatorCentralObjectData | null>(null);
  const [centralError, setCentralError] = useState<string | null>(null);
  const [loadingCentral, setLoadingCentral] = useState(true);
  const [beltSnapshots, setBeltSnapshots] = useState<Record<string, BeltSnapshot>>({});
  const [beltErrors, setBeltErrors] = useState<Record<string, string>>({});
  const [loadingBelts, setLoadingBelts] = useState(() =>
    buildSimulatorDischargeLanes(graph, initialSelectedObjectId).some((lane) =>
      getSimulatorLaneBelts(lane).length > 0,
    ),
  );
  const [playing, setPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<StockpileViewMode>("full");
  const [sliceAxis, setSliceAxis] = useState<SliceAxis>("z");
  const [sliceIndex, setSliceIndex] = useState(0);
  const [hoveredCell, setHoveredCell] = useState<PileCellRecord | null>(null);

  const selectedNode = pileNodes.find((node) => node.objectId === selectedObjectId) ?? pileNodes[0];
  const selectedObjectRows = useMemo(
    () =>
      summaryRows
        .filter((row) => row.objectId === selectedObjectId)
        .sort((left, right) => left.timestamp.localeCompare(right.timestamp)),
    [selectedObjectId, summaryRows],
  );
  const latestSnapshotId =
    selectedObjectRows[selectedObjectRows.length - 1]?.snapshotId ?? "";
  const hasProfilerHistory = selectedObjectRows.length > 0;
  const effectiveSnapshotId = hasProfilerHistory
    ? selectedObjectRows.some((row) => row.snapshotId === selectedSnapshotId)
      ? selectedSnapshotId
      : latestSnapshotId
    : "";
  const selectedSummaryRow = selectedObjectRows.find(
    (row) => row.snapshotId === effectiveSnapshotId,
  );
  const dischargeLanes = useMemo(
    () => (selectedNode ? buildSimulatorDischargeLanes(graph, selectedObjectId) : []),
    [graph, selectedNode, selectedObjectId],
  );
  const availableQualities = qualities.filter((quality) =>
    centralData ? centralData.availableQualityIds.includes(quality.id) : true,
  );
  const effectiveQualityId =
    availableQualities.find((quality) => quality.id === selectedQualityId)?.id ??
    availableQualities[0]?.id ??
    "";
  const selectedQuality = availableQualities.find(
    (quality) => quality.id === effectiveQualityId,
  );
  const effectiveSelectedOutputId =
    dischargeLanes.some((lane) => lane.output.id === selectedOutputId)
      ? selectedOutputId
      : (dischargeLanes[0]?.output.id ?? "");
  const activeLane =
    dischargeLanes.find((lane) => lane.output.id === effectiveSelectedOutputId) ??
    dischargeLanes[0];
  const activeLaneBelts = useMemo(
    () => (activeLane ? getSimulatorLaneBelts(activeLane) : []),
    [activeLane],
  );
  const totalRouteBelts = useMemo(
    () =>
      dischargeLanes.reduce(
        (sum, lane) => sum + getSimulatorLaneBelts(lane).length,
        0,
      ),
    [dischargeLanes],
  );

  useEffect(() => {
    let cancelled = false;

    fetchJson<ProfilerSummaryRow[]>(
      "/api/profiler/summary",
      "Failed to load simulator summary rows.",
    )
      .then((payload) => {
        if (cancelled) {
          return;
        }

        setSummaryRows(payload);
        setLoadingSummary(false);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSummaryError(
            error instanceof Error
              ? error.message
              : "Failed to load simulator summary rows.",
          );
          setLoadingSummary(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loadingSummary || !selectedObjectId) {
      return;
    }

    let cancelled = false;

    const request = hasProfilerHistory && effectiveSnapshotId
      ? fetchJson<ProfilerSnapshot>(
          `/api/profiler/objects/${selectedObjectId}/snapshots/${effectiveSnapshotId}`,
          "Failed to load simulator snapshot.",
        ).then((payload) =>
          normalizeSnapshotData(payload, graph, selectedSummaryRow, qualities),
        )
      : fetchJson<PileDataset>(
          `/api/stockpiles/${selectedObjectId}`,
          "Failed to load stockpile dataset.",
        ).then(normalizeDatasetData);

    request
      .then((payload) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setCentralData(payload);
          setSelectedQualityId((current) =>
            payload.availableQualityIds.includes(current)
              ? current
              : payload.defaultQualityId,
          );
          setViewMode(getDefaultViewMode(payload));
          setSliceAxis("z");
          setSliceIndex(0);
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCentralError(
            error instanceof Error ? error.message : "Failed to load simulator data.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCentral(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    effectiveSnapshotId,
    graph,
    hasProfilerHistory,
    loadingSummary,
    qualities,
    selectedObjectId,
    selectedSummaryRow,
  ]);

  useEffect(() => {
    if (!playing || selectedObjectRows.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setSelectedSnapshotId((current) => {
        const currentIndex = selectedObjectRows.findIndex(
          (row) => row.snapshotId === current,
        );
        const nextIndex =
          currentIndex >= selectedObjectRows.length - 1 ? 0 : currentIndex + 1;
        setLoadingCentral(true);
        setCentralError(null);
        setCentralData(null);
        setHoveredCell(null);
        return selectedObjectRows[nextIndex]?.snapshotId ?? current;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [playing, selectedObjectRows]);

  useEffect(() => {
    const uniqueBeltIds = [
      ...new Set(
        dischargeLanes.flatMap((lane) =>
          getSimulatorLaneBelts(lane).map((belt) => belt.objectId),
        ),
      ),
    ];

    if (uniqueBeltIds.length === 0) {
      return;
    }

    let cancelled = false;

    Promise.all(
      uniqueBeltIds.map(async (beltId) => {
        try {
          const snapshot = await fetchJson<BeltSnapshot>(
            `/api/live/belts/${beltId}`,
            "Failed to load downstream belt snapshot.",
          );

          return {
            beltId,
            snapshot,
            error: null,
          };
        } catch (error) {
          return {
            beltId,
            snapshot: null,
            error:
              error instanceof Error
                ? error.message
                : "Failed to load downstream belt snapshot.",
          };
        }
      }),
    )
      .then((results) => {
        if (cancelled) {
          return;
        }

        const nextSnapshots: Record<string, BeltSnapshot> = {};
        const nextErrors: Record<string, string> = {};

        results.forEach((result) => {
          if (result.snapshot) {
            nextSnapshots[result.beltId] = result.snapshot;
          }

          if (result.error) {
            nextErrors[result.beltId] = result.error;
          }
        });

        startTransition(() => {
          setBeltSnapshots(nextSnapshots);
          setBeltErrors(nextErrors);
        });
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingBelts(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dischargeLanes]);

  function handleSelectObject(nextObjectId: string) {
    if (nextObjectId === selectedObjectId || !pileIds.includes(nextObjectId)) {
      return;
    }

    setLoadingCentral(true);
    setCentralError(null);
    setCentralData(null);
    setHoveredCell(null);
    setSelectedOutputId("");
    setBeltSnapshots({});
    setBeltErrors({});
    setLoadingBelts(
      buildSimulatorDischargeLanes(graph, nextObjectId).some(
        (lane) => getSimulatorLaneBelts(lane).length > 0,
      ),
    );
    setSelectedObjectId(nextObjectId);
    setSelectedSnapshotId("");
    setPlaying(false);
    router.replace(
      buildHrefWithQuery(pathname, searchParams, {
        object: nextObjectId,
      }),
      { scroll: false },
    );
  }

  function handleSelectQuality(nextQualityId: string) {
    setSelectedQualityId(nextQualityId);
    router.replace(
      buildHrefWithQuery(pathname, searchParams, {
        quality: nextQualityId,
      }),
      { scroll: false },
    );
  }

  function handleSelectOutput(nextOutputId: string) {
    setSelectedOutputId(nextOutputId);
  }

  const totalMassTon =
    selectedSummaryRow?.massTon ??
    centralData?.cells.reduce((sum, cell) => sum + cell.massTon, 0) ??
    0;
  const snapshotIndex = selectedObjectRows.findIndex(
    (row) => row.snapshotId === effectiveSnapshotId,
  );

  const fullRenderPlan = useMemo(
    () =>
      buildAdaptiveFullRenderPlan({
        cells: centralData?.cells ?? [],
        surfaceCells: centralData?.surfaceCells ?? [],
        threshold: centralData?.fullModeThreshold ?? 1,
        suggestedStride: centralData?.suggestedFullStride ?? 1,
      }),
    [
      centralData?.cells,
      centralData?.fullModeThreshold,
      centralData?.suggestedFullStride,
      centralData?.surfaceCells,
    ],
  );
  const sliceMax = Math.max(
    0,
    sliceAxis === "x"
      ? (centralData?.extents.x ?? 1) - 1
      : sliceAxis === "y"
        ? (centralData?.extents.y ?? 1) - 1
        : (centralData?.extents.z ?? 1) - 1,
  );
  const effectiveSliceIndex = Math.min(sliceIndex, sliceMax);
  const sliceCells = useMemo(() => {
    return (centralData?.cells ?? []).filter((cell) => {
      if (sliceAxis === "x") {
        return cell.ix === effectiveSliceIndex;
      }

      if (sliceAxis === "y") {
        return cell.iy === effectiveSliceIndex;
      }

      return cell.iz === effectiveSliceIndex;
    });
  }, [centralData?.cells, effectiveSliceIndex, sliceAxis]);

  const visibleCellsForHover =
    !centralData
      ? []
      : centralData.dimension === 3
        ? viewMode === "surface"
          ? centralData.surfaceCells
          : viewMode === "shell"
            ? (centralData.shellCells.length > 0
                ? centralData.shellCells
                : centralData.surfaceCells)
            : viewMode === "slice"
              ? sliceCells
              : fullRenderPlan.cells
        : centralData.cells;
  const activeHoveredCell =
    hoveredCell && visibleCellsForHover.some((cell) => isSameCell(cell, hoveredCell))
      ? hoveredCell
      : null;
  const centralDistribution = useMemo(
    () =>
      centralData && selectedQuality
        ? buildMassDistribution(centralData.cells, selectedQuality)
        : null,
    [centralData, selectedQuality],
  );
  const visibleCellCount =
    centralData?.dimension === 3
      ? viewMode === "surface"
        ? centralData.surfaceCells.length
        : viewMode === "shell"
          ? (centralData.shellCells.length > 0
              ? centralData.shellCells
              : centralData.surfaceCells).length
          : viewMode === "slice"
            ? sliceCells.length
            : fullRenderPlan.renderedCellCount
      : centralData?.cells.length ?? 0;

  const colorDomain = useMemo(() => {
    if (!centralData || !selectedQuality || selectedQuality.kind !== "numerical") {
      return undefined;
    }

    const cellsForDomain =
      centralData.dimension === 3
        ? viewMode === "surface"
          ? centralData.surfaceCells
          : viewMode === "shell"
            ? centralData.shellCells.length > 0
              ? centralData.shellCells
              : centralData.surfaceCells
            : viewMode === "slice"
              ? sliceCells
              : fullRenderPlan.cells
        : centralData.cells;

    return deriveNumericColorDomain(
      cellsForDomain.map((cell) => {
        const value = cell.qualityValues[selectedQuality.id];
        return typeof value === "number" ? value : null;
      }),
      selectedQuality,
    );
  }, [centralData, fullRenderPlan.cells, selectedQuality, sliceCells, viewMode]);

  const activeLaneMassTon =
    activeLaneBelts.reduce(
      (sum, belt) => sum + (beltSnapshots[belt.objectId]?.totalMassTon ?? 0),
      0,
    );
  const activeLaneLoadedCount = activeLaneBelts.filter(
    (belt) => beltSnapshots[belt.objectId],
  ).length;
  const activeLaneSnapshot = activeLane
    ? buildSimulatorLaneSnapshot({
        laneId: activeLane.output.id,
        displayName: activeLane.output.label,
        snapshots: activeLaneBelts
          .map((belt) => beltSnapshots[belt.objectId])
          .filter((snapshot): snapshot is BeltSnapshot => Boolean(snapshot)),
        qualities,
      })
    : null;

  let centralContent: ReactNode = (
    <InlineNotice tone={centralError ? "error" : "info"} title="Pile content loads on demand">
      {centralError
        ? centralError
        : "Select a pile or virtual pile to inspect its current or profiled content."}
    </InlineNotice>
  );

  if (centralData) {
    if (centralData.dimension === 1) {
      centralContent = (
        <PileColumnView
          cells={centralData.cells}
          quality={selectedQuality}
          numericDomain={colorDomain}
          onHoverCellChange={setHoveredCell}
        />
      );
    } else if (centralData.dimension === 2) {
      centralContent = (
        <PileHeatmapView
          cells={centralData.cells}
          quality={selectedQuality}
          numericDomain={colorDomain}
          columns={centralData.extents.x}
          rows={centralData.extents.y}
          xAccessor={(cell) => cell.ix}
          yAccessor={(cell) => cell.iy}
          onHoverCellChange={setHoveredCell}
        />
      );
    } else if (viewMode === "slice") {
      centralContent = (
        <PileHeatmapView
          cells={sliceCells}
          quality={selectedQuality}
          numericDomain={colorDomain}
          columns={
            sliceAxis === "y" ? centralData.extents.x : centralData.extents.y
          }
          rows={sliceAxis === "z" ? centralData.extents.y : centralData.extents.z}
          xAccessor={(cell) => (sliceAxis === "y" ? cell.ix : cell.iy)}
          yAccessor={(cell) => (sliceAxis === "z" ? cell.iy : cell.iz)}
          onHoverCellChange={setHoveredCell}
        />
      );
    } else {
      const cells =
        viewMode === "surface"
          ? centralData.surfaceCells
          : viewMode === "shell"
            ? centralData.shellCells.length > 0
              ? centralData.shellCells
              : centralData.surfaceCells
            : fullRenderPlan.cells;

      centralContent = (
        <Pile3DCanvas
          key={`${centralData.objectId}:${centralData.source}:${viewMode}:${effectiveQualityId}`}
          cells={cells}
          extents={centralData.extents}
          quality={selectedQuality}
          numericDomain={colorDomain}
          onHoverCellChange={setHoveredCell}
        />
      );
    }
  }

  return (
    <div className="workspace-grid workspace-grid--triple">
      <aside className="panel">
        <div className="section-label">Scenario</div>
        <label className="field">
          <span>Central pile</span>
          <select
            value={selectedObjectId}
            onChange={(event) => handleSelectObject(event.target.value)}
          >
            {pileNodes.map((node) => (
              <option key={node.objectId} value={node.objectId}>
                {node.label}
              </option>
            ))}
          </select>
        </label>
        <QualitySelector
          label="Color by"
          qualities={availableQualities}
          value={effectiveQualityId}
          onChange={handleSelectQuality}
        />
        {hasProfilerHistory ? (
          <>
            <label className="field">
              <span>Time step</span>
              <input
                type="range"
                min={0}
                max={Math.max(0, selectedObjectRows.length - 1)}
                value={Math.max(0, snapshotIndex)}
                onChange={(event) => {
                  const nextRow = selectedObjectRows[Number(event.target.value)];
                  setLoadingCentral(true);
                  setCentralError(null);
                  setCentralData(null);
                  setHoveredCell(null);
                  setSelectedSnapshotId(nextRow?.snapshotId ?? "");
                  setPlaying(false);
                }}
              />
            </label>
            <button
              type="button"
              className="segmented-button segmented-button--active"
              onClick={() => setPlaying((current) => !current)}
            >
              {playing ? "Pause" : "Play"}
            </button>
          </>
        ) : (
          <InlineNotice tone="info" title="Current-state object">
            This object does not expose profiler history in the current app-ready cache, so
            the simulator uses its current stockpile state.
          </InlineNotice>
        )}
        {centralData?.dimension === 3 ? (
          <>
            <div className="button-row">
              {(["surface", "shell", "full", "slice"] as StockpileViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`segmented-button ${viewMode === mode ? "segmented-button--active" : ""}`}
                  onClick={() => setViewMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
            {viewMode === "slice" ? (
              <>
                <div className="button-row">
                  {(["x", "y", "z"] as SliceAxis[]).map((axis) => (
                    <button
                      key={axis}
                      type="button"
                      className={`segmented-button ${sliceAxis === axis ? "segmented-button--active" : ""}`}
                      onClick={() => setSliceAxis(axis)}
                    >
                      {axis.toUpperCase()}
                    </button>
                  ))}
                </div>
                <label className="field">
                  <span>Slice index</span>
                  <input
                    type="range"
                    min={0}
                    max={sliceMax}
                    value={effectiveSliceIndex}
                    onChange={(event) => setSliceIndex(Number(event.target.value))}
                  />
                </label>
              </>
            ) : null}
          </>
        ) : null}
        <MetricGrid
          metrics={[
            { label: "Object role", value: selectedNode?.objectRole ?? "Unknown" },
            {
              label: "Time mode",
              value: hasProfilerHistory ? "Profiler" : "Current",
            },
            {
              label: "Outputs",
              value: String(dischargeLanes.length),
            },
            {
              label: "Route belts",
              value: String(totalRouteBelts),
            },
          ]}
        />
      </aside>

      <section className="panel panel--canvas panel--stack">
        {summaryError ? (
          <InlineNotice tone="error" title="Simulator history unavailable">
            {summaryError}
          </InlineNotice>
        ) : null}
        {centralError ? (
          <InlineNotice tone="error" title="Central pile unavailable">
            {centralError}
          </InlineNotice>
        ) : null}
        {loadingSummary ? <div className="loading-banner">Loading simulator history...</div> : null}
        {loadingCentral ? <div className="loading-banner">Loading central pile...</div> : null}
        {hasProfilerHistory ? (
          <InlineNotice tone="info" title="Downstream lanes use current transport strips">
            The central pile follows the selected profiler timestep, but downstream conveyor
            strips and histograms currently use live belt snapshots from the local runtime cache.
          </InlineNotice>
        ) : null}
        {selectedQuality?.kind === "numerical" &&
        colorDomain?.mode === "adaptive-local" ? (
          <InlineNotice tone="info" title="View-scaled contrast active">
            The visible cells occupy only a narrow slice of the configured range, so the
            pile view is using a local color domain to keep property contrast readable.
          </InlineNotice>
        ) : null}
        {viewMode === "full" && fullRenderPlan.strategy === "adaptive" ? (
          <InlineNotice tone="warning" title="Adaptive full mode active">
            Rendering combines surface cells, base cells, and stride-sampled interior cells at
            stride {fullRenderPlan.stride} to keep dense views responsive.
          </InlineNotice>
        ) : null}
        {centralData ? (
          <>
            <div>
              <div className="section-label">Central object</div>
              <h3>{centralData.displayName}</h3>
              <p className="muted-text">
                The simulator anchors the selected pile or virtual pile at the center and
                organizes downstream discharge content by configured output route.
              </p>
            </div>
            <QualityLegend quality={selectedQuality} numericDomain={colorDomain} />
            <PileAnchorFrame
              inputs={centralData.inputs}
              outputs={centralData.outputs}
              showInFigureAnchors={centralData.dimension >= 2}
              activeOutputId={effectiveSelectedOutputId}
            >
              {centralContent}
            </PileAnchorFrame>
          </>
        ) : (
          centralContent
        )}
        {activeLane ? (
          <div className="simulator-route-summary">
            <div className="section-label">Active lane summary</div>
            <MetricGrid
              metrics={[
                { label: "Output", value: activeLane.output.label },
                {
                  label: "Direct belts",
                  value: String(activeLane.directBelts.length),
                },
                {
                  label: "Merge nodes",
                  value: String(activeLane.mergeNodes.length),
                },
                { label: "Combined mass", value: formatMassTon(activeLaneMassTon) },
                {
                  label: "Combined blocks",
                  value: String(activeLaneSnapshot?.snapshot.blockCount ?? 0),
                },
                {
                  label: "Loaded belts",
                  value: `${activeLaneLoadedCount}/${activeLaneBelts.length}`,
                },
              ]}
            />
            {!activeLaneSnapshot ? (
              <InlineNotice tone="info" title="Awaiting downstream belt content">
                The selected discharge route is configured, but its downstream live belt
                snapshots are still loading or unavailable.
              </InlineNotice>
            ) : (
              <>
                {!activeLaneSnapshot.timestampsAligned ? (
                  <InlineNotice tone="warning" title="Mixed live timestamps detected">
                    The active lane combines multiple current belt snapshots that do not share
                    exactly the same timestamp. The aggregate histogram still reflects the
                    current route content, but timestamp alignment is not exact.
                  </InlineNotice>
                ) : null}
                <BeltMassHistogram
                  snapshot={activeLaneSnapshot.snapshot}
                  quality={selectedQuality}
                />
              </>
            )}
          </div>
        ) : null}
        <div className="simulator-discharge">
          <div className="section-label">Discharge routes</div>
          {dischargeLanes.length === 0 ? (
            <InlineNotice tone="info" title="No discharge outputs">
              The selected pile does not expose downstream output routes in the current
              circuit graph.
            </InlineNotice>
          ) : (
            <>
              <div className="simulator-discharge__selector">
                {dischargeLanes.map((lane) => {
                  const routeBelts = getSimulatorLaneBelts(lane);

                  return (
                    <button
                      key={lane.output.id}
                      type="button"
                      className={`simulator-discharge-button ${
                        lane.output.id === effectiveSelectedOutputId
                          ? "simulator-discharge-button--active"
                          : ""
                      }`}
                      onClick={() => handleSelectOutput(lane.output.id)}
                    >
                      <span>{lane.output.label}</span>
                      <strong>
                        {lane.directBelts.length} direct / {routeBelts.length} total
                      </strong>
                    </button>
                  );
                })}
              </div>
              {activeLane ? (
                <article className="simulator-discharge-lane simulator-discharge-lane--active">
                  <div className="simulator-discharge-lane__header">
                    <div>
                      <div className="section-label">Active route</div>
                      <h3>{activeLane.output.label}</h3>
                    </div>
                    <div className="simulator-belt-card__meta">
                      <span>{activeLane.directBelts.length} direct outputs</span>
                      <strong>{activeLaneBelts.length} total belts</strong>
                    </div>
                  </div>
                  <div className="simulator-discharge-lane__sections">
                    <section className="simulator-discharge-stage">
                      <div className="section-label">Direct reclaim</div>
                      <div className="simulator-discharge-stage__cards">
                        {activeLane.directBelts.length === 0 ? (
                          <InlineNotice tone="info" title="No direct belt objects">
                            This output does not resolve to a direct belt object in the
                            current circuit graph.
                          </InlineNotice>
                        ) : (
                          activeLane.directBelts.map((belt) => (
                            <SimulatorDischargeLaneCard
                              key={`${activeLane.output.id}:direct:${belt.objectId}`}
                              belt={belt}
                              snapshot={beltSnapshots[belt.objectId]}
                              quality={selectedQuality}
                              loading={
                                loadingBelts &&
                                !beltSnapshots[belt.objectId] &&
                                !beltErrors[belt.objectId]
                              }
                              error={beltErrors[belt.objectId]}
                            />
                          ))
                        )}
                      </div>
                    </section>
                    <section className="simulator-discharge-stage">
                      <div className="section-label">Virtual merge</div>
                      <div className="simulator-discharge-stage__cards">
                        {activeLane.mergeNodes.length === 0 ? (
                          <InlineNotice tone="info" title="No merge stage">
                            This route goes from the direct discharge output into downstream
                            conveyors without a virtual mixing pile in between.
                          </InlineNotice>
                        ) : (
                          activeLane.mergeNodes.map((mergeNode) => (
                            <SimulatorMergeNodeCard
                              key={`${activeLane.output.id}:merge:${mergeNode.objectId}`}
                              mergeNode={mergeNode}
                            />
                          ))
                        )}
                      </div>
                    </section>
                    <section className="simulator-discharge-stage">
                      <div className="section-label">Downstream conveyors</div>
                      <div className="simulator-discharge-stage__cards">
                        {activeLane.downstreamBelts.length === 0 ? (
                          <InlineNotice tone="info" title="No downstream conveyors">
                            No downstream belt objects are currently reachable from this
                            discharge route.
                          </InlineNotice>
                        ) : (
                          activeLane.downstreamBelts.map((belt) => (
                            <SimulatorDischargeLaneCard
                              key={`${activeLane.output.id}:downstream:${belt.objectId}`}
                              belt={belt}
                              snapshot={beltSnapshots[belt.objectId]}
                              quality={selectedQuality}
                              loading={
                                loadingBelts &&
                                !beltSnapshots[belt.objectId] &&
                                !beltErrors[belt.objectId]
                              }
                              error={beltErrors[belt.objectId]}
                            />
                          ))
                        )}
                      </div>
                    </section>
                  </div>
                </article>
              ) : null}
            </>
          )}
        </div>
      </section>

      <aside className="panel">
        <div className="section-label">Selected route state</div>
        <h3>{centralData?.displayName ?? selectedNode?.label ?? "Selected pile"}</h3>
        <MetricGrid
          metrics={[
            {
              label: "Timestamp",
              value: centralData ? formatTimestamp(centralData.timestamp) : "Pending",
            },
            {
              label: "Mass",
              value: centralData ? formatMassTon(totalMassTon) : "Pending",
            },
            {
              label: "Dimension",
              value: centralData ? `${centralData.dimension}D` : "Pending",
            },
            {
              label: "Source",
              value:
                centralData?.source === "profiler-snapshot"
                  ? "Profiler snapshot"
                  : centralData?.source === "current-stockpile"
                    ? "Current state"
                    : "Pending",
              },
            ]}
          />
        <RouteBasisPanel
          source={
            centralData?.source === "profiler-snapshot"
              ? "Profiler pile snapshot + live route belts"
              : centralData?.source === "current-stockpile"
                ? "Current pile dataset + live route belts"
                : "Pending"
          }
          resolution={
            centralData ? `${centralData.dimension}D pile detail + dense belt blocks` : "Pending"
          }
          timeBasis={
            centralData?.source === "profiler-snapshot"
              ? "Selected pile timestep with current route belts"
              : centralData?.source === "current-stockpile"
                ? "Current pile and route state"
                : "Pending"
          }
          note="The central pile can already follow historical profiler time, but downstream route belts remain current until time-aligned route history is available."
        />
        <MetricGrid
          metrics={[
            {
              label: "Active output",
              value: activeLane?.output.label ?? "None",
            },
            {
              label: "Loaded belts",
              value: `${activeLaneLoadedCount}/${activeLaneBelts.length}`,
            },
            {
              label: "Route mass",
              value: activeLane ? formatMassTon(activeLaneMassTon) : "Pending",
            },
            {
              label: "Rendered cells",
              value: String(visibleCellCount),
            },
          ]}
        />
        {centralDistribution && selectedQuality ? (
          <div className="inspector-stack">
            <div className="section-label">Mass distribution</div>
            <MassDistributionChart
              distribution={centralDistribution}
              quality={selectedQuality}
              subjectLabel={centralData?.displayName ?? selectedNode?.label ?? "Selected pile"}
              recordLabel="cells"
            />
          </div>
        ) : null}
        {centralData ? (
          <ProfiledPropertiesPanel
            qualities={availableQualities}
            values={centralData.qualityAverages}
            records={centralData.cells}
            totalMassTon={totalMassTon}
          />
        ) : null}
        <CellFocusPanel
          hoveredCell={activeHoveredCell}
          qualities={availableQualities}
          selectedQuality={selectedQuality}
          emptyMessage="Hover a cell, voxel, or cross-section cell in the central pile view to inspect coordinates, mass, and property values."
        />
        <WorkspaceJumpLinks
          objectId={selectedObjectId}
          objectType="pile"
          isProfiled={hasProfilerHistory}
        />
      </aside>
    </div>
  );
}
