import { formatNumber } from "@/lib/format";
import { formatQualityValueDisplay, getQualityDisplayLabel } from "@/lib/quality-display";
import type { ProfilerSummaryRow, QualityDefinition } from "@/types/app-data";

export interface ProfilerDeltaFrame {
  selected: ProfilerSummaryRow;
  previous: ProfilerSummaryRow | null;
  first: ProfilerSummaryRow;
  deltaMassTon: number;
  deltaMassSinceStartTon: number;
  intervalMs: number | null;
  qualityLabel: string;
  qualityMode: "numerical" | "categorical" | "unavailable";
  currentQualityValue: string;
  previousQualityValue: string;
  qualityDeltaText: string;
  qualityStatusText: string;
}

function formatSignedNumber(value: number) {
  if (value > 0) {
    return `+${formatNumber(value)}`;
  }

  if (value < 0) {
    return `-${formatNumber(Math.abs(value))}`;
  }

  return "0";
}

/**
 * Builds a history-comparison frame for the profiler route so it can speak in
 * terms of change between snapshots instead of only repeating snapshot state.
 */
export function buildProfilerDeltaFrame(
  rows: ProfilerSummaryRow[],
  selectedSnapshotId: string,
  quality?: QualityDefinition,
): ProfilerDeltaFrame | null {
  if (rows.length === 0) {
    return null;
  }

  const selectedIndex = rows.findIndex((row) => row.snapshotId === selectedSnapshotId);
  const safeIndex = selectedIndex >= 0 ? selectedIndex : rows.length - 1;
  const selected = rows[safeIndex]!;
  const previous = safeIndex > 0 ? rows[safeIndex - 1]! : null;
  const first = rows[0]!;
  const deltaMassTon = previous ? selected.massTon - previous.massTon : 0;
  const deltaMassSinceStartTon = selected.massTon - first.massTon;
  const intervalMs = previous
    ? new Date(selected.timestamp).getTime() - new Date(previous.timestamp).getTime()
    : null;

  if (!quality) {
    return {
      selected,
      previous,
      first,
      deltaMassTon,
      deltaMassSinceStartTon,
      intervalMs,
      qualityLabel: "Selected quality",
      qualityMode: "unavailable",
      currentQualityValue: "N/A",
      previousQualityValue: previous ? "N/A" : "No previous snapshot",
      qualityDeltaText: "Time coloring active",
      qualityStatusText:
        "Historical quality comparison uses the tracked quality selector even while the object view is colored by material time.",
    };
  }

  const currentValue = selected.qualityValues[quality.id];
  const previousValue = previous?.qualityValues[quality.id];
  const qualityLabel = getQualityDisplayLabel(quality);

  if (quality.kind === "numerical") {
    const currentNumeric = typeof currentValue === "number" ? currentValue : null;
    const previousNumeric = typeof previousValue === "number" ? previousValue : null;

    return {
      selected,
      previous,
      first,
      deltaMassTon,
      deltaMassSinceStartTon,
      intervalMs,
      qualityLabel,
      qualityMode: "numerical",
      currentQualityValue: formatQualityValueDisplay(quality, currentValue),
      previousQualityValue: previous
        ? formatQualityValueDisplay(quality, previousValue)
        : "No previous snapshot",
      qualityDeltaText:
        currentNumeric !== null && previousNumeric !== null
          ? formatSignedNumber(currentNumeric - previousNumeric)
          : "N/A",
      qualityStatusText: previous
        ? "Change in the selected profiled value against the previous stored snapshot."
        : "This is the first stored snapshot for the selected object.",
    };
  }

  const currentLabel = formatQualityValueDisplay(quality, currentValue);
  const previousLabel = previous
    ? formatQualityValueDisplay(quality, previousValue)
    : "No previous snapshot";

  return {
    selected,
    previous,
    first,
    deltaMassTon,
    deltaMassSinceStartTon,
    intervalMs,
    qualityLabel,
    qualityMode: "categorical",
    currentQualityValue: currentLabel,
    previousQualityValue: previousLabel,
    qualityDeltaText: previous
      ? currentLabel === previousLabel
        ? "No change"
        : "Changed"
      : "First snapshot",
    qualityStatusText: previous
      ? "Compares the mapped predominant category against the previous stored snapshot."
      : "This is the first stored snapshot for the selected object.",
  };
}
