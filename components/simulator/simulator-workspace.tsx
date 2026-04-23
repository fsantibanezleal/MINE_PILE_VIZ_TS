"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DirectOutputEvidenceCard } from "@/components/ui/direct-output-evidence-card";
import { CellFocusPanel } from "@/components/ui/cell-focus-panel";
import { InlineNotice } from "@/components/ui/inline-notice";
import { MetricGrid } from "@/components/ui/metric-grid";
import { QualityLegend } from "@/components/ui/quality-legend";
import { QualitySelector } from "@/components/ui/quality-selector";
import { VerticalCompressionControl } from "@/components/ui/vertical-compression-control";
import { WorkspaceJumpLinks } from "@/components/ui/workspace-jump-links";
import { PileAnchorFrame } from "@/components/stockpiles/pile-anchor-frame";
import { Pile3DCanvas } from "@/components/stockpiles/pile-3d-canvas";
import {
  PileColumnView,
  PileHeatmapView,
} from "@/components/stockpiles/pile-views";
import { deriveNumericColorDomain } from "@/lib/color";
import { deriveCellExtents } from "@/lib/data-stats";
import { formatMassTon } from "@/lib/format";
import { getDefaultPile3DViewpoint } from "@/lib/pile-viewpoint";
import {
  buildPileSurfaceColumns,
  getPileSurfaceColumnValue,
  type PileSurfaceColorMode,
} from "@/lib/pile-surface";
import { buildMassWeightedQualitySummary } from "@/lib/quality-summary";
import { buildAdaptiveFullRenderPlan } from "@/lib/stockpile-rendering";
import { usePersistentPileViewpoint } from "@/lib/use-persistent-pile-viewpoint";
import { usePersistentVerticalCompression } from "@/lib/use-persistent-vertical-compression";
import {
  buildHrefWithQuery,
  resolveQuerySelection,
} from "@/lib/workspace-route-state";
import type {
  CircuitGraph,
  PileCellRecord,
  PileDataset,
  QualityDefinition,
  SimulatorIndex,
  SimulatorObjectManifest,
  SimulatorStepSnapshot,
  StockpileViewMode,
} from "@/types/app-data";

interface SimulatorWorkspaceProps {
  graph: CircuitGraph;
  index: SimulatorIndex;
  qualities: QualityDefinition[];
}

type SliceAxis = "x" | "y" | "z";
type Pile3DDisplayMode = StockpileViewMode | "top-surface";

function isSameCell(left: PileCellRecord, right: PileCellRecord) {
  return left.ix === right.ix && left.iy === right.iy && left.iz === right.iz;
}

function formatStepLabel(stepIndex: number, stepMinutes: number) {
  if (stepIndex === 0) {
    return "Latest real state";
  }

  const totalMinutes = stepIndex * stepMinutes;
  if (totalMinutes % 60 === 0) {
    return `+${totalMinutes / 60} h`;
  }

  return `+${totalMinutes} min`;
}

