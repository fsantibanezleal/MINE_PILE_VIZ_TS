"use client";

import { startTransition, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  CircuitGraph,
  PileCellRecord,
  ProfilerIndex,
  ProfilerSnapshot,
  ProfilerSummaryRow,
  QualityDefinition,
} from "@/types/app-data";
import { deriveNumericColorDomain } from "@/lib/color";
import { deriveCellExtents } from "@/lib/data-stats";
import { MassDistributionChart } from "@/components/ui/mass-distribution-chart";
import { buildMassDistribution } from "@/lib/mass-distribution";
import { getProfilerSemanticFrame } from "@/lib/profiler-semantics";
import { CellFocusPanel } from "@/components/ui/cell-focus-panel";
import { InlineNotice } from "@/components/ui/inline-notice";
import { MaterialTimePanel } from "@/components/ui/material-time-panel";
import { MaterialTimeModeSelector } from "@/components/ui/material-time-mode-selector";
import { MetricGrid } from "@/components/ui/metric-grid";
import { ProfiledPropertiesPanel } from "@/components/ui/profiled-properties-panel";
import { ProfilerDeltaPanel } from "@/components/ui/profiler-delta-panel";
import { ProfilerHistoryPanel } from "@/components/ui/profiler-history-panel";
import { ProfilerQualitySeriesPanel } from "@/components/ui/profiler-quality-series-panel";
import { QualityLegend } from "@/components/ui/quality-legend";
import { QualitySelector } from "@/components/ui/quality-selector";
import { RouteBasisPanel } from "@/components/ui/route-basis-panel";
import { VerticalCompressionControl } from "@/components/ui/vertical-compression-control";
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

interface ProfilerWorkspaceProps {
  graph: CircuitGraph;
  index: ProfilerIndex;
  qualities: QualityDefinition[];
}

function isSameCell(left: PileCellRecord, right: PileCellRecord) {
  return left.ix === right.ix && left.iy === right.iy && left.iz === right.iz;
}

function getExtents(rows: ProfilerSnapshot["rows"]) {
  return deriveCellExtents(rows);
}

