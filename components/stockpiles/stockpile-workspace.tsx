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
import { buildAdaptiveFullRenderPlan } from "@/lib/stockpile-rendering";
import { InlineNotice } from "@/components/ui/inline-notice";
import { MetricGrid } from "@/components/ui/metric-grid";
import { QualityLegend } from "@/components/ui/quality-legend";
import { QualitySelector } from "@/components/ui/quality-selector";
import { QualityValueList } from "@/components/ui/quality-value-list";
import { WorkspaceJumpLinks } from "@/components/ui/workspace-jump-links";
import { PileAnchorFrame } from "@/components/stockpiles/pile-anchor-frame";
import { Pile3DCanvas } from "@/components/stockpiles/pile-3d-canvas";
import {
  PileColumnView,
  PileHeatmapView,
} from "@/components/stockpiles/pile-views";
import { formatMassTon, formatNumber, formatTimestamp } from "@/lib/format";
import {
  buildHrefWithQuery,
  resolveQuerySelection,
} from "@/lib/workspace-route-state";

interface StockpileWorkspaceProps {
  pileEntries: ObjectRegistryEntry[];
  qualities: QualityDefinition[];
  initialPileId: string;
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
}: StockpileWorkspaceProps) {
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
  const [selectedPileId, setSelectedPileId] = useState(initialSelectedPileId);
  const [dataset, setDataset] = useState<PileDataset | null>(null);
  const [selectedQualityId, setSelectedQualityId] = useState(initialSelectedQualityId);
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

  useEffect(() => {
    if (!selectedPileId) {
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
    if (!dataset || !selectedQuality || selectedQuality.kind !== "numerical") {
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
  }, [dataset, fullRenderPlan.cells, selectedQuality, sliceCells, viewMode]);

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
  const hoveredCellPropertyValue =
    activeHoveredCell && selectedQuality
      ? activeHoveredCell.qualityValues[selectedQuality.id]
      : null;

  let content: ReactNode;

  if (!dataset) {
    content = (
      <InlineNotice tone={loadError ? "error" : "info"} title="Stockpile dataset loads on demand">
        {loadError
          ? "Select the pile again after the dataset becomes available."
          : "Choose a stockpile to request its dense cell table only when this workspace needs it."}
      </InlineNotice>
    );
  } else if (dataset.dimension === 1) {
    content = (
      <PileColumnView
        cells={dataset.cells}
        quality={selectedQuality}
        numericDomain={colorDomain}
        onHoverCellChange={setHoveredCell}
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
        onHoverCellChange={setHoveredCell}
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
        onHoverCellChange={setHoveredCell}
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
        onHoverCellChange={setHoveredCell}
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
          onChange={handleSelectQuality}
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
        {loading ? <div className="loading-banner">Loading stockpile dataset...</div> : null}
        <QualityLegend quality={selectedQuality} numericDomain={colorDomain} />
        {dataset ? (
          <PileAnchorFrame inputs={dataset.inputs} outputs={dataset.outputs}>
            {content}
          </PileAnchorFrame>
        ) : (
          content
        )}
      </section>

      <aside className="panel">
        <div className="section-label">Dataset</div>
        <h3>{dataset?.displayName ?? selectedPileEntry?.displayName ?? "Selected pile"}</h3>
        <p className="muted-text">
          {dataset
            ? "Current view exposes normalized feed and reclaim anchors together with the selected property values for occupied cells."
            : "Dense pile content is requested after selection so the route can mount without preloading the full voxel table."}
        </p>
        <MetricGrid
          metrics={[
            { label: "Mass", value: dataset ? formatMassTon(totalMass) : "Pending" },
            { label: "Surface cells", value: dataset ? String(dataset.surfaceCellCount) : "Pending" },
            { label: "View", value: dataset ? (dataset.dimension === 3 ? viewMode : `${dataset.dimension}D`) : "Pending" },
            { label: "Rendered cells", value: String(visibleCellCount) },
          ]}
        />
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
        {dataset ? (
          <QualityValueList
            qualities={availableQualities}
            values={dataset.qualityAverages}
            limit={availableQualities.length}
          />
        ) : null}
        <div className="inspector-stack">
          <div className="section-label">Cell Focus</div>
          {activeHoveredCell ? (
            <>
              <MetricGrid
                metrics={[
                  {
                    label: "Indices",
                    value: `${activeHoveredCell.ix}, ${activeHoveredCell.iy}, ${activeHoveredCell.iz}`,
                  },
                  {
                    label: "Mass",
                    value: formatMassTon(activeHoveredCell.massTon),
                  },
                  {
                    label: selectedQuality?.label ?? "Property",
                    value:
                      hoveredCellPropertyValue === null
                        ? "N/A"
                        : formatNumber(hoveredCellPropertyValue),
                  },
                ]}
              />
              <QualityValueList
                qualities={availableQualities}
                values={activeHoveredCell.qualityValues}
                limit={Math.min(availableQualities.length, 6)}
              />
            </>
          ) : (
            <p className="muted-text">
              Hover a cell or voxel in the current pile view to inspect its coordinates,
              mass, and property values.
            </p>
          )}
        </div>
        <WorkspaceJumpLinks
          objectId={selectedPileId}
          objectType={selectedPileEntry?.objectType}
          isProfiled={selectedPileEntry?.isProfiled}
        />
      </aside>
    </div>
  );
}
