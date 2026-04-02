"use client";

import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  CircuitGraph,
  ObjectSummary,
  ProfilerIndex,
  ProfilerSnapshot,
  ProfilerSummaryRow,
  QualityDefinition,
} from "@/types/app-data";
import { CircuitFlow } from "@/components/circuit/circuit-flow";
import { deriveNumericColorDomain } from "@/lib/color";
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

interface ProfilerWorkspaceProps {
  graph: CircuitGraph;
  index: ProfilerIndex;
  qualities: QualityDefinition[];
}

type ProfilerMode = "circuit" | "detail";

function getExtents(rows: ProfilerSnapshot["rows"]) {
  if (rows.length === 0) {
    return { x: 1, y: 1, z: 1 };
  }

  return {
    x: Math.max(...rows.map((row) => row.ix)) + 1,
    y: Math.max(...rows.map((row) => row.iy)) + 1,
    z: Math.max(...rows.map((row) => row.iz)) + 1,
  };
}

export function ProfilerWorkspace({
  graph,
  index,
  qualities,
}: ProfilerWorkspaceProps) {
  const initialObjectId = useRef(index.defaultObjectId);
  const [mode, setMode] = useState<ProfilerMode>("circuit");
  const [selectedObjectId, setSelectedObjectId] = useState(index.defaultObjectId);
  const [selectedQualityId, setSelectedQualityId] = useState(qualities[0]?.id ?? "");
  const [selectedSnapshotId, setSelectedSnapshotId] = useState("");
  const [summaryRows, setSummaryRows] = useState<ProfilerSummaryRow[]>([]);
  const [detailSnapshot, setDetailSnapshot] = useState<ProfilerSnapshot | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

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
          setLoadingDetail(payload.some((row) => row.objectId === initialObjectId.current));
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
    setSelectedObjectId(nextObjectId);
    setSelectedSnapshotId("");
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

  const snapshotIndex = selectedObjectRows.findIndex(
    (row) => row.snapshotId === effectiveSnapshotId,
  );

  const detailExtents = detailSnapshot ? getExtents(detailSnapshot.rows) : { x: 1, y: 1, z: 1 };
  const detailColorDomain = useMemo(() => {
    if (!detailSnapshot || !selectedQuality || selectedQuality.kind !== "numerical") {
      return undefined;
    }

    return deriveNumericColorDomain(
      detailSnapshot.rows.map((row) => row.qualityValues[selectedQuality.id]),
      selectedQuality,
    );
  }, [detailSnapshot, selectedQuality]);

  let detailView: ReactNode = null;

  if (detailSnapshot) {
    if (detailSnapshot.dimension === 1) {
      detailView = (
        <PileColumnView
          cells={detailSnapshot.rows}
          quality={selectedQuality}
          numericDomain={detailColorDomain}
        />
      );
    } else if (detailSnapshot.dimension === 2) {
      detailView = (
        <PileHeatmapView
          cells={detailSnapshot.rows}
          quality={selectedQuality}
          numericDomain={detailColorDomain}
          columns={detailExtents.x}
          rows={detailExtents.y}
          xAccessor={(cell) => cell.ix}
          yAccessor={(cell) => cell.iy}
        />
      );
    } else {
      detailView = (
        <Pile3DCanvas
          key={`${detailSnapshot.objectId}:${detailSnapshot.snapshotId}:${selectedQuality?.id ?? "none"}`}
          cells={detailSnapshot.rows}
          extents={detailExtents}
          quality={selectedQuality}
          numericDomain={detailColorDomain}
        />
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
          onChange={setSelectedQualityId}
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
              setSelectedSnapshotId(nextRow?.snapshotId ?? "");
              setLoadingDetail(true);
              setDetailError(null);
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
        {mode === "detail" ? (
          <QualityLegend quality={selectedQuality} numericDomain={detailColorDomain} />
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
        <div className="section-label">Snapshot</div>
        <h3>
          {selectedSummaryRow?.displayName ?? detailSnapshot?.displayName ?? "Selected object"}
        </h3>
        <p className="muted-text">
          Aggregated profiler snapshots provide lower-resolution content that can be replayed
          through time without reading the original source artifacts.
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
        <MetricGrid
          metrics={[
            { label: "Summary rows", value: loadingSummary ? "Loading" : String(summaryRows.length) },
            { label: "Snapshots", value: String(selectedObjectRows.length) },
            { label: "Mode", value: mode },
          ]}
        />
        {selectedSummaryRow ? (
          <QualityValueList
            qualities={availableQualities}
            values={selectedSummaryRow.qualityValues}
            limit={availableQualities.length}
          />
        ) : null}
      </aside>
    </div>
  );
}