export function ProfilerWorkspace({
  graph,
  index,
  qualities,
}: ProfilerWorkspaceProps) {
  const materialTimeModes: MaterialTimeMode[] = [
    "property",
    "oldest-age",
    "newest-age",
    "material-span",
  ];
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialObjectId = resolveQuerySelection(
    searchParams.get("object"),
    index.objects.map((entry) => entry.objectId),
    index.defaultObjectId,
  );
  const initialQualityId = resolveQuerySelection(
    searchParams.get("quality"),
    qualities.map((quality) => quality.id),
    qualities[0]?.id ?? "",
  );
  const initialTimeMode = resolveQuerySelection(
    searchParams.get("timemode"),
    materialTimeModes,
    "property",
  ) as MaterialTimeMode;
  const initialObjectIdRef = useRef(initialObjectId);
  const [selectedObjectId, setSelectedObjectId] = useState(initialObjectId);
  const [selectedQualityId, setSelectedQualityId] = useState(initialQualityId);
  const [selectedTimeMode, setSelectedTimeMode] = useState(initialTimeMode);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState("");
  const [verticalCompressionFactor, setVerticalCompressionFactor] = useState(1);
  const [summaryRows, setSummaryRows] = useState<ProfilerSummaryRow[]>([]);
  const [detailSnapshot, setDetailSnapshot] = useState<ProfilerSnapshot | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<PileCellRecord | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/profiler/summary")
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
            payload?.error?.message ?? "Failed to load profiler summaries.",
          );
        }

        return (await response.json()) as ProfilerSummaryRow[];
      })
      .then((payload) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setSummaryRows(payload);
          setLoadingDetail(payload.some((row) => row.objectId === initialObjectIdRef.current));
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSummaryError(
            error instanceof Error
              ? error.message
              : "Failed to load profiler summaries.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSummary(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedObjectRows = useMemo(
    () =>
      summaryRows
        .filter((row) => row.objectId === selectedObjectId)
        .sort((left, right) => left.timestamp.localeCompare(right.timestamp)),
    [selectedObjectId, summaryRows],
  );
  const latestSnapshotId =
    selectedObjectRows[selectedObjectRows.length - 1]?.snapshotId ?? "";
  const effectiveSnapshotId = selectedObjectRows.some(
    (row) => row.snapshotId === selectedSnapshotId,
  )
    ? selectedSnapshotId
    : latestSnapshotId;

  const selectedIndexEntry = index.objects.find((entry) => entry.objectId === selectedObjectId);
  const selectedGraphNode = graph.nodes.find((node) => node.objectId === selectedObjectId);
  const selectedSummaryRow = selectedObjectRows.find(
    (row) => row.snapshotId === effectiveSnapshotId,
  );
  const selectedQuality =
    qualities.find((quality) => quality.id === selectedQualityId) ?? qualities[0];
  const inspectionQuality =
    selectedTimeMode === "property"
      ? selectedQuality
      : getMaterialTimeDefinition(selectedTimeMode);

  function handleSelectObject(nextObjectId: string) {
    if (!index.objects.some((entry) => entry.objectId === nextObjectId)) {
      return;
    }

    setLoadingDetail(true);
    setDetailError(null);
    setDetailSnapshot(null);
    setHoveredCell(null);
    setSelectedObjectId(nextObjectId);
    setSelectedSnapshotId("");
    router.replace(
      buildHrefWithQuery(pathname, searchParams, {
        object: nextObjectId,
      }),
      {
        scroll: false,
      },
    );
  }

  function handleSelectQuality(nextQualityId: string) {
    setHoveredCell(null);
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
    setHoveredCell(null);
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
    if (!playing || selectedObjectRows.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setSelectedSnapshotId((current) => {
        const currentIndex = selectedObjectRows.findIndex(
          (row) => row.snapshotId === current,
        );
        const nextIndex = currentIndex >= selectedObjectRows.length - 1 ? 0 : currentIndex + 1;
        setHoveredCell(null);
        setLoadingDetail(true);
        return selectedObjectRows[nextIndex]?.snapshotId ?? current;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [playing, selectedObjectRows]);

  useEffect(() => {
    if (!effectiveSnapshotId) {
      return;
    }

    let cancelled = false;

    fetch(`/api/profiler/objects/${selectedObjectId}/snapshots/${effectiveSnapshotId}`)
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
            payload?.error?.message ?? "Failed to load profiler snapshot.",
          );
        }

        return (await response.json()) as ProfilerSnapshot;
      })
      .then((payload) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setDetailSnapshot(payload);
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDetailError(
            error instanceof Error
              ? error.message
              : "Failed to load profiler snapshot.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDetail(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveSnapshotId, selectedObjectId]);

  const semanticFrame = getProfilerSemanticFrame("detail", detailSnapshot
    ? {
        objectType: detailSnapshot.objectType,
        dimension: detailSnapshot.dimension,
      }
    : selectedIndexEntry
      ? {
          objectType: selectedIndexEntry.objectType,
          dimension: selectedIndexEntry.dimension,
        }
      : null);
  const detailExtents = detailSnapshot ? getExtents(detailSnapshot.rows) : { x: 1, y: 1, z: 1 };
  const snapshotIndex = selectedObjectRows.findIndex(
    (row) => row.snapshotId === effectiveSnapshotId,
  );
  const selectedStepLabel =
    snapshotIndex >= 0 && selectedObjectRows.length > 0
      ? `${snapshotIndex + 1}/${selectedObjectRows.length}`
      : "N/A";

  function handleSelectSnapshot(nextSnapshotId: string) {
    if (!selectedObjectRows.some((row) => row.snapshotId === nextSnapshotId)) {
      return;
    }

    setSelectedSnapshotId(nextSnapshotId);
    setHoveredCell(null);
    setLoadingDetail(true);
    setDetailError(null);
  }

  const inspectionValueAccessor = useMemo(
    () =>
      selectedTimeMode === "property"
        ? undefined
        : (row: PileCellRecord) =>
            getMaterialTimeValue(
              row,
              selectedTimeMode,
              selectedSummaryRow?.timestamp ?? detailSnapshot?.timestamp,
            ),
    [detailSnapshot?.timestamp, selectedSummaryRow?.timestamp, selectedTimeMode],
  );
  const detailColorDomain = useMemo(() => {
    if (!detailSnapshot || !inspectionQuality || inspectionQuality.kind !== "numerical") {
      return undefined;
    }

    return deriveNumericColorDomain(
      detailSnapshot.rows.map((row) => {
        const value = inspectionValueAccessor
          ? inspectionValueAccessor(row)
          : row.qualityValues[inspectionQuality.id];
        return typeof value === "number" ? value : null;
      }),
      inspectionQuality,
    );
  }, [detailSnapshot, inspectionQuality, inspectionValueAccessor]);
  const activeHoveredCell =
    hoveredCell &&
    detailSnapshot?.rows.some((row) => isSameCell(row, hoveredCell))
      ? hoveredCell
      : null;
  const detailDistribution = useMemo(
    () =>
      detailSnapshot && inspectionQuality
        ? buildMassDistribution(detailSnapshot.rows, inspectionQuality, {
            valueAccessor: inspectionValueAccessor,
          })
        : null,
    [detailSnapshot, inspectionQuality, inspectionValueAccessor],
  );
  const materialTimeSummary = useMemo(
    () =>
      detailSnapshot
        ? buildMaterialTimeSummary(
            detailSnapshot.rows,
            selectedSummaryRow?.timestamp ?? detailSnapshot.timestamp,
          )
        : null,
    [detailSnapshot, selectedSummaryRow?.timestamp],
  );

  let detailView: ReactNode = null;

  if (detailSnapshot) {
    if (detailSnapshot.dimension === 1) {
      detailView = (
        <PileColumnView
          cells={detailSnapshot.rows}
          quality={inspectionQuality}
          numericDomain={detailColorDomain}
          onHoverCellChange={setHoveredCell}
          valueAccessor={inspectionValueAccessor}
        />
      );
    } else if (detailSnapshot.dimension === 2) {
      detailView = (
        <PileHeatmapView
          cells={detailSnapshot.rows}
          quality={inspectionQuality}
          numericDomain={detailColorDomain}
          columns={detailExtents.x}
          rows={detailExtents.y}
          xAccessor={(cell) => cell.ix}
          yAccessor={(cell) => cell.iy}
          onHoverCellChange={setHoveredCell}
          valueAccessor={inspectionValueAccessor}
        />
      );
    } else {
      detailView = (
        <Pile3DCanvas
          key={`${detailSnapshot.objectId}:${detailSnapshot.snapshotId}:${selectedQuality?.id ?? "none"}:${selectedTimeMode}`}
          cells={detailSnapshot.rows}
          extents={detailExtents}
          quality={inspectionQuality}
          numericDomain={detailColorDomain}
          onHoverCellChange={setHoveredCell}
          valueAccessor={inspectionValueAccessor}
          verticalCompressionFactor={verticalCompressionFactor}
        />
      );
    }

    if (detailSnapshot.objectType === "pile" && selectedGraphNode) {
      detailView = (
        <PileAnchorFrame
          inputs={selectedGraphNode.inputs}
          outputs={selectedGraphNode.outputs}
          showInFigureAnchors={detailSnapshot.dimension >= 2}
        >
          {detailView}
        </PileAnchorFrame>
      );
    }
  }

  return (
    <div className="workspace-grid workspace-grid--double">
      <aside className="panel">
        <div className="section-label">Profiled object and time</div>
        <label className="field">
          <span>Object</span>
          <select
            value={selectedObjectId}
            onChange={(event) => handleSelectObject(event.target.value)}
          >
            {index.objects.map((entry) => (
              <option key={entry.objectId} value={entry.objectId}>
                {entry.displayName}
              </option>
            ))}
          </select>
        </label>
        <QualitySelector
          label="Tracked quality"
          qualities={qualities}
          value={selectedQuality?.id ?? ""}
          onChange={handleSelectQuality}
        />
        <MaterialTimeModeSelector
          value={selectedTimeMode}
          onChange={handleSelectTimeMode}
          label="Snapshot coloring"
        />
        {detailSnapshot?.dimension === 3 ? (
          <VerticalCompressionControl
            value={verticalCompressionFactor}
            onChange={setVerticalCompressionFactor}
          />
        ) : null}
        <label className="field">
          <span>Snapshot</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, selectedObjectRows.length - 1)}
            value={Math.max(0, snapshotIndex)}
            onChange={(event) => {
              const nextRow = selectedObjectRows[Number(event.target.value)];
              handleSelectSnapshot(nextRow?.snapshotId ?? "");
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
        <MetricGrid
          metrics={[
            {
              label: "Snapshots",
              value: String(selectedObjectRows.length),
            },
            {
              label: "Selected step",
              value: selectedStepLabel,
            },
            {
              label: "Current snapshot",
              value: effectiveSnapshotId || "N/A",
            },
            {
              label: "Current mass",
              value: selectedSummaryRow ? formatMassTon(selectedSummaryRow.massTon) : "N/A",
            },
          ]}
        />
        <RouteBasisPanel
          source={semanticFrame.source}
          resolution={semanticFrame.resolution}
          timeBasis={effectiveSnapshotId ? "Selected historical profiler timestep" : "Pending"}
          note="This route is object-and-time first. It does not redraw the whole circuit; it keeps one profiled object in view while historical quality and mass context are navigated through stored profiler snapshots."
        />
        <ProfilerHistoryPanel
          rows={selectedObjectRows}
          selectedSnapshotId={effectiveSnapshotId}
          onSelectSnapshot={handleSelectSnapshot}
        />
        <ProfilerDeltaPanel
          rows={selectedObjectRows}
          selectedSnapshotId={effectiveSnapshotId}
          quality={selectedQuality}
        />
      </aside>

      <section className="panel panel--canvas panel--stack">
        {summaryError ? (
          <InlineNotice tone="error" title="Profiler summary unavailable">
            {summaryError}
          </InlineNotice>
        ) : null}
        {detailError ? (
          <InlineNotice tone="error" title="Profiler snapshot unavailable">
            {detailError}
          </InlineNotice>
        ) : null}
        {loadingSummary ? <div className="loading-banner">Loading profiler history...</div> : null}
        {loadingDetail ? <div className="loading-banner">Loading profiler snapshot...</div> : null}
        {inspectionQuality?.kind === "numerical" && detailColorDomain?.mode === "adaptive-local" ? (
          <InlineNotice tone="info" title="View-scaled contrast active">
            The active summarized snapshot is using a local color domain so the
            visible rows, bands, or cells keep enough contrast for inspection.
          </InlineNotice>
        ) : null}
        {selectedTimeMode !== "property" ? (
          <InlineNotice tone="info" title="Material time coloring active">
            The object view and mass distribution are using represented material
            timestamps relative to the selected historical snapshot. The time
            series below still follows the selected tracked quality.
          </InlineNotice>
        ) : null}
        <div className="belt-strip-panel">
          <div className="section-label">Historical object content</div>
          <h3>
            {selectedSummaryRow?.displayName ?? detailSnapshot?.displayName ?? "Selected object"}
          </h3>
          <p className="muted-text">
            Summarized profiler content for the selected object at one stored
            timestep. The figure below is historical summary, not dense current
            state from the live route.
          </p>
          <QualityLegend quality={inspectionQuality} numericDomain={detailColorDomain} />
          {detailView ?? (
            <InlineNotice tone="info" title="No profiler detail snapshot available">
              Select a profiled object and snapshot to inspect its summarized
              historical rows, bands, or cells.
            </InlineNotice>
          )}
        </div>
        <ProfilerQualitySeriesPanel
          rows={selectedObjectRows}
          selectedSnapshotId={effectiveSnapshotId}
          quality={selectedQuality}
          onSelectSnapshot={handleSelectSnapshot}
        />
        <details className="inspector-stack inspector-stack--collapsed-context" open>
          <summary className="section-label">Selected snapshot evidence</summary>
          <p className="muted-text">
            Open this section to inspect the selected historical snapshot through
            mass distribution, represented material time, profiled qualities, and
            hovered summary rows, bands, or cells.
          </p>
          <MetricGrid
            metrics={[
              {
                label: "Timestamp",
                value: selectedSummaryRow
                  ? formatTimestamp(selectedSummaryRow.timestamp)
                  : "N/A",
              },
              {
                label: "Object basis",
                value: semanticFrame.aggregationLabel,
              },
              {
                label: "Density",
                value: semanticFrame.densityLabel,
              },
            ]}
          />
          <MaterialTimePanel
            summary={materialTimeSummary}
            emptyMessage="No valid represented-material timestamps are available for the active profiler snapshot."
          />
          {detailDistribution && inspectionQuality ? (
            <div className="inspector-stack">
              <div className="section-label">Mass distribution</div>
              <MassDistributionChart
                distribution={detailDistribution}
                quality={inspectionQuality}
                subjectLabel={
                  selectedSummaryRow?.displayName ??
                  detailSnapshot?.displayName ??
                  "Selected object"
                }
                recordLabel={semanticFrame.recordLabel}
              />
            </div>
          ) : null}
          {selectedSummaryRow ? (
            <ProfiledPropertiesPanel
              qualities={qualities}
              values={selectedSummaryRow.qualityValues}
              records={detailSnapshot?.rows ?? null}
              totalMassTon={selectedSummaryRow.massTon}
            />
          ) : null}
          <CellFocusPanel
            hoveredCell={activeHoveredCell}
            qualities={qualities}
            selectedQuality={selectedQuality}
            emptyMessage="Hover a summary row, band, or cell in the active profiler view to inspect its coordinates, mass, and quality values."
          />
          <WorkspaceJumpLinks
            objectId={selectedObjectId}
            objectType={selectedIndexEntry?.objectType}
            isProfiled
          />
        </details>
      </section>
    </div>
  );
}
