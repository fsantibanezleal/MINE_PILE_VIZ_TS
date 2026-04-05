"use client";

import { startTransition, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  ObjectRegistryEntry,
  PileCellRecord,
  PileDataset,
  QualityDefinition,
  StockpileViewMode,
} from "@/types/app-data";
import { deriveNumericColorDomain } from "@/lib/color";
import { MassDistributionChart } from "@/components/ui/mass-distribution-chart";
import { buildAdaptiveFullRenderPlan } from "@/lib/stockpile-rendering";
import { buildMassDistribution } from "@/lib/mass-distribution";
import { CellFocusPanel } from "@/components/ui/cell-focus-panel";
import { InlineNotice } from "@/components/ui/inline-notice";
import { MaterialTimePanel } from "@/components/ui/material-time-panel";
import { MaterialTimeModeSelector } from "@/components/ui/material-time-mode-selector";
import { MetricGrid } from "@/components/ui/metric-grid";
import { PileStructurePanel } from "@/components/ui/pile-structure-panel";
import { ProfiledPropertiesPanel } from "@/components/ui/profiled-properties-panel";
import { QualityLegend } from "@/components/ui/quality-legend";
import { QualitySelector } from "@/components/ui/quality-selector";
import { RouteBasisPanel } from "@/components/ui/route-basis-panel";
import { WorkspaceJumpLinks } from "@/components/ui/workspace-jump-links";
import { PileAnchorFrame } from "@/components/stockpiles/pile-anchor-frame";
import { Pile3DCanvas } from "@/components/stockpiles/pile-3d-canvas";
import {
  PileColumnView,
  PileHeatmapView,
} from "@/components/stockpiles/pile-views";
import { formatMassTon, formatTimestamp } from "@/lib/format";
import { buildMaterialTimeSummary } from "@/lib/material-time";
import {
  getMaterialTimeDefinition,
  getMaterialTimeValue,
  type MaterialTimeMode,
} from "@/lib/material-time-view";
import {
  buildHrefWithQuery,
  resolveQuerySelection,
} from "@/lib/workspace-route-state";

interface StockpileWorkspaceProps {
  pileEntries: ObjectRegistryEntry[];
  qualities: QualityDefinition[];
  initialPileId: string;
  variant?: "stockpiles" | "live";
}

type SliceAxis = "x" | "y" | "z";

function isSameCell(left: PileCellRecord, right: PileCellRecord) {
  return left.ix === right.ix && left.iy === right.iy && left.iz === right.iz;
}

