"use client";

import { startTransition, useEffect, useState } from "react";
import type {
  BeltSnapshot,
  CircuitGraph,
  ObjectRegistryEntry,
  ObjectSummary,
  QualityDefinition,
} from "@/types/app-data";
import { CircuitFlow } from "@/components/circuit/circuit-flow";
import { BeltBlockStrip } from "@/components/live/belt-block-strip";
import { InlineNotice } from "@/components/ui/inline-notice";
import { MetricGrid } from "@/components/ui/metric-grid";
import { QualitySelector } from "@/components/ui/quality-selector";
import { QualityValueList } from "@/components/ui/quality-value-list";
import { formatMassTon, formatTimestamp } from "@/lib/format";

interface LiveWorkspaceProps {
  graph: CircuitGraph;
  summaries: ObjectSummary[];
  registry: ObjectRegistryEntry[];
  qualities: QualityDefinition[];
  initialBelt: BeltSnapshot;
}

export function LiveWorkspace({
  graph,
  summaries,
  registry,
  qualities,
  initialBelt,
}: LiveWorkspaceProps) {
  const [selectedObjectId, setSelectedObjectId] = useState(initialBelt.objectId);
  const [selectedBeltId, setSelectedBeltId] = useState(initialBelt.objectId);
  const [selectedQualityId, setSelectedQualityId] = useState(qualities[0]?.id ?? "");
  const [currentBelt, setCurrentBelt] = useState(initialBelt);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedQuality = qualities.find((quality) => quality.id === selectedQualityId);
  const beltEntries = registry.filter((entry) => entry.objectType === "belt" && entry.liveRef);
  const selectedSummary = summaries.find((summary) => summary.objectId === selectedObjectId);
  const selectedObjectIsBelt = beltEntries.some(
    (entry) => entry.objectId === selectedObjectId,
  );

  function handleSelectObject(nextObjectId: string) {
    const beltEntry = beltEntries.find((entry) => entry.objectId === nextObjectId);

    setSelectedObjectId(nextObjectId);

    if (!beltEntry) {
      return;
    }

    setSelectedBeltId(nextObjectId);

    if (nextObjectId !== currentBelt.objectId) {
      setLoading(true);
      setLoadError(null);
    }
  }

  useEffect(() => {
    if (selectedBeltId === currentBelt.objectId) {
      return;
    }

    let cancelled = false;

    fetch(`/api/live/belts/${selectedBeltId}`)
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
            payload?.error?.message ?? "Failed to load live belt snapshot.",
          );
        }

        return (await response.json()) as BeltSnapshot;
      })
      .then((payload) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setCurrentBelt(payload);
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load live belt snapshot.",
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
  }, [currentBelt.objectId, selectedBeltId]);

  return (
    <div className="workspace-grid workspace-grid--triple">
      <aside className="panel">
        <div className="section-label">Selection</div>
        <label className="field">
          <span>Inspection belt</span>
          <select
            value={selectedBeltId}
            onChange={(event) => handleSelectObject(event.target.value)}
          >
            {beltEntries.map((entry) => (
              <option key={entry.objectId} value={entry.objectId}>
                {entry.displayName}
              </option>
            ))}
          </select>
        </label>
        <QualitySelector
          label="Color by"
          qualities={qualities}
          value={selectedQualityId}
          onChange={setSelectedQualityId}
        />
        <MetricGrid
          metrics={[
            { label: "Blocks", value: String(currentBelt.blockCount) },
            { label: "Mass", value: formatMassTon(currentBelt.totalMassTon) },
            { label: "Timestamp", value: formatTimestamp(currentBelt.timestamp) },
          ]}
        />
      </aside>

      <section className="panel panel--canvas panel--stack">
        {loadError ? (
          <InlineNotice tone="error" title="Live belt snapshot unavailable">
            {loadError}
          </InlineNotice>
        ) : null}
        {loading ? <div className="loading-banner">Loading belt snapshot...</div> : null}
        <CircuitFlow
          graph={graph}
          summaries={summaries}
          selectedObjectId={selectedObjectId}
          onSelect={handleSelectObject}
        />
        <div className="belt-strip-panel">
          <div className="section-label">Block strip</div>
          {selectedObjectIsBelt ? (
            <BeltBlockStrip snapshot={currentBelt} quality={selectedQuality} />
          ) : (
            <InlineNotice tone="info" title="No belt block strip for this object">
              The current graph focus is not a belt. Select a transport object to inspect
              ordered belt blocks.
            </InlineNotice>
          )}
        </div>
      </section>

      <aside className="panel">
        <div className="section-label">Current Object</div>
        <h3>{selectedSummary?.displayName ?? currentBelt.displayName}</h3>
        <p className="muted-text">
          {selectedObjectIsBelt
            ? "The selected belt snapshot exposes ordered material blocks for the current runtime state."
            : "The current focus is an accumulation object or non-belt runtime object. Summary metrics remain available even when no belt strip applies."}
        </p>
        <MetricGrid
          metrics={[
            {
              label: "Status",
              value: selectedSummary?.status ?? "Updated",
            },
            {
              label: "Current mass",
              value: formatMassTon(
                selectedSummary?.massTon ??
                  (selectedObjectIsBelt ? currentBelt.totalMassTon : 0),
              ),
            },
            {
              label: "Latest UTC",
              value: formatTimestamp(selectedSummary?.timestamp ?? currentBelt.timestamp),
            },
          ]}
        />
        <QualityValueList
          qualities={qualities}
          values={selectedSummary?.qualityValues ?? currentBelt.qualityAverages}
        />
      </aside>
    </div>
  );
}
