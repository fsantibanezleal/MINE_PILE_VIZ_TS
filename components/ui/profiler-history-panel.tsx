"use client";

import { formatDuration, formatMassTon, formatTimestamp } from "@/lib/format";
import type { ProfilerSummaryRow } from "@/types/app-data";

interface ProfilerHistoryPanelProps {
  rows: ProfilerSummaryRow[];
  selectedSnapshotId: string;
  onSelectSnapshot?: (snapshotId: string) => void;
}

function formatSignedMassDelta(value: number) {
  if (value > 0) {
    return `+${formatMassTon(value)}`;
  }

  if (value < 0) {
    return `-${formatMassTon(Math.abs(value))}`;
  }

  return formatMassTon(0);
}

export function ProfilerHistoryPanel({
  rows,
  selectedSnapshotId,
  onSelectSnapshot,
}: ProfilerHistoryPanelProps) {
  if (rows.length === 0) {
    return null;
  }

  const selectedIndex = Math.max(
    0,
    rows.findIndex((row) => row.snapshotId === selectedSnapshotId),
  );
  const selectedRow = rows[selectedIndex] ?? rows[rows.length - 1]!;
  const previousRow = selectedIndex > 0 ? rows[selectedIndex - 1] : null;
  const nextRow = selectedIndex < rows.length - 1 ? rows[selectedIndex + 1] : null;
  const peakMass = rows.reduce(
    (current, row) => (row.massTon > current ? row.massTon : current),
    rows[0]?.massTon ?? 0,
  );
  const firstRow = rows[0]!;
  const lastRow = rows[rows.length - 1]!;
  const coverageMs =
    new Date(lastRow.timestamp).getTime() - new Date(firstRow.timestamp).getTime();
  const selectedDeltaMass = previousRow
    ? selectedRow.massTon - previousRow.massTon
    : 0;

  return (
    <div className="profiler-history">
      <div className="section-label">Timeline context</div>
      <p className="muted-text">
        Use the stored profiler timeline to place the selected snapshot inside
        the broader history of this object and jump directly between recorded
        historical steps.
      </p>
      <div className="profiler-history__metrics">
        <div className="profiler-history__metric">
          <span>Selected step</span>
          <strong>{`${selectedIndex + 1}/${rows.length}`}</strong>
        </div>
        <div className="profiler-history__metric">
          <span>Coverage span</span>
          <strong>{formatDuration(coverageMs)}</strong>
        </div>
        <div className="profiler-history__metric">
          <span>Peak mass</span>
          <strong>{formatMassTon(peakMass)}</strong>
        </div>
      </div>
      <div className="profiler-history__timeline" role="list" aria-label="Profiler history timeline">
        {rows.map((row, index) => {
          const barHeight =
            peakMass > 0 ? Math.max(14, (row.massTon / peakMass) * 100) : 14;
          const isSelected = row.snapshotId === selectedRow.snapshotId;

          return (
            <button
              key={`${row.objectId}:${row.snapshotId}:${index}`}
              type="button"
              className={`profiler-history__bar ${isSelected ? "profiler-history__bar--selected" : ""}`}
              style={{ height: `${barHeight}%` }}
              onClick={() => onSelectSnapshot?.(row.snapshotId)}
              aria-label={`Select snapshot ${index + 1} at ${row.timestamp}`}
              title={`${formatTimestamp(row.timestamp)} - ${formatMassTon(row.massTon)}`}
            />
          );
        })}
      </div>
      <div className="profiler-history__focus">
        <div className="profiler-history__focus-card">
          <span>Selected snapshot</span>
          <strong>{formatTimestamp(selectedRow.timestamp)}</strong>
          <small>{formatMassTon(selectedRow.massTon)}</small>
        </div>
        <div className="profiler-history__focus-card">
          <span>Delta vs previous</span>
          <strong>{previousRow ? formatSignedMassDelta(selectedDeltaMass) : "N/A"}</strong>
          <small>
            {previousRow
              ? `Previous: ${formatTimestamp(previousRow.timestamp)}`
              : "This is the first stored snapshot."}
          </small>
        </div>
        <div className="profiler-history__focus-card">
          <span>Next snapshot</span>
          <strong>{nextRow ? formatMassTon(nextRow.massTon) : "N/A"}</strong>
          <small>
            {nextRow
              ? formatTimestamp(nextRow.timestamp)
              : "This is the latest stored snapshot."}
          </small>
        </div>
      </div>
    </div>
  );
}
