"use client";

import {
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircuitFlow } from "@/components/circuit/circuit-flow";
import { InlineNotice } from "@/components/ui/inline-notice";
import { MetricGrid } from "@/components/ui/metric-grid";
import { QualitySelector } from "@/components/ui/quality-selector";
import { SimulatorMassHistogram } from "@/components/simulator/simulator-mass-histogram";
import { formatMassTon, formatNumber, formatTimestamp } from "@/lib/format";
import {
  buildHrefWithQuery,
  resolveQuerySelection,
} from "@/lib/workspace-route-state";
import type {
  CircuitGraph,
  ObjectSummary,
  ProfilerIndex,
  ProfilerSummaryRow,
  QualityDefinition,
} from "@/types/app-data";

interface SimulatorWorkspaceProps {
  graph: CircuitGraph;
  index: ProfilerIndex;
  qualities: QualityDefinition[];
}

function toObjectSummary(row: ProfilerSummaryRow): ObjectSummary {
  return {
    objectId: row.objectId,
    objectType: row.objectType,
    displayName: row.displayName,
    timestamp: row.timestamp,
    massTon: row.massTon,
    status: "Scenario step",
    qualityValues: row.qualityValues,
  };
}

export function SimulatorWorkspace({
  graph,
  index,
  qualities,
}: SimulatorWorkspaceProps) {
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
  const [selectedObjectId, setSelectedObjectId] = useState(initialObjectId);
  const [selectedQualityId, setSelectedQualityId] = useState(initialQualityId);
  const [selectedTimestamp, setSelectedTimestamp] = useState(searchParams.get("time") ?? "");
  const [summaryRows, setSummaryRows] = useState<ProfilerSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [histogramBinCount, setHistogramBinCount] = useState(6);

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
            payload?.error?.message ?? "Failed to load simulator summary rows.",
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
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load simulator summary rows.",
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
  }, []);

  const timestamps = useMemo(
    () =>
      Array.from(new Set(summaryRows.map((row) => row.timestamp))).sort((left, right) =>
        left.localeCompare(right),
      ),
    [summaryRows],
  );
  const latestTimestamp = timestamps[timestamps.length - 1] ?? "";
  const effectiveTimestamp = resolveQuerySelection(
    selectedTimestamp,
    timestamps,
    latestTimestamp,
  );
  const selectedRows = useMemo(
    () => summaryRows.filter((row) => row.timestamp === effectiveTimestamp),
    [effectiveTimestamp, summaryRows],
  );
  const availableQualities = useMemo(
    () =>
      qualities.filter((quality) =>
        summaryRows.some((row) => quality.id in row.qualityValues),
      ),
    [qualities, summaryRows],
  );
  const selectedQuality =
    availableQualities.find((quality) => quality.id === selectedQualityId) ??
    availableQualities[0];
  const selectedSummary = selectedRows.find((row) => row.objectId === selectedObjectId);
  const selectedScenarioIndex = Math.max(0, timestamps.indexOf(effectiveTimestamp));
  const totalMassTon = selectedRows.reduce((sum, row) => sum + row.massTon, 0);
  const rankedRows = [...selectedRows]
    .sort((left, right) => right.massTon - left.massTon)
    .slice(0, 6);
  const scenarioSummaries = selectedRows.map(toObjectSummary);

  function replaceQuery(values: Record<string, string>) {
    router.replace(buildHrefWithQuery(pathname, searchParams, values), {
      scroll: false,
    });
  }

  function handleSelectObject(nextObjectId: string) {
    setSelectedObjectId(nextObjectId);
    replaceQuery({ object: nextObjectId });
  }

  function handleSelectQuality(nextQualityId: string) {
    setSelectedQualityId(nextQualityId);
    replaceQuery({ quality: nextQualityId });
  }

  function handleSelectTimestamp(nextTimestamp: string) {
    setSelectedTimestamp(nextTimestamp);
    replaceQuery({ time: nextTimestamp });
  }

  useEffect(() => {
    if (!playing || timestamps.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      const currentIndex = timestamps.indexOf(effectiveTimestamp);
      const nextIndex =
        currentIndex >= timestamps.length - 1 || currentIndex < 0 ? 0 : currentIndex + 1;
      const nextTimestamp = timestamps[nextIndex] ?? effectiveTimestamp;
      setSelectedTimestamp(nextTimestamp);
      router.replace(buildHrefWithQuery(pathname, searchParams, { time: nextTimestamp }), {
        scroll: false,
      });
    }, 1100);

    return () => window.clearInterval(timer);
  }, [effectiveTimestamp, pathname, playing, router, searchParams, timestamps]);

  return (
    <div className="workspace-grid workspace-grid--double">
      <aside className="panel panel--stack">
        <div className="section-label">Scenario</div>
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
        <label className="field">
          <span>Time step</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, timestamps.length - 1)}
            value={selectedScenarioIndex}
            onChange={(event) => {
              const nextTimestamp = timestamps[Number(event.target.value)] ?? effectiveTimestamp;
              handleSelectTimestamp(nextTimestamp);
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
        {selectedQuality?.kind === "numerical" ? (
          <label className="field">
            <span>Histogram bins</span>
            <input
              type="range"
              min={4}
              max={16}
              value={histogramBinCount}
              onChange={(event) => setHistogramBinCount(Number(event.target.value))}
            />
          </label>
        ) : null}
        <MetricGrid
          metrics={[
            {
              label: "Current UTC",
              value: effectiveTimestamp ? formatTimestamp(effectiveTimestamp) : "Pending",
            },
            { label: "Active objects", value: String(selectedRows.length) },
            { label: "Scenario mass", value: formatMassTon(totalMassTon) },
          ]}
        />
        <MetricGrid
          metrics={[
            {
              label: "Selected object",
              value: selectedSummary?.displayName ?? "Out of step",
            },
            {
              label: "Selected mass",
              value: selectedSummary ? formatMassTon(selectedSummary.massTon) : "N/A",
            },
            {
              label: selectedQuality?.label ?? "Property",
              value:
                selectedSummary && selectedQuality
                  ? selectedQuality.kind === "numerical"
                    ? formatNumber(selectedSummary.qualityValues[selectedQuality.id])
                    : String(selectedSummary.qualityValues[selectedQuality.id] ?? "N/A")
                  : "N/A",
            },
          ]}
        />
        <div className="section-label">Mass Ranking</div>
        {rankedRows.length > 0 ? (
          <div className="quality-list">
            {rankedRows.map((row) => {
              const propertyValue = selectedQuality
                ? row.qualityValues[selectedQuality.id]
                : null;

              return (
                <div key={`${row.timestamp}:${row.objectId}`} className="quality-list__item">
                  <div className="quality-list__meta">
                    <strong>{row.displayName}</strong>
                    <span>{formatMassTon(row.massTon)}</span>
                  </div>
                  <strong>
                    {propertyValue === null || propertyValue === undefined
                      ? "N/A"
                      : selectedQuality?.kind === "numerical"
                        ? formatNumber(propertyValue)
                        : String(propertyValue)}
                  </strong>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted-text">
            No scenario rows are available for the selected timestep.
          </p>
        )}
      </aside>

      <div className="panel panel--stack">
        {loadError ? (
          <InlineNotice tone="error" title="Simulator summary unavailable">
            {loadError}
          </InlineNotice>
        ) : null}
        {loading ? <div className="loading-banner">Loading simulator scenario...</div> : null}
        {!loading && selectedRows.length === 0 ? (
          <InlineNotice tone="info" title="No scenario step is available">
            The selected timestep does not contain profiled object summaries in the local cache.
          </InlineNotice>
        ) : (
          <CircuitFlow
            graph={graph}
            summaries={scenarioSummaries}
            selectedObjectId={selectedObjectId}
            onSelect={handleSelectObject}
          />
        )}
        {!loading && selectedRows.length > 0 ? (
          <>
            <div className="section-label">Distribution</div>
            <SimulatorMassHistogram
              rows={selectedRows}
              quality={selectedQuality}
              binCount={histogramBinCount}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
