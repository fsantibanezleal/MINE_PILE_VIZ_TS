"use client";

import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  CircuitGraph,
  ObjectSummary,
  PileCellRecord,
  ProfilerIndex,
  ProfilerSnapshot,
  ProfilerSummaryRow,
  QualityDefinition,
} from "@/types/app-data";
import { CircuitFlow } from "@/components/circuit/circuit-flow";
import { deriveNumericColorDomain } from "@/lib/color";
import { deriveCellExtents } from "@/lib/data-stats";
import { MassDistributionChart } from "@/components/ui/mass-distribution-chart";
import { buildMassDistribution } from "@/lib/mass-distribution";
import {
  getProfilerSemanticFrame,
  type ProfilerMode,
} from "@/lib/profiler-semantics";
import { CellFocusPanel } from "@/components/ui/cell-focus-panel";
import { InlineNotice } from "@/components/ui/inline-notice";
import { MaterialTimePanel } from "@/components/ui/material-time-panel";
import { MaterialTimeModeSelector } from "@/components/ui/material-time-mode-selector";
import { MetricGrid } from "@/components/ui/metric-grid";
import { ProfiledPropertiesPanel } from "@/components/ui/profiled-properties-panel";
import { ProfilerDeltaPanel } from "@/components/ui/profiler-delta-panel";
import { ProfilerHistoryPanel } from "@/components/ui/profiler-history-panel";
import { QualityLegend } from "@/components/ui/quality-legend";
import { QualitySelector } from "@/components/ui/quality-selector";
import { RelationshipPanel } from "@/components/ui/relationship-panel";
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
  const [mode, setMode] = useState<ProfilerMode>("circuit");
  const [selectedObjectId, setSelectedObjectId] = useState(initialObjectId);
  const [selectedQualityId, setSelectedQualityId] = useState(initialQualityId);
  const [selectedTimeMode, setSelectedTimeMode] = useState(initialTimeMode);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState("");
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

  const selectedSummaryRow = selectedObjectRows.find(
    (row) => row.snapshotId === effectiveSnapshotId,
  );
  const firstObjectRow = selectedObjectRows[0];
  const lastObjectRow = selectedObjectRows[selectedObjectRows.length - 1];
  const currentTimestamp = selectedSummaryRow?.timestamp;
  const circuitSummaries: ObjectSummary[] = summaryRows
    .filter((row) => row.timestamp === currentTimestamp)
    .map((row) => ({
      objectId: row.objectId,
      objectType: row.objectType,
      displayName: row.displayName,
      timestamp: row.timestamp,
      massTon: row.massTon,
      status: "Profile snapshot",
      qualityValues: row.qualityValues,
    }));
  const availableQualities = qualities.filter((quality) =>
    circuitSummaries.some((row) => quality.id in row.qualityValues),
  );
  const selectedQuality =
    availableQualities.find((quality) => quality.id === selectedQualityId) ??
    availableQualities[0];
  const inspectionQuality =
    selectedTimeMode === "property"
      ? selectedQuality
      : getMaterialTimeDefinition(selectedTimeMode);
  const selectedIndexEntry = index.objects.find((entry) => entry.objectId === selectedObjectId);
  const selectedGraphNode = graph.nodes.find((node) => node.objectId === selectedObjectId);
  const semanticFrame = getProfilerSemanticFrame(
    mode,
    detailSnapshot
      ? {
          objectType: detailSnapshot.objectType,
          dimension: detailSnapshot.dimension,
        }
      : selectedIndexEntry
        ? {
            objectType: selectedIndexEntry.objectType,
            dimension: selectedIndexEntry.dimension,
          }
        : null,
  );

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

  const detailExtents = detailSnapshot ? getExtents(detailSnapshot.rows) : { x: 1, y: 1, z: 1 };
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
    <div className="workspace-grid workspace-grid--triple">
      <aside className="panel">
        <div className="section-label">Playback</div>
        <div className="button-row">
          <button
            type="button"
            className={`segmented-button ${mode === "circuit" ? "segmented-button--active" : ""}`}
            onClick={() => setMode("circuit")}
          >
            Circuit
          </button>
          <button
            type="button"
            className={`segmented-button ${mode === "detail" ? "segmented-button--active" : ""}`}
            onClick={() => setMode("detail")}
          >
            Detail
          </button>
        </div>
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
          label="Property"
          qualities={availableQualities}
          value={selectedQuality?.id ?? ""}
          onChange={handleSelectQuality}
        />
        <MaterialTimeModeSelector
          value={selectedTimeMode}
          onChange={handleSelectTimeMode}
          label="Inspection mode"
        />
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
      </aside>

      <section className="panel panel--canvas">
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
        {mode === "detail" &&
        inspectionQuality?.kind === "numerical" &&
        detailColorDomain?.mode === "adaptive-local" ? (
          <InlineNotice tone="info" title="View-scaled contrast active">
            The active profiler detail snapshot is using a local color domain so the visible
            pile or belt cells keep enough contrast for inspection.
          </InlineNotice>
        ) : null}
        {mode === "detail" && selectedTimeMode !== "property" ? (
          <InlineNotice tone="info" title="Material time mode active">
            The profiler detail colors and histogram are using represented material timestamps
            relative to the selected historical snapshot instead of a tracked property.
          </InlineNotice>
        ) : null}
        {mode === "detail" ? (
          <QualityLegend quality={inspectionQuality} numericDomain={detailColorDomain} />
        ) : null}
        {mode === "circuit" ? (
          <CircuitFlow
            graph={graph}
            summaries={circuitSummaries}
            selectedObjectId={selectedObjectId}
            onSelect={handleSelectObject}
          />
        ) : detailView ?? (
          <InlineNotice tone="info" title="No profiler detail snapshot available">
            Select a profiled object and snapshot to inspect its aggregated detail view.
          </InlineNotice>
        )}
      </section>

      <aside className="panel">
        <div className="section-label">
          {mode === "circuit" ? "Historical circuit reading" : "Historical detail snapshot"}
        </div>
        <h3>
          {selectedSummaryRow?.displayName ?? detailSnapshot?.displayName ?? "Selected object"}
        </h3>
        <MetricGrid
          metrics={[
            {
              label: "Timestamp",
              value: selectedSummaryRow
                ? formatTimestamp(selectedSummaryRow.timestamp)
                : "N/A",
            },
            {
              label: "Mass",
              value: selectedSummaryRow
                ? formatMassTon(selectedSummaryRow.massTon)
                : "N/A",
            },
            {
              label: "Snapshot",
              value: effectiveSnapshotId || "N/A",
            },
          ]}
        />
        <RouteBasisPanel
          source={semanticFrame.source}
          resolution={semanticFrame.resolution}
          timeBasis={effectiveSnapshotId ? "Selected historical timestep" : "Pending"}
          note={semanticFrame.note}
        />
        <ProfilerHistoryPanel
          rows={selectedObjectRows}
          selectedSnapshotId={effectiveSnapshotId}
          mode={mode}
          onSelectSnapshot={handleSelectSnapshot}
        />
        <ProfilerDeltaPanel
          rows={selectedObjectRows}
          selectedSnapshotId={effectiveSnapshotId}
          quality={selectedTimeMode === "property" ? selectedQuality : undefined}
        />
        <MetricGrid
          metrics={[
            {
              label: "Summary rows",
              value: loadingSummary ? "Loading" : String(summaryRows.length),
            },
            { label: "Snapshots", value: String(selectedObjectRows.length) },
            { label: "Selected step", value: selectedStepLabel },
            { label: semanticFrame.basisLabel, value: semanticFrame.aggregationLabel },
            { label: "Density", value: semanticFrame.densityLabel },
          ]}
        />
        {mode === "circuit" ? (
          <RelationshipPanel
            title="History coverage"
            summary="Circuit mode is for comparing one selected historical timestep across the profiled circuit, not for dense object inspection."
            metrics={[
              {
                label: "First snapshot",
                value: firstObjectRow ? formatTimestamp(firstObjectRow.timestamp) : "N/A",
              },
              {
                label: "Last snapshot",
                value: lastObjectRow ? formatTimestamp(lastObjectRow.timestamp) : "N/A",
              },
              {
                label: "Objects at step",
                value: String(circuitSummaries.length),
              },
            ]}
            groups={[
              {
                label: "Objects at selected timestep",
                items: circuitSummaries.map((row) => row.displayName),
              },
            ]}
          />
        ) : null}
        {mode !== "detail" ? (
          <InlineNotice tone="info" title="Detail-only inspection panels">
            Switch to detail mode when you need summarized rows, bands, or cells, plus
            material-time inspection and mass distributions for one profiled object.
          </InlineNotice>
        ) : (
          <details className="inspector-stack inspector-stack--collapsed-context">
            <summary className="section-label">Detailed snapshot inspection</summary>
            <p className="muted-text">
              This route stays history-first. Open this section when you need to drill into
              one summarized historical snapshot through material-time reading, mass
              distribution, profiled properties, or hovered summary cells.
            </p>
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
                qualities={availableQualities}
                values={selectedSummaryRow.qualityValues}
                records={detailSnapshot?.rows ?? null}
                totalMassTon={selectedSummaryRow.massTon}
              />
            ) : null}
            <CellFocusPanel
              hoveredCell={activeHoveredCell}
              qualities={availableQualities}
              selectedQuality={selectedQuality}
              emptyMessage="Hover a summary cell, band, or row in the active profiler detail view to inspect its coordinates, mass, and property values."
            />
            <WorkspaceJumpLinks
              objectId={selectedObjectId}
              objectType={selectedIndexEntry?.objectType}
              isProfiled
            />
          </details>
        )}
      </aside>
    </div>
  );
}
