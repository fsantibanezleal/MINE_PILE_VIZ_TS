"use client";

import { MetricGrid } from "@/components/ui/metric-grid";
import { formatDuration, formatTimestamp } from "@/lib/format";
import type { MaterialTimeSummary } from "@/lib/material-time";

interface MaterialTimePanelProps {
  summary: MaterialTimeSummary | null;
  title?: string;
  emptyMessage?: string;
}

/**
 * Shared material-time panel used across live, stockpile, profiler, and
 * simulator workspaces so represented timestamp windows stay comparable.
 */
export function MaterialTimePanel({
  summary,
  title = "Material time span",
  emptyMessage = "No valid material timestamps are available for the current selection.",
}: MaterialTimePanelProps) {
  return (
    <div className="inspector-stack">
      <div className="section-label">{title}</div>
      {summary ? (
        <MetricGrid
          metrics={[
            {
              label: "Oldest material",
              value: formatTimestamp(summary.oldestTimestampMs),
            },
            {
              label: "Newest material",
              value: formatTimestamp(summary.newestTimestampMs),
            },
            {
              label: "Material span",
              value: formatDuration(summary.representedSpanMs),
            },
            {
              label: "Oldest age",
              value: formatDuration(summary.oldestAgeMs),
            },
            {
              label: "Newest age",
              value: formatDuration(summary.newestAgeMs),
            },
          ]}
        />
      ) : (
        <p className="muted-text">{emptyMessage}</p>
      )}
    </div>
  );
}