function getDefaultViewMode(dataset: PileDataset): StockpileViewMode {
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

export function StockpileWorkspace({
  pileEntries,
  qualities,
  initialPileId,
  variant = "stockpiles",
}: StockpileWorkspaceProps) {
  const isLiveVariant = variant === "live";
  const materialTimeModes: MaterialTimeMode[] = [
    "property",
    "oldest-age",
    "newest-age",
    "material-span",
  ];
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSelectedPileId = resolveQuerySelection(
    searchParams.get("object"),
    pileEntries.map((entry) => entry.objectId),
    initialPileId,
  );
  const initialSelectedQualityId = resolveQuerySelection(
    searchParams.get("quality"),
    qualities.map((quality) => quality.id),
    qualities[0]?.id ?? "",
  );
  const initialSelectedTimeMode = resolveQuerySelection(
    searchParams.get("timemode"),
    materialTimeModes,
    "property",
  ) as MaterialTimeMode;
  const [selectedPileId, setSelectedPileId] = useState(initialSelectedPileId);
  const [dataset, setDataset] = useState<PileDataset | null>(null);
  const [selectedQualityId, setSelectedQualityId] = useState(initialSelectedQualityId);
  const [selectedTimeMode, setSelectedTimeMode] = useState(initialSelectedTimeMode);
  const [viewMode, setViewMode] = useState<StockpileViewMode>("full");
  const [sliceAxis, setSliceAxis] = useState<SliceAxis>("z");
  const [sliceIndex, setSliceIndex] = useState(0);
  const [hoveredCell, setHoveredCell] = useState<PileCellRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedPileEntry =
    pileEntries.find((entry) => entry.objectId === selectedPileId) ?? pileEntries[0];
  const availableQualities = qualities.filter((quality) =>
    dataset ? dataset.availableQualityIds.includes(quality.id) : false,
  );
  const totalMass =
    dataset?.cells.reduce((sum, cell) => sum + cell.massTon, 0) ?? 0;
  const effectiveQualityId =
    availableQualities.find((quality) => quality.id === selectedQualityId)?.id ??
    availableQualities[0]?.id ??
    "";
  const selectedQuality = availableQualities.find(
    (quality) => quality.id === effectiveQualityId,
  );
  const inspectionQuality =
    selectedTimeMode === "property"
      ? selectedQuality
      : getMaterialTimeDefinition(selectedTimeMode);
  const inspectionValueAccessor = useMemo(
    () =>
      selectedTimeMode === "property"
        ? undefined
        : (cell: PileCellRecord) =>
            getMaterialTimeValue(cell, selectedTimeMode, dataset?.timestamp),
    [dataset?.timestamp, selectedTimeMode],
  );

  function handleSelectPile(nextPileId: string) {
    if (nextPileId === selectedPileId) {
      return;
    }

    setDataset(null);
    setLoading(true);
    setLoadError(null);
    setSelectedPileId(nextPileId);
    router.replace(
      buildHrefWithQuery(pathname, searchParams, {
        object: nextPileId,
      }),
      {
        scroll: false,
      },
    );
  }

  function handleSelectQuality(nextQualityId: string) {
    setSelectedQualityId(nextQualityId);
    router.replace(
      buildHrefWithQuery(pathname, searchParams, {
        quality: nextQualityId,
      }),
      {
        scroll: false,
      },
    );
  }

  function handleSelectTimeMode(nextMode: MaterialTimeMode) {
    setSelectedTimeMode(nextMode);
    router.replace(
      buildHrefWithQuery(pathname, searchParams, {
        timemode: nextMode,
      }),
      {
        scroll: false,
      },
    );
  }

  useEffect(() => {
    if (!selectedPileId) {
      return;
    }

    let cancelled = false;

    fetch(`/api/live/piles/${selectedPileId}`)
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | {
                error?: {
                  message?: string;
                };
              }
            | null;
          throw new Error(
            payload?.error?.message ?? "Failed to load current pile dataset.",
          );
        }

        return (await response.json()) as PileDataset;
      })
      .then((payload) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setDataset(payload);
          setSelectedQualityId((current) =>
            payload.availableQualityIds.includes(current)
              ? current
              : payload.defaultQualityId,
          );
          setViewMode(getDefaultViewMode(payload));
          setSliceAxis("z");
          setSliceIndex(0);
          setHoveredCell(null);
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load current pile dataset.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPileId]);

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

  const sliceMax = Math.max(
    0,
    sliceAxis === "x"
      ? (dataset?.extents.x ?? 1) - 1
      : sliceAxis === "y"
        ? (dataset?.extents.y ?? 1) - 1
        : (dataset?.extents.z ?? 1) - 1,
  );
  const effectiveSliceIndex = Math.min(sliceIndex, sliceMax);

  const sliceCells = useMemo(() => {
    return (dataset?.cells ?? []).filter((cell) => {
      if (sliceAxis === "x") {
        return cell.ix === effectiveSliceIndex;
      }

      if (sliceAxis === "y") {
        return cell.iy === effectiveSliceIndex;
      }

      return cell.iz === effectiveSliceIndex;
    });
  }, [dataset?.cells, effectiveSliceIndex, sliceAxis]);
  const visibleCellCount =
    dataset?.dimension === 3
      ? viewMode === "surface"
        ? dataset.surfaceCells.length
        : viewMode === "shell"
          ? (dataset.shellCells.length > 0 ? dataset.shellCells : dataset.surfaceCells).length
          : viewMode === "slice"
            ? sliceCells.length
            : fullRenderPlan.renderedCellCount
      : dataset?.cells.length ?? 0;
  const colorDomain = useMemo(() => {
    if (!dataset || !inspectionQuality || inspectionQuality.kind !== "numerical") {
      return undefined;
    }

    const cellsForDomain =
      dataset.dimension === 3
        ? viewMode === "surface"
          ? dataset.surfaceCells
          : viewMode === "shell"
            ? dataset.shellCells.length > 0
              ? dataset.shellCells
              : dataset.surfaceCells
            : viewMode === "slice"
              ? sliceCells
              : fullRenderPlan.cells
        : dataset.cells;

    return deriveNumericColorDomain(
      cellsForDomain.map((cell) => {
        const value = inspectionValueAccessor
          ? inspectionValueAccessor(cell)
          : cell.qualityValues[inspectionQuality.id];
        return typeof value === "number" ? value : null;
      }),
      inspectionQuality,
    );
  }, [
    dataset,
    fullRenderPlan.cells,
    inspectionQuality,
    inspectionValueAccessor,
    sliceCells,
    viewMode,
  ]);

  const visibleCellsForHover =
    !dataset
      ? []
      : dataset.dimension === 3
        ? viewMode === "surface"
          ? dataset.surfaceCells
          : viewMode === "shell"
            ? dataset.shellCells.length > 0
              ? dataset.shellCells
              : dataset.surfaceCells
            : viewMode === "slice"
              ? sliceCells
              : fullRenderPlan.cells
        : dataset.cells;
  const activeHoveredCell =
    hoveredCell &&
    visibleCellsForHover.some((cell) => isSameCell(cell, hoveredCell))
      ? hoveredCell
      : null;
  const massDistribution = useMemo(
    () =>
      dataset && inspectionQuality
        ? buildMassDistribution(dataset.cells, inspectionQuality, {
            valueAccessor: inspectionValueAccessor,
          })
        : null,
    [dataset, inspectionQuality, inspectionValueAccessor],
  );
  const materialTimeSummary = useMemo(
    () =>
      dataset ? buildMaterialTimeSummary(dataset.cells, dataset.timestamp) : null,
    [dataset],
  );

  let content: ReactNode;

  if (!dataset) {
    content = (
      <InlineNotice tone={loadError ? "error" : "info"} title="Current pile dataset loads on demand">
        {loadError
          ? "Select the pile again after the dataset becomes available."
          : "Choose a stockpile to request its dense cell table only when this workspace needs it."}
      </InlineNotice>
    );
  } else if (dataset.dimension === 1) {
    content = (
      <PileColumnView
        cells={dataset.cells}
        quality={inspectionQuality}
        numericDomain={colorDomain}
        onHoverCellChange={setHoveredCell}
        valueAccessor={inspectionValueAccessor}
      />
    );
  } else if (dataset.dimension === 2) {
    content = (
      <PileHeatmapView
        cells={dataset.cells}
        quality={inspectionQuality}
        numericDomain={colorDomain}
        columns={dataset.extents.x}
        rows={dataset.extents.y}
        xAccessor={(cell) => cell.ix}
        yAccessor={(cell) => cell.iy}
        onHoverCellChange={setHoveredCell}
        valueAccessor={inspectionValueAccessor}
      />
    );
  } else if (viewMode === "slice") {
    content = (
      <PileHeatmapView
        cells={sliceCells}
        quality={inspectionQuality}
        numericDomain={colorDomain}
        columns={sliceAxis === "y" ? dataset.extents.x : dataset.extents.y}
        rows={sliceAxis === "z" ? dataset.extents.y : dataset.extents.z}
        xAccessor={(cell) => (sliceAxis === "y" ? cell.ix : cell.iy)}
        yAccessor={(cell) => (sliceAxis === "z" ? cell.iy : cell.iz)}
        onHoverCellChange={setHoveredCell}
        valueAccessor={inspectionValueAccessor}
      />
    );
  } else {
    const cells =
      viewMode === "surface"
        ? dataset.surfaceCells
        : viewMode === "shell"
          ? dataset.shellCells.length > 0
            ? dataset.shellCells
            : dataset.surfaceCells
          : fullRenderPlan.cells;

    content = (
      <Pile3DCanvas
        key={`${dataset.objectId}:${viewMode}:${effectiveQualityId}:${selectedTimeMode}`}
        cells={cells}
        extents={dataset.extents}
        quality={inspectionQuality}
        numericDomain={colorDomain}
        onHoverCellChange={setHoveredCell}
        valueAccessor={inspectionValueAccessor}
      />
    );
  }

  return (
    <div className="workspace-grid workspace-grid--triple">
      <aside className="panel">
        <div className="section-label">
          {isLiveVariant ? "Current dense pile selection" : "Selection"}
        </div>
        <label className="field">
          <span>Pile</span>
          <select
            value={selectedPileId}
            onChange={(event) => handleSelectPile(event.target.value)}
          >
            {pileEntries.map((entry) => (
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
          onChange={handleSelectQuality}
        />
        <MaterialTimeModeSelector
          value={selectedTimeMode}
          onChange={handleSelectTimeMode}
          label="Inspection mode"
        />
        {dataset?.dimension === 3 ? (
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
            { label: "Dimension", value: dataset ? `${dataset.dimension}D` : "Pending" },
            { label: "Occupied cells", value: dataset ? String(dataset.occupiedCellCount) : "Pending" },
            { label: "Timestamp", value: dataset ? formatTimestamp(dataset.timestamp) : "Pending" },
          ]}
        />
      </aside>

      <section className="panel panel--canvas">
        {loadError ? (
          <InlineNotice tone="error" title="Current pile dataset unavailable">
            {loadError}
          </InlineNotice>
        ) : null}
        {viewMode === "full" && fullRenderPlan.strategy === "adaptive" ? (
          <InlineNotice tone="warning" title="Adaptive full mode active">
            Rendering uses surface cells, base footprint cells, and stride-sampled interior
            cells at stride {fullRenderPlan.stride} to keep dense local views responsive.
          </InlineNotice>
        ) : null}
        {dataset?.dimension === 3 && viewMode !== "full" ? (
          <InlineNotice tone="info" title="Interior voxels are not fully exposed in this mode">
            {viewMode === "surface"
              ? "Surface mode colors only the currently visible outer layer. Switch to full mode to paint every occupied voxel when the dataset size allows it."
              : viewMode === "shell"
                ? "Shell mode colors the exposed envelope of the pile. Switch to full mode to paint every occupied voxel when you need the full internal content."
                : "Slice mode colors only the active cross-section. Switch to full mode to paint every occupied voxel across the full pile."}
          </InlineNotice>
        ) : null}
        {viewMode === "shell" && dataset && dataset.shellCells.length === 0 && dataset.surfaceCells.length > 0 ? (
          <InlineNotice tone="info" title="Shell artifact unavailable">
            This dataset does not expose a dedicated shell layer, so shell mode is using the
            surface layer instead.
          </InlineNotice>
        ) : null}
        {loading ? <div className="loading-banner">Loading current pile dataset...</div> : null}
        {inspectionQuality?.kind === "numerical" && colorDomain?.mode === "adaptive-local" ? (
          <InlineNotice tone="info" title="View-scaled contrast active">
            The current visible cells occupy only a narrow slice of the selected inspection
            range, so the pile view is using a local color domain to keep voxel contrast readable.
          </InlineNotice>
        ) : null}
        {selectedTimeMode !== "property" ? (
          <InlineNotice tone="info" title="Material time mode active">
            The pile colors and distribution are using represented material timestamps relative
            to the current pile snapshot instead of a tracked quality.
          </InlineNotice>
        ) : null}
        <QualityLegend quality={inspectionQuality} numericDomain={colorDomain} />
        {dataset ? (
          <PileAnchorFrame
            inputs={dataset.inputs}
            outputs={dataset.outputs}
            showInFigureAnchors={dataset.dimension >= 2}
          >
            {content}
          </PileAnchorFrame>
        ) : (
          content
        )}
      </section>

      <aside className="panel">
        <div className="section-label">
          {isLiveVariant ? "Current dense pile reading" : "Current structure reading"}
        </div>
        <h3>{dataset?.displayName ?? selectedPileEntry?.displayName ?? "Selected pile"}</h3>
        <MetricGrid
          metrics={[
            { label: "Mass", value: dataset ? formatMassTon(totalMass) : "Pending" },
            { label: "Surface cells", value: dataset ? String(dataset.surfaceCellCount) : "Pending" },
            { label: "View", value: dataset ? (dataset.dimension === 3 ? viewMode : `${dataset.dimension}D`) : "Pending" },
            { label: "Rendered cells", value: String(visibleCellCount) },
          ]}
        />
        {isLiveVariant ? (
          <p className="muted-text">
            This subview stays on the current dense pile snapshot from 06_models.
            Use the stockpile route when you want structure-first interpretation,
            footprint use, and internal pile profile metrics.
          </p>
        ) : null}
        {dataset && !isLiveVariant ? <PileStructurePanel dataset={dataset} /> : null}
        {!isLiveVariant ? (
          <RouteBasisPanel
            source={dataset ? "Current pile dataset" : "Pending"}
            resolution={
              dataset
                ? `${dataset.dimension}D dense ${dataset.dimension === 3 ? "cells / voxels" : "cells"}`
                : "Pending"
            }
            timeBasis={dataset ? "Current pile snapshot" : "Pending"}
            note="Use the profiler route when you need historical summaries instead of the current dense inventory."
          />
        ) : null}
        <MaterialTimePanel summary={materialTimeSummary} />
        {viewMode === "full" && dataset?.dimension === 3 ? (
          <MetricGrid
            metrics={[
              { label: "Strategy", value: fullRenderPlan.strategy },
              {
                label: "Coverage",
                value: `${(fullRenderPlan.coverageRatio * 100).toFixed(1)}%`,
              },
              {
                label: "Sample stride",
                value: String(fullRenderPlan.stride),
              },
            ]}
          />
        ) : null}
        {massDistribution && inspectionQuality ? (
          <div className="inspector-stack">
            <div className="section-label">Mass distribution</div>
            <MassDistributionChart
              distribution={massDistribution}
              quality={inspectionQuality}
              subjectLabel={dataset?.displayName ?? "Selected pile"}
              recordLabel="cells"
            />
          </div>
        ) : null}
        {dataset ? (
          <ProfiledPropertiesPanel
            qualities={availableQualities}
            values={dataset.qualityAverages}
            records={dataset.cells}
            totalMassTon={totalMass}
          />
        ) : null}
        <CellFocusPanel
          hoveredCell={activeHoveredCell}
          qualities={availableQualities}
          selectedQuality={selectedQuality}
          emptyMessage="Hover a cell or voxel in the current pile view to inspect its coordinates, mass, and quality values."
        />
        {!isLiveVariant ? (
          <WorkspaceJumpLinks
            objectId={selectedPileId}
            objectType={selectedPileEntry?.objectType}
            isProfiled={selectedPileEntry?.isProfiled}
          />
        ) : null}
      </aside>
    </div>
  );
}