function buildSimulatorPileDataset({
  rows,
  manifest,
  timestamp,
  graph,
  qualities,
}: {
  rows: PileCellRecord[];
  manifest: SimulatorObjectManifest;
  timestamp: string;
  graph: CircuitGraph;
  qualities: QualityDefinition[];
}): PileDataset {
  const extents = deriveCellExtents(rows);
  const selectedNode = graph.nodes.find((node) => node.objectId === manifest.objectId);

  return {
    objectId: manifest.objectId,
    displayName: manifest.displayName,
    objectRole: manifest.objectRole,
    timestamp,
    dimension: manifest.dimension,
    extents,
    occupiedCellCount: rows.length,
    surfaceCellCount: rows.length,
    defaultQualityId: manifest.defaultQualityId,
    availableQualityIds: manifest.availableQualityIds,
    viewModes: manifest.dimension === 3 ? ["surface", "shell", "full", "slice"] : ["full"],
    suggestedFullStride: 1,
    fullModeThreshold: Math.max(rows.length * 2, 2000),
    qualityAverages: buildMassWeightedQualitySummary(rows, qualities),
    inputs: selectedNode?.inputs ?? [],
    outputs: manifest.outputs,
    files: {
      cells: "",
    },
    cells: rows,
    surfaceCells: rows,
    shellCells: rows,
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

export function SimulatorWorkspace({
  graph,
  index,
  qualities,
}: SimulatorWorkspaceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const objectIds = index.objects.map((entry) => entry.objectId);
  const fallbackObjectId = objectIds.includes(index.defaultObjectId)
    ? index.defaultObjectId
    : (objectIds[0] ?? "");
  const initialSelectedObjectId = resolveQuerySelection(
    searchParams.get("object"),
    objectIds,
    fallbackObjectId,
  );
  const initialSelectedQualityId = resolveQuerySelection(
    searchParams.get("quality"),
    qualities.map((quality) => quality.id),
    qualities[0]?.id ?? "",
  );
  const initialSelectedStepIndex = Math.max(0, Number(searchParams.get("step") ?? "0") || 0);

  const [selectedObjectId, setSelectedObjectId] = useState(initialSelectedObjectId);
  const [selectedQualityId, setSelectedQualityId] = useState(initialSelectedQualityId);
  const [selectedStepIndex, setSelectedStepIndex] = useState(initialSelectedStepIndex);
  const [manifest, setManifest] = useState<SimulatorObjectManifest | null>(null);
  const [stepCache, setStepCache] = useState<Record<string, SimulatorStepSnapshot>>({});
  const [loadingManifest, setLoadingManifest] = useState(true);
  const [loadingStep, setLoadingStep] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<Pile3DDisplayMode>("full");
  const [surfaceColorMode, setSurfaceColorMode] =
    useState<PileSurfaceColorMode>("top-cell");
  const [sliceAxis, setSliceAxis] = useState<SliceAxis>("z");
  const [sliceIndex, setSliceIndex] = useState(0);
  const [hoveredCell, setHoveredCell] = useState<PileCellRecord | null>(null);
  const [verticalCompressionFactor, setVerticalCompressionFactor] =
    usePersistentVerticalCompression("simulator");

  const availableQualities = qualities.filter((quality) =>
    manifest ? manifest.availableQualityIds.includes(quality.id) : true,
  );
  const effectiveQualityId =
    availableQualities.find((quality) => quality.id === selectedQualityId)?.id ??
    manifest?.defaultQualityId ??
    availableQualities[0]?.id ??
    "";
  const selectedQuality = availableQualities.find(
    (quality) => quality.id === effectiveQualityId,
  );

  useEffect(() => {
    if (!selectedObjectId) {
      return;
    }

    let cancelled = false;
    setLoadingManifest(true);
    setLoadError(null);
    setPlaying(false);

    async function loadManifest() {
      try {
        const nextManifest = await fetchJson<SimulatorObjectManifest>(
          `/api/simulator/objects/${selectedObjectId}`,
          "Failed to load simulator manifest.",
        );

        if (cancelled) {
          return;
        }

        setManifest(nextManifest);
        setStepCache({});
        setSelectedQualityId((current) =>
          nextManifest.availableQualityIds.includes(current)
            ? current
            : nextManifest.defaultQualityId,
        );
        setSelectedStepIndex(0);
        setViewMode(nextManifest.dimension === 3 ? "surface" : "full");
        setSurfaceColorMode("top-cell");
        setSliceAxis("z");
        setSliceIndex(0);
        setHoveredCell(null);
      } catch (error) {
        if (!cancelled) {
          setManifest(null);
          setStepCache({});
          setLoadError(
            error instanceof Error ? error.message : "Failed to load simulator manifest.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingManifest(false);
        }
      }
    }

    void loadManifest();

    return () => {
      cancelled = true;
    };
  }, [selectedObjectId]);

  const effectiveStepIndex = Math.min(
    Math.max(0, selectedStepIndex),
    Math.max(0, (manifest?.steps.length ?? 1) - 1),
  );
  const currentStepMeta = manifest?.steps[effectiveStepIndex] ?? null;
  const currentStep = currentStepMeta ? stepCache[currentStepMeta.snapshotId] : null;

  useEffect(() => {
    if (!manifest || !currentStepMeta) {
      return;
    }

    const snapshotId = currentStepMeta.snapshotId;

    if (stepCache[snapshotId]) {
      return;
    }

    let cancelled = false;
    setLoadingStep(true);
    setLoadError(null);

    async function loadStep() {
      try {
        const payload = await fetchJson<SimulatorStepSnapshot>(
          `/api/simulator/objects/${selectedObjectId}/steps/${snapshotId}`,
          "Failed to load simulator step.",
        );

        if (cancelled) {
          return;
        }

        setStepCache((currentCache) => ({
          ...currentCache,
          [payload.snapshotId]: payload,
        }));
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load simulator step.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingStep(false);
        }
      }
    }

    void loadStep();

    return () => {
      cancelled = true;
    };
  }, [currentStepMeta, manifest, selectedObjectId, stepCache]);

  useEffect(() => {
    if (!playing || !manifest || manifest.steps.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setSelectedStepIndex((current) => {
        if (current >= manifest.steps.length - 1) {
          setPlaying(false);
          return current;
        }

        return current + 1;
      });
    }, 900);

    return () => {
      window.clearInterval(timer);
    };
  }, [manifest, playing]);

  useEffect(() => {
    router.replace(
      buildHrefWithQuery(pathname, searchParams, {
        object: selectedObjectId,
        quality: effectiveQualityId,
        step: String(effectiveStepIndex),
      }),
      {
        scroll: false,
      },
    );
  }, [effectiveQualityId, effectiveStepIndex, pathname, router, searchParams, selectedObjectId]);

  const dataset = useMemo(
    () =>
      manifest && currentStep
        ? buildSimulatorPileDataset({
            rows: currentStep.pileRows,
            manifest,
            timestamp: currentStep.timestamp,
            graph,
            qualities,
          })
        : null,
    [currentStep, graph, manifest, qualities],
  );
  const totalMassTon = dataset?.cells.reduce((sum, cell) => sum + cell.massTon, 0) ?? 0;
  const fullRenderPlan = useMemo(
    () =>
      buildAdaptiveFullRenderPlan({
        cells: dataset?.cells ?? [],
        surfaceCells: dataset?.surfaceCells ?? [],
        threshold: dataset?.fullModeThreshold ?? 1,
        suggestedStride: dataset?.suggestedFullStride ?? 1,
      }),
    [
      dataset?.cells,
      dataset?.fullModeThreshold,
      dataset?.suggestedFullStride,
      dataset?.surfaceCells,
    ],
  );
  const surfaceColumns = useMemo(
    () =>
      dataset && dataset.dimension === 3
        ? buildPileSurfaceColumns(dataset.cells, selectedQuality)
        : [],
    [dataset, selectedQuality],
  );
  const sliceMax = Math.max(
    0,
    sliceAxis === "x"
      ? (dataset?.extents.x ?? 1) - 1
      : sliceAxis === "y"
        ? (dataset?.extents.y ?? 1) - 1
        : (dataset?.extents.z ?? 1) - 1,
  );
  const effectiveSliceIndex = Math.min(sliceIndex, sliceMax);
  const sliceCells = useMemo(
    () =>
      (dataset?.cells ?? []).filter((cell) => {
        if (sliceAxis === "x") {
          return cell.ix === effectiveSliceIndex;
        }

        if (sliceAxis === "y") {
          return cell.iy === effectiveSliceIndex;
        }

        return cell.iz === effectiveSliceIndex;
      }),
    [dataset?.cells, effectiveSliceIndex, sliceAxis],
  );
  const visibleCells = useMemo(
    () =>
      !dataset
        ? []
        : dataset.dimension === 3
          ? viewMode === "top-surface"
            ? surfaceColumns.map((column) => column.topCell)
            : viewMode === "surface"
              ? dataset.surfaceCells
              : viewMode === "shell"
                ? (dataset.shellCells.length > 0 ? dataset.shellCells : dataset.surfaceCells)
                : viewMode === "slice"
                  ? sliceCells
                  : fullRenderPlan.cells
          : dataset.cells,
    [dataset, fullRenderPlan.cells, sliceCells, surfaceColumns, viewMode],
  );
  const colorDomain = useMemo(() => {
    if (!dataset || !selectedQuality || selectedQuality.kind !== "numerical") {
      return undefined;
    }

    if (dataset.dimension === 3 && viewMode === "top-surface") {
      return deriveNumericColorDomain(
        surfaceColumns.map((column) => {
          const value = getPileSurfaceColumnValue(column, surfaceColorMode);
          return typeof value === "number" ? value : null;
        }),
        selectedQuality,
      );
    }

    return deriveNumericColorDomain(
      visibleCells.map((cell) => {
        const value = cell.qualityValues[selectedQuality.id];
        return typeof value === "number" ? value : null;
      }),
      selectedQuality,
    );
  }, [dataset, selectedQuality, surfaceColorMode, surfaceColumns, viewMode, visibleCells]);
  const activeHoveredCell =
    hoveredCell && visibleCells.some((cell) => isSameCell(cell, hoveredCell))
      ? hoveredCell
      : null;
  const defaultViewpoint =
    dataset?.dimension === 3
      ? getDefaultPile3DViewpoint(dataset.extents, verticalCompressionFactor)
      : null;
  const [pileViewpoint, setPileViewpoint] = usePersistentPileViewpoint(
    "simulator",
    defaultViewpoint,
  );
  const outputCards = manifest?.outputs ?? [];
  const currentStepLabel = manifest
    ? formatStepLabel(effectiveStepIndex, manifest.stepMinutes)
    : "Pending";

  return (
    <div className="workspace-grid workspace-grid--triple">
      <aside className="panel">
        <div className="section-label">Simulation controls</div>
        <label className="field">
          <span>Pile</span>
          <select
            value={selectedObjectId}
            onChange={(event) => setSelectedObjectId(event.target.value)}
          >
            {index.objects.map((entry) => (
              <option key={entry.objectId} value={entry.objectId}>
                {entry.displayName}
              </option>
            ))}
          </select>
        </label>
        <QualitySelector
          label="Quality"
          qualities={availableQualities}
          value={effectiveQualityId}
          onChange={setSelectedQualityId}
        />
        <div className="button-row">
          <button
            type="button"
            className={`segmented-button ${playing ? "segmented-button--active" : ""}`}
            onClick={() => setPlaying((current) => !current)}
            disabled={(manifest?.steps.length ?? 0) <= 1}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            className="segmented-button"
            onClick={() => {
              setPlaying(false);
              setSelectedStepIndex(0);
            }}
          >
            Reset
          </button>
        </div>
        <label className="field">
          <span>Simulation horizon</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, (manifest?.steps.length ?? 1) - 1)}
            value={effectiveStepIndex}
            onChange={(event) => {
              setPlaying(false);
              setSelectedStepIndex(Number(event.target.value));
            }}
          />
          <small className="muted-text">{currentStepLabel}</small>
        </label>
        <MetricGrid
          metrics={[
            { label: "Base state", value: "Latest profiler pile" },
            {
              label: "Future steps",
              value: manifest ? String(Math.max(0, manifest.steps.length - 1)) : "Pending",
            },
            {
              label: "Step interval",
              value: manifest ? `${manifest.stepMinutes} min` : "Pending",
            },
            {
              label: "Outputs",
              value: manifest ? String(manifest.outputs.length) : "Pending",
            },
          ]}
        />
      </aside>

      <section className="panel panel--canvas">
        {loadingManifest ? <div className="loading-banner">Loading simulator basis...</div> : null}
        {loadingStep ? <div className="loading-banner">Loading simulated step...</div> : null}
        {loadError ? (
          <InlineNotice tone="error" title="Simulator unavailable">
            {loadError}
          </InlineNotice>
        ) : null}
        {dataset ? (
          <>
            <QualityLegend quality={selectedQuality} numericDomain={colorDomain} />
            {dataset.dimension === 3 ? (
              <>
                <div className="button-row">
                  {(["surface", "shell", "full", "slice", "top-surface"] as Pile3DDisplayMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`segmented-button ${viewMode === mode ? "segmented-button--active" : ""}`}
                      onClick={() => setViewMode(mode)}
                    >
                      {mode === "top-surface" ? "top surface" : mode}
                    </button>
                  ))}
                </div>
                {viewMode === "top-surface" ? (
                  <div className="button-row">
                    {(["top-cell", "column-mass-weighted"] as PileSurfaceColorMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        className={`segmented-button ${surfaceColorMode === mode ? "segmented-button--active" : ""}`}
                        onClick={() => setSurfaceColorMode(mode)}
                      >
                        {mode === "top-cell" ? "top cell" : "mass-weighted column"}
                      </button>
                    ))}
                  </div>
                ) : null}
                <VerticalCompressionControl
                  value={verticalCompressionFactor}
                  onChange={setVerticalCompressionFactor}
                />
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
            <PileAnchorFrame
              inputs={dataset.inputs}
              outputs={dataset.outputs}
              showInFigureAnchors={dataset.dimension >= 2}
            >
              {dataset.dimension === 1 ? (
                <PileColumnView
                  cells={dataset.cells}
                  quality={selectedQuality}
                  numericDomain={colorDomain}
                  onHoverCellChange={setHoveredCell}
                />
              ) : dataset.dimension === 2 ? (
                <PileHeatmapView
                  cells={dataset.cells}
                  quality={selectedQuality}
                  numericDomain={colorDomain}
                  columns={dataset.extents.x}
                  rows={dataset.extents.y}
                  xAccessor={(cell) => cell.ix}
                  yAccessor={(cell) => cell.iy}
                  onHoverCellChange={setHoveredCell}
                />
              ) : viewMode === "slice" ? (
                <PileHeatmapView
                  cells={sliceCells}
                  quality={selectedQuality}
                  numericDomain={colorDomain}
                  columns={sliceAxis === "y" ? dataset.extents.x : dataset.extents.y}
                  rows={sliceAxis === "z" ? dataset.extents.y : dataset.extents.z}
                  xAccessor={(cell) => (sliceAxis === "y" ? cell.ix : cell.iy)}
                  yAccessor={(cell) => (sliceAxis === "z" ? cell.iy : cell.iz)}
                  onHoverCellChange={setHoveredCell}
                />
              ) : (
                <Pile3DCanvas
                  cells={
                    viewMode === "top-surface"
                      ? surfaceColumns.map((column) => column.topCell)
                      : viewMode === "surface"
                        ? dataset.surfaceCells
                        : viewMode === "shell"
                          ? (dataset.shellCells.length > 0
                              ? dataset.shellCells
                              : dataset.surfaceCells)
                          : fullRenderPlan.cells
                  }
                  extents={dataset.extents}
                  quality={selectedQuality}
                  numericDomain={colorDomain}
                  onHoverCellChange={setHoveredCell}
                  renderMode={viewMode === "top-surface" ? "top-surface" : "voxels"}
                  surfaceColumns={surfaceColumns}
                  surfaceColorMode={surfaceColorMode}
                  verticalCompressionFactor={verticalCompressionFactor}
                  viewpoint={pileViewpoint}
                  onViewpointChange={setPileViewpoint}
                />
              )}
            </PileAnchorFrame>

            <div className="direct-output-section">
              <div className="section-label">Simulated feeder outputs</div>
              <p className="muted-text">
                The pile stays at the center. Each feeder/output stays visible at the same time
                underneath it so the pile content and the simultaneous discharge are read together.
              </p>
              <div className="direct-output-row">
                {outputCards.map((output) => {
                  const snapshot = currentStep?.outputSnapshots[output.id] ?? null;
                  return (
                    <DirectOutputEvidenceCard
                      key={output.id}
                      title={output.label}
                      subtitle={
                        output.parentBeltId
                          ? `${output.relatedObjectId} → ${output.parentBeltId}`
                          : output.relatedObjectId
                      }
                      snapshot={snapshot}
                      quality={selectedQuality}
                      materialTimeMode="property"
                      summaryMetrics={[
                        {
                          label: `Rate / ${output.stepMinutes} min`,
                          value: formatMassTon(output.tonsPerStep),
                        },
                        {
                          label: "Rate / h",
                          value: `${output.tonsPerHour.toFixed(1)} t/h`,
                        },
                        {
                          label: "Simulated mass",
                          value: snapshot ? formatMassTon(snapshot.totalMassTon) : "0 t",
                        },
                        {
                          label: "Blocks",
                          value: snapshot ? String(snapshot.blockCount) : "0",
                        },
                      ]}
                    />
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </section>

      <aside className="panel">
        <div className="section-label">Simulation summary</div>
        <h3>{manifest?.displayName ?? "Selected pile"}</h3>
        <MetricGrid
          metrics={[
            { label: "Scenario step", value: currentStepLabel },
            { label: "Pile mass", value: dataset ? formatMassTon(totalMassTon) : "Pending" },
            { label: "Visible cells", value: String(visibleCells.length) },
            { label: "Feeders", value: String(outputCards.length) },
          ]}
        />
        <p className="muted-text">
          This route starts from the latest real profiler pile state and advances only through the
          stored simulation steps under <code>sims</code>. The discharge rates shown for each
          feeder are read-only assumptions that already belong to the generated scenario.
        </p>
        <CellFocusPanel
          hoveredCell={activeHoveredCell}
          qualities={availableQualities}
          selectedQuality={selectedQuality}
          emptyMessage="Hover a simulated pile cell or voxel to inspect its mass and selected quality."
        />
        <WorkspaceJumpLinks objectId={selectedObjectId} objectType="pile" isProfiled={true} />
      </aside>
    </div>
  );
}
