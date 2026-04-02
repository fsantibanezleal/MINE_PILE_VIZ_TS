"use client";

import { startTransition, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  ObjectRegistryEntry,
  PileDataset,
  QualityDefinition,
  StockpileViewMode,
} from "@/types/app-data";
import { deriveNumericColorDomain } from "@/lib/color";
import { buildAdaptiveFullRenderPlan } from "@/lib/stockpile-rendering";
import { InlineNotice } from "@/components/ui/inline-notice";
import { MetricGrid } from "@/components/ui/metric-grid";
import { QualityLegend } from "@/components/ui/quality-legend";
import { QualitySelector } from "@/components/ui/quality-selector";
import { QualityValueList } from "@/components/ui/quality-value-list";
import { Pile3DCanvas } from "@/components/stockpiles/pile-3d-canvas";
import {
  PileColumnView,
  PileHeatmapView,
} from "@/components/stockpiles/pile-views";
import { formatMassTon, formatTimestamp } from "@/lib/format";

interface StockpileWorkspaceProps {
  pileEntries: ObjectRegistryEntry[];
  qualities: QualityDefinition[];
  initialDataset: PileDataset;
}

type SliceAxis = "x" | "y" | "z";

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
  initialDataset,
}: StockpileWorkspaceProps) {
  const [selectedPileId, setSelectedPileId] = useState(initialDataset.objectId);
  const [dataset, setDataset] = useState(initialDataset);
  const [selectedQualityId, setSelectedQualityId] = useState(
    initialDataset.defaultQualityId,
  );
  const [viewMode, setViewMode] = useState<StockpileViewMode>(
    getDefaultViewMode(initialDataset),
  );
  const [sliceAxis, setSliceAxis] = useState<SliceAxis>("z");
  const [sliceIndex, setSliceIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const availableQualities = qualities.filter((quality) =>
    dataset.availableQualityIds.includes(quality.id),
  );
  const totalMass = dataset.cells.reduce((sum, cell) => sum + cell.massTon, 0);
  const effectiveQualityId =
    availableQualities.find((quality) => quality.id === selectedQualityId)?.id ??
    availableQualities[0]?.id ??
    "";
  const selectedQuality = availableQualities.find(
    (quality) => quality.id === effectiveQualityId,
  );

  function handleSelectPile(nextPileId: string) {
    if (nextPileId !== dataset.objectId) {
      setLoading(true);
      setLoadError(null);
    }

    setSelectedPileId(nextPileId);
  }

  useEffect(() => {
    if (selectedPileId === dataset.objectId) {
      return;
    }

    let cancelled = false;

    fetch(`/api/stockpiles/${selectedPileId}`)
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
            payload?.error?.message ?? "Failed to load stockpile dataset.",
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
          setSelectedQualityId(payload.defaultQualityId);
          setViewMode(getDefaultViewMode(payload));
          setSliceIndex(0);
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load stockpile dataset.",
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
  }, [dataset.objectId, selectedPileId]);

  const fullRenderPlan = useMemo(
    () =>
      buildAdaptiveFullRenderPlan({
        cells: dataset.cells,
        surfaceCells: dataset.surfaceCells,
        threshold: dataset.fullModeThreshold,
        suggestedStride: dataset.suggestedFullStride,
      }),
    [
      dataset.cells,
      dataset.fullModeThreshold,
      dataset.suggestedFullStride,
      dataset.surfaceCells,
    ],
  );

  const sliceMax = Math.max(
    0,
    sliceAxis === "x"
      ? dataset.extents.x - 1
      : sliceAxis === "y"
        ? dataset.extents.y - 1
        : dataset.extents.z - 1,
  );
  const effectiveSliceIndex = Math.min(sliceIndex, sliceMax);

  const sliceCells = useMemo(() => {
    return dataset.cells.filter((cell) => {
      if (sliceAxis === "x") {
        return cell.ix === effectiveSliceIndex;
      }

      if (sliceAxis === "y") {
        return cell.iy === effectiveSliceIndex;
      }

      return cell.iz === effectiveSliceIndex;
    });
  }, [dataset.cells, effectiveSliceIndex, sliceAxis]);
  const visibleCellCount =
    dataset.dimension === 3
      ? viewMode === "surface"
        ? dataset.surfaceCells.length
        : viewMode === "shell"
          ? (dataset.shellCells.length > 0 ? dataset.shellCells : dataset.surfaceCells).length
          : viewMode === "slice"
            ? sliceCells.length
            : fullRenderPlan.renderedCellCount
      : dataset.cells.length;
  const colorDomain = useMemo(() => {
    if (!selectedQuality || selectedQuality.kind !== "numerical") {
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
      cellsForDomain.map((cell) => cell.qualityValues[selectedQuality.id]),
      selectedQuality,
    );
  }, [
    dataset.cells,
    dataset.dimension,
    dataset.shellCells,
    dataset.surfaceCells,
    fullRenderPlan.cells,
    selectedQuality,
    sliceCells,
    viewMode,
  ]);

  let content: ReactNode;

  if (dataset.dimension === 1) {
    content = (
      <PileColumnView
        cells={dataset.cells}
        quality={selectedQuality}
        numericDomain={colorDomain}
      />
    );
  } else if (dataset.dimension === 2) {
    content = (
      <PileHeatmapView
        cells={dataset.cells}
        quality={selectedQuality}
        numericDomain={colorDomain}
        columns={dataset.extents.x}
        rows={dataset.extents.y}
        xAccessor={(cell) => cell.ix}
        yAccessor={(cell) => cell.iy}
      />
    );
  } else if (viewMode === "slice") {
    content = (
      <PileHeatmapView
        cells={sliceCells}
        quality={selectedQuality}
        numericDomain={colorDomain}
        columns={sliceAxis === "y" ? dataset.extents.x : dataset.extents.y}
        rows={sliceAxis === "z" ? dataset.extents.y : dataset.extents.z}
        xAccessor={(cell) => (sliceAxis === "y" ? cell.ix : cell.iy)}
        yAccessor={(cell) => (sliceAxis === "z" ? cell.iy : cell.iz)}
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
        key={`${dataset.objectId}:${viewMode}:${effectiveQualityId}`}
        cells={cells}
        extents={dataset.extents}
        quality={selectedQuality}
        numericDomain={colorDomain}
      />
    );
  }

  return (
    <div className="workspace-grid workspace-grid--triple">
      <aside className="panel">
        <div className="section-label">Selection</div>
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
          label="Property"
          qualities={availableQualities}
          value={effectiveQualityId}
          onChange={setSelectedQualityId}
        />
        {dataset.dimension === 3 ? (
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
            { label: "Dimension", value: `${dataset.dimension}D` },
            { label: "Occupied cells", value: String(dataset.occupiedCellCount) },
            { label: "Timestamp", value: formatTimestamp(dataset.timestamp) },
          ]}
        />
      </aside>

      <section className="panel panel--canvas">
        {loadError ? (
          <InlineNotice tone="error" title="Stockpile dataset unavailable">
            {loadError}
          </InlineNotice>
        ) : null}
        {viewMode === "full" && fullRenderPlan.strategy === "adaptive" ? (
          <InlineNotice tone="warning" title="Adaptive full mode active">
            Rendering uses surface cells, base footprint cells, and stride-sampled interior
            cells at stride {fullRenderPlan.stride} to keep dense local views responsive.
          </InlineNotice>
        ) : null}
        {dataset.dimension === 3 && viewMode !== "full" ? (
          <InlineNotice tone="info" title="Interior voxels are not fully exposed in this mode">
            {viewMode === "surface"
              ? "Surface mode colors only the currently visible outer layer. Switch to full mode to paint every occupied voxel when the dataset size allows it."
              : viewMode === "shell"
                ? "Shell mode colors the exposed envelope of the pile. Switch to full mode to paint every occupied voxel when you need the full internal content."
                : "Slice mode colors only the active cross-section. Switch to full mode to paint every occupied voxel across the full pile."}
          </InlineNotice>
        ) : null}
        {viewMode === "shell" && dataset.shellCells.length === 0 && dataset.surfaceCells.length > 0 ? (
          <InlineNotice tone="info" title="Shell artifact unavailable">
            This dataset does not expose a dedicated shell layer, so shell mode is using the
            surface layer instead.
          </InlineNotice>
        ) : null}
        {loading ? <div className="loading-banner">Loading stockpile dataset...</div> : null}
        <QualityLegend quality={selectedQuality} numericDomain={colorDomain} />
        {content}
      </section>

      <aside className="panel">
        <div className="section-label">Dataset</div>
        <h3>{dataset.displayName}</h3>
        <p className="muted-text">
          Current view exposes normalized feed and reclaim anchors together with the selected
          property values for occupied cells.
        </p>
        <MetricGrid
          metrics={[
            { label: "Mass", value: formatMassTon(totalMass) },
            { label: "Surface cells", value: String(dataset.surfaceCellCount) },
            { label: "View", value: dataset.dimension === 3 ? viewMode : `${dataset.dimension}D` },
            { label: "Rendered cells", value: String(visibleCellCount) },
          ]}
        />
        {viewMode === "full" && dataset.dimension === 3 ? (
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
        <QualityValueList
          qualities={availableQualities}
          values={dataset.qualityAverages}
          limit={availableQualities.length}
        />
      </aside>
    </div>
  );
}
