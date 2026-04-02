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
  const [selectedQualityId, setSelectedQualityId] = useState(qualities[0]?.id ?? "");
  const [currentBelt, setCurrentBelt] = useState(initialBelt);
  const [loading, setLoading] = useState(false);

  const selectedQuality = qualities.find((quality) => quality.id === selectedQualityId);
  const beltEntries = registry.filter((entry) => entry.objectType === "belt" && entry.liveRef);
  const selectedSummary = summaries.find((summary) => summary.objectId === selectedObjectId);

  function handleSelectObject(nextObjectId: string) {
    if (
      beltEntries.some((entry) => entry.objectId === nextObjectId) &&
      nextObjectId !== currentBelt.objectId
    ) {
      setLoading(true);
    }

    setSelectedObjectId(nextObjectId);
  }

  useEffect(() => {
    const isBelt = beltEntries.some((entry) => entry.objectId === selectedObjectId);
    if (!isBelt || selectedObjectId === currentBelt.objectId) {
      return;
    }

    let cancelled = false;

    fetch(`/api/live/belts/${selectedObjectId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load live belt snapshot.");
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
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [beltEntries, currentBelt.objectId, selectedObjectId]);

  return (
    <div className="workspace-grid workspace-grid--triple">
      <aside className="panel">
        <div className="section-label">Selection</div>
        <label className="field">
          <span>Focused belt</span>
          <select
            value={selectedObjectId}
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
        {loading ? <div className="loading-banner">Loading belt snapshot...</div> : null}
        <CircuitFlow
          graph={graph}
          summaries={summaries}
          selectedObjectId={selectedObjectId}
          onSelect={handleSelectObject}
        />
        <div className="belt-strip-panel">
          <div className="section-label">Block strip</div>
          <BeltBlockStrip snapshot={currentBelt} quality={selectedQuality} />
        </div>
      </section>

      <aside className="panel">
        <div className="section-label">Current Object</div>
        <h3>{selectedSummary?.displayName ?? currentBelt.displayName}</h3>
        <p className="muted-text">
          The selected belt snapshot exposes ordered material blocks for the current runtime state.
        </p>
        <MetricGrid
          metrics={[
            {
              label: "Status",
              value: selectedSummary?.status ?? "Updated",
            },
            {
              label: "Current mass",
              value: formatMassTon(selectedSummary?.massTon ?? currentBelt.totalMassTon),
            },
            {
              label: "Latest UTC",
              value: formatTimestamp(selectedSummary?.timestamp ?? currentBelt.timestamp),
            },
          ]}
        />
        <QualityValueList qualities={qualities} values={currentBelt.qualityAverages} />
      </aside>
    </div>
  );
}
