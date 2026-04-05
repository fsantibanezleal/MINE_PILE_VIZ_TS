"use client";

import { formatDuration, formatMassTon, formatTimestamp } from "@/lib/format";
import { buildProfilerDeltaFrame } from "@/lib/profiler-delta";
import type { ProfilerSummaryRow, QualityDefinition } from "@/types/app-data";

interface ProfilerDeltaPanelProps {
  rows: ProfilerSummaryRow[];
  selectedSnapshotId: string;
  quality?: QualityDefinition;
}

function formatSignedMass(value: number) {
  if (value > 0) {
    return `+${formatMassTon(value)}`;
  }

  if (value < 0) {
    return `-${formatMassTon(Math.abs(value))}`;
  }

  return formatMassTon(0);
}

export function ProfilerDeltaPanel({
  rows,
  selectedSnapshotId,
  quality,
}: ProfilerDeltaPanelProps) {
  const frame = buildProfilerDeltaFrame(rows, selectedSnapshotId, quality);

  if (!frame) {
    return null;
  }

  return (
    <div className="profiler-delta">
      <div className="section-label">Historical delta</div>
      <p className="muted-text">
        Compare the selected snapshot against the previous stored step and against the
        beginning of the available history for this object.
      </p>
      <div className="profiler-delta__cards">
        <div className="profiler-delta__card">
          <span>Mass vs previous</span>
          <strong>{frame.previous ? formatSignedMass(frame.deltaMassTon) : "N/A"}</strong>
          <small>
            {frame.previous
              ? `Previous mass ${formatMassTon(frame.previous.massTon)}`
              : "This is the first stored snapshot."}
          </small>
        </div>
        <div className="profiler-delta__card">
          <span>Mass vs first</span>
          <strong>{formatSignedMass(frame.deltaMassSinceStartTon)}</strong>
          <small>{`First mass ${formatMassTon(frame.first.massTon)}`}</small>
        </div>
        <div className="profiler-delta__card">
          <span>Step interval</span>
          <strong>{formatDuration(frame.intervalMs)}</strong>
          <small>
            {frame.previous
              ? `Previous step ${formatTimestamp(frame.previous.timestamp)}`
              : "No earlier step available."}
          </small>
        </div>
        <div className="profiler-delta__card">
          <span>{`${frame.qualityLabel} change`}</span>
          <strong>{frame.qualityDeltaText}</strong>
          <small>{frame.qualityStatusText}</small>
        </div>
      </div>
      <div className="profiler-delta__comparison">
        <div className="profiler-delta__comparison-card">
          <span>Current quality</span>
          <strong>{frame.currentQualityValue}</strong>
        </div>
        <div className="profiler-delta__comparison-card">
          <span>Previous quality</span>
          <strong>{frame.previousQualityValue}</strong>
        </div>
      </div>
    </div>
  );
}
