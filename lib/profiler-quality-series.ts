import {
  formatQualityValueDisplay,
  getQualityDisplayLabel,
} from "@/lib/quality-display";
import { findQualityCategory } from "@/lib/quality-values";
import type { ProfilerSummaryRow, QualityDefinition, QualityValue } from "@/types/app-data";

interface BaseProfilerQualitySeriesPoint {
  snapshotId: string;
  timestamp: string;
  massTon: number;
}

export interface NumericalProfilerQualitySeriesPoint
  extends BaseProfilerQualitySeriesPoint {
  value: number;
}

export interface CategoricalProfilerQualitySeriesPoint
  extends BaseProfilerQualitySeriesPoint {
  value: QualityValue;
  label: string;
  color: string;
}

export type ProfilerQualitySeries =
  | {
      kind: "empty";
      label: string;
      reason: string;
    }
  | {
      kind: "numerical";
      label: string;
      points: NumericalProfilerQualitySeriesPoint[];
      domain: {
        min: number;
        max: number;
      };
      firstValue: number;
      latestValue: number;
      delta: number;
    }
  | {
      kind: "categorical";
      label: string;
      points: CategoricalProfilerQualitySeriesPoint[];
      firstLabel: string;
      latestLabel: string;
      changeCount: number;
    };

/**
 * Builds a quality-focused historical series from profiler summary rows so the
 * profiler route can show how the selected summarized quality evolves through
 * the stored snapshots of one object.
 */
export function buildProfilerQualitySeries(
  rows: ProfilerSummaryRow[],
  quality: QualityDefinition | undefined,
): ProfilerQualitySeries {
  const label = getQualityDisplayLabel(quality, "quality");

  if (!quality) {
    return {
      kind: "empty",
      label,
      reason: "No tracked quality is selected.",
    };
  }

  if (rows.length === 0) {
    return {
      kind: "empty",
      label,
      reason: "No profiler history is available for the selected object.",
    };
  }

  if (quality.kind === "categorical") {
    const points = rows
      .map((row) => {
        const value = row.qualityValues[quality.id];

        if (value === null || value === undefined) {
          return null;
        }

        const category = findQualityCategory(quality, value);

        return {
          snapshotId: row.snapshotId,
          timestamp: row.timestamp,
          massTon: row.massTon,
          value,
          label: category?.label ?? formatQualityValueDisplay(quality, value),
          color: category?.color ?? quality.palette[0] ?? "#59ddff",
        } satisfies CategoricalProfilerQualitySeriesPoint;
      })
      .filter((point) => point !== null) as CategoricalProfilerQualitySeriesPoint[];

    if (points.length === 0) {
      return {
        kind: "empty",
        label,
        reason: "The selected quality has no categorical values in the stored profiler history.",
      };
    }

    const changeCount = points.reduce((count, point, index) => {
      if (index === 0) {
        return count;
      }

      return points[index - 1]?.label === point.label ? count : count + 1;
    }, 0);

    return {
      kind: "categorical",
      label,
      points,
      firstLabel: points[0]!.label,
      latestLabel: points[points.length - 1]!.label,
      changeCount,
    };
  }

  const points = rows
    .map((row) => {
      const value = row.qualityValues[quality.id];

      if (typeof value !== "number" || !Number.isFinite(value)) {
        return null;
      }

      return {
        snapshotId: row.snapshotId,
        timestamp: row.timestamp,
        massTon: row.massTon,
        value,
      } satisfies NumericalProfilerQualitySeriesPoint;
    })
    .filter((point): point is NumericalProfilerQualitySeriesPoint => point !== null);

  if (points.length === 0) {
    return {
      kind: "empty",
      label,
      reason: "The selected quality has no numerical values in the stored profiler history.",
    };
  }

  const values = points.map((point) => point.value);
  const min = values.reduce(
    (current, value) => (value < current ? value : current),
    values[0]!,
  );
  const max = values.reduce(
    (current, value) => (value > current ? value : current),
    values[0]!,
  );

  return {
    kind: "numerical",
    label,
    points,
    domain: { min, max },
    firstValue: points[0]!.value,
    latestValue: points[points.length - 1]!.value,
    delta: points[points.length - 1]!.value - points[0]!.value,
  };
}
