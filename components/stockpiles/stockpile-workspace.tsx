"use client";

import { startTransition, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import type {
  ObjectRegistryEntry,
  PileDataset,
  QualityDefinition,
  StockpileViewMode,
} from "@/types/app-data";
import { MetricGrid } from "@/components/ui/metric-grid";
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
    initialDataset.dimension === 3 ? "surface" : initialDataset.viewModes[0] ?? "full",
  );
  const [sliceAxis, setSliceAxis] = useState<SliceAxis>("z");
  const [sliceIndex, setSliceIndex] = useState(0);
  const [loading, setLoading] = useState(false);

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
          throw new Error("Failed to load stockpile dataset.");
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
          setViewMode(payload.dimension === 3 ? "surface" : payload.viewModes[0] ?? "full");
          setSliceIndex(0);
        });
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

  const renderedFullCells = useMemo(() => {
    if (dataset.cells.length <= dataset.fullModeThreshold) {
      return dataset.cells;
    }

    return dataset.cells.filter(
      (_, index) => index % Math.max(1, dataset.suggestedFullStride) === 0,
    );
  }, [dataset.cells, dataset.fullModeThreshold, dataset.suggestedFullStride]);

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

  let content: ReactNode;

  if (dataset.dimension === 1) {
    content = <PileColumnView cells={dataset.cells} quality={selectedQuality} />;
  } else if (dataset.dimension === 2) {
    content = (
      <PileHeatmapView
        cells={dataset.cells}
        quality={selectedQuality}
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
          : renderedFullCells;

    content = (
      <Pile3DCanvas cells={cells} extents={dataset.extents} quality={selectedQuality} />
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
        {viewMode === "full" && dataset.cells.length > dataset.fullModeThreshold ? (
          <div className="notice-card">
            <AlertTriangle size={16} />
            <span>
              Full mode is using an adaptive stride of {dataset.suggestedFullStride} for this
              dataset to keep local rendering responsive.
            </span>
          </div>
        ) : null}
        {loading ? <div className="loading-banner">Loading stockpile dataset...</div> : null}
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
          ]}
        />
        <QualityValueList
          qualities={availableQualities}
          values={dataset.qualityAverages}
          limit={availableQualities.length}
        />
      </aside>
    </div>
  );
}
