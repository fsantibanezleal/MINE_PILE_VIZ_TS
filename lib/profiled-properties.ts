import { getQualityColor } from "@/lib/color";
import type {
  QualityCategory,
  QualityDefinition,
  QualityValueMap,
} from "@/types/app-data";

const OTHER_COLOR = "#5f7392";
const CATEGORY_TOLERANCE = 1e-6;

export interface ProfiledPropertyRecord {
  massTon: number;
  qualityValues: QualityValueMap;
}

export interface DominantCategoricalEntry {
  quality: QualityDefinition;
  label: string;
  color: string;
  ratio: number | null;
  massTon: number | null;
  source: "records" | "aggregate" | "unavailable";
}

export interface CategoricalProportionSegment {
  value: number | null;
  label: string;
  color: string;
  massTon: number;
  ratio: number;
}

export interface CategoricalProportionBreakdown {
  quality: QualityDefinition;
  totalMassTon: number;
  segments: CategoricalProportionSegment[];
  dominant: CategoricalProportionSegment | null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasQualityValue(values: QualityValueMap, qualityId: string) {
  return Object.prototype.hasOwnProperty.call(values, qualityId);
}

export function splitProfiledQualities(
  qualities: QualityDefinition[],
  values: QualityValueMap,
) {
  const availableQualities = qualities.filter((quality) =>
    hasQualityValue(values, quality.id),
  );

  return {
    numericalQualities: availableQualities.filter(
      (quality) => quality.kind === "numerical",
    ),
    categoricalQualities: availableQualities.filter(
      (quality) => quality.kind === "categorical",
    ),
  };
}

export function findMatchingCategory(
  quality: QualityDefinition,
  value: number | null | undefined,
): QualityCategory | undefined {
  if (quality.kind !== "categorical" || !isFiniteNumber(value)) {
    return undefined;
  }

  return quality.categories?.find(
    (category) => Math.abs(category.value - value) <= CATEGORY_TOLERANCE,
  );
}

export function buildCategoricalProportionBreakdown(
  quality: QualityDefinition,
  records: ProfiledPropertyRecord[] | null | undefined,
  limit = 8,
): CategoricalProportionBreakdown | null {
  if (quality.kind !== "categorical" || !records || records.length === 0) {
    return null;
  }

  const grouped = new Map<
    string,
    {
      value: number | null;
      label: string;
      color: string;
      massTon: number;
    }
  >();

  for (const record of records) {
    const rawValue = record.qualityValues[quality.id];
    const massTon = isFiniteNumber(record.massTon) ? record.massTon : 0;

    if (!isFiniteNumber(rawValue) || massTon <= 0) {
      continue;
    }

    const category = findMatchingCategory(quality, rawValue);
    const key = category ? String(category.value) : `unmapped:${rawValue}`;
    const current = grouped.get(key);

    if (current) {
      current.massTon += massTon;
      continue;
    }

    grouped.set(key, {
      value: category?.value ?? rawValue,
      label: category?.label ?? `Unmapped ${rawValue}`,
      color: category?.color ?? getQualityColor(quality, rawValue),
      massTon,
    });
  }

  const totalMassTon = Array.from(grouped.values()).reduce(
    (sum, segment) => sum + segment.massTon,
    0,
  );

  if (totalMassTon <= 0) {
    return null;
  }

  const sorted = Array.from(grouped.values()).sort(
    (left, right) => right.massTon - left.massTon,
  );
  const trimmed =
    sorted.length > limit
      ? [
          ...sorted.slice(0, limit - 1),
          {
            value: null,
            label: "Other",
            color: OTHER_COLOR,
            massTon: sorted
              .slice(limit - 1)
              .reduce((sum, segment) => sum + segment.massTon, 0),
          },
        ]
      : sorted;
  const segments = trimmed.map((segment) => ({
    ...segment,
    ratio: segment.massTon / totalMassTon,
  }));

  return {
    quality,
    totalMassTon,
    segments,
    dominant: segments[0] ?? null,
  };
}

export function buildDominantCategoricalEntries(
  qualities: QualityDefinition[],
  values: QualityValueMap,
  records?: ProfiledPropertyRecord[] | null,
): DominantCategoricalEntry[] {
  return qualities
    .filter((quality) => quality.kind === "categorical" && hasQualityValue(values, quality.id))
    .map((quality) => {
      const breakdown = buildCategoricalProportionBreakdown(quality, records);

      if (breakdown?.dominant) {
        return {
          quality,
          label: breakdown.dominant.label,
          color: breakdown.dominant.color,
          ratio: breakdown.dominant.ratio,
          massTon: breakdown.dominant.massTon,
          source: "records" as const,
        };
      }

      const rawValue = values[quality.id];
      const category = findMatchingCategory(quality, rawValue);

      if (category) {
        return {
          quality,
          label: category.label,
          color: category.color,
          ratio: null,
          massTon: null,
          source: "aggregate" as const,
        };
      }

      return {
        quality,
        label: "Unavailable",
        color: getQualityColor(quality, null),
        ratio: null,
        massTon: null,
        source: "unavailable" as const,
      };
    });
}
