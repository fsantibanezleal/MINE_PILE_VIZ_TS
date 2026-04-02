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

export type DominantCategoricalSource =
  | "proportion-records"
  | "proportion-aggregate"
  | "main-records"
  | "aggregate"
  | "unavailable";

export interface DominantCategoricalEntry {
  quality: QualityDefinition;
  label: string;
  color: string;
  ratio: number | null;
  massTon: number | null;
  source: DominantCategoricalSource;
}

export interface CategoricalProportionSegment {
  qualityId: string | null;
  value: number | null;
  token: string | null;
  label: string;
  color: string;
  massTon: number | null;
  ratio: number;
  isOther: boolean;
}

export interface CategoricalProportionBreakdown {
  quality: QualityDefinition;
  totalMassTon: number | null;
  segments: CategoricalProportionSegment[];
  dominant: CategoricalProportionSegment | null;
  source: "proportion-records" | "proportion-aggregate" | "main-records";
}

export interface CategoricalDistributionGroup {
  sourceKey: string;
  mainQuality: QualityDefinition;
  proportionQualities: QualityDefinition[];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasQualityValue(values: QualityValueMap, qualityId: string) {
  return Object.prototype.hasOwnProperty.call(values, qualityId);
}

function hasQualityValueInRecords(
  records: ProfiledPropertyRecord[] | null | undefined,
  qualityId: string,
) {
  return records?.some((record) => hasQualityValue(record.qualityValues, qualityId)) ?? false;
}

function parseCategoricalMainQualityId(qualityId: string) {
  const match = /^q_cat_(.+?)_main$/.exec(qualityId);
  return match?.[1] ?? null;
}

function parseCategoricalProportionQualityId(qualityId: string) {
  const match = /^q_cat_(.+?)_prop_(.+)$/.exec(qualityId);

  if (!match) {
    return null;
  }

  return {
    sourceKey: match[1]!,
    token: match[2]!,
  };
}

function isProportionQuality(quality: QualityDefinition) {
  return parseCategoricalProportionQualityId(quality.id) !== null;
}

function clampRatio(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

function sortSegments(
  segments: CategoricalProportionSegment[],
): CategoricalProportionSegment[] {
  return [...segments].sort((left, right) => {
    if (right.ratio !== left.ratio) {
      return right.ratio - left.ratio;
    }

    if (left.isOther !== right.isOther) {
      return left.isOther ? 1 : -1;
    }

    return left.label.localeCompare(right.label);
  });
}

export function splitProfiledQualities(
  qualities: QualityDefinition[],
  values: QualityValueMap,
  records?: ProfiledPropertyRecord[] | null,
) {
  const availableQualities = qualities.filter(
    (quality) =>
      hasQualityValue(values, quality.id) || hasQualityValueInRecords(records, quality.id),
  );

  return {
    numericalQualities: availableQualities.filter(
      (quality) => quality.kind === "numerical" && !isProportionQuality(quality),
    ),
    categoricalQualities: availableQualities.filter(
      (quality) => quality.kind === "categorical",
    ),
    proportionQualities: availableQualities.filter((quality) =>
      isProportionQuality(quality),
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

export function buildCategoricalDistributionGroups(
  categoricalQualities: QualityDefinition[],
  allQualities: QualityDefinition[],
): CategoricalDistributionGroup[] {
  const proportionQualitiesBySourceKey = new Map<string, QualityDefinition[]>();

  for (const quality of allQualities) {
    const parsed = parseCategoricalProportionQualityId(quality.id);

    if (!parsed) {
      continue;
    }

    const current = proportionQualitiesBySourceKey.get(parsed.sourceKey) ?? [];
    current.push(quality);
    proportionQualitiesBySourceKey.set(parsed.sourceKey, current);
  }

  return categoricalQualities.map((quality) => {
    const sourceKey = parseCategoricalMainQualityId(quality.id) ?? quality.id;
    const proportionQualities = [
      ...(proportionQualitiesBySourceKey.get(sourceKey) ?? []),
    ].sort((left, right) => {
      const leftToken = parseCategoricalProportionQualityId(left.id)?.token ?? left.id;
      const rightToken = parseCategoricalProportionQualityId(right.id)?.token ?? right.id;

      if (leftToken === "other") {
        return 1;
      }

      if (rightToken === "other") {
        return -1;
      }

      return left.label.localeCompare(right.label);
    });

    return {
      sourceKey,
      mainQuality: quality,
      proportionQualities,
    };
  });
}

function buildSegmentsFromMainRecords(
  quality: QualityDefinition,
  records: ProfiledPropertyRecord[],
): CategoricalProportionBreakdown | null {
  const grouped = new Map<
    string,
    {
      value: number | null;
      label: string;
      color: string;
      massTon: number;
      isOther: boolean;
    }
  >();
  let totalMassTon = 0;

  for (const record of records) {
    const rawValue = record.qualityValues[quality.id];
    const massTon = isFiniteNumber(record.massTon) ? record.massTon : 0;

    if (!isFiniteNumber(rawValue) || massTon <= 0) {
      continue;
    }

    totalMassTon += massTon;
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
      isOther: false,
    });
  }

  if (totalMassTon <= 0) {
    return null;
  }

  const segments = sortSegments(
    Array.from(grouped.values()).map((segment) => ({
      qualityId: null,
      value: segment.value,
      token: null,
      label: segment.label,
      color: segment.color,
      massTon: segment.massTon,
      ratio: segment.massTon / totalMassTon,
      isOther: segment.isOther,
    })),
  );

  return {
    quality,
    totalMassTon,
    segments,
    dominant: segments[0] ?? null,
    source: "main-records",
  };
}

function buildSegmentsFromProportionRecords(
  quality: QualityDefinition,
  proportionQualities: QualityDefinition[],
  records: ProfiledPropertyRecord[],
): CategoricalProportionBreakdown | null {
  const grouped = new Map<
    string,
    {
      qualityId: string | null;
      value: number | null;
      token: string | null;
      label: string;
      color: string;
      massTon: number;
      isOther: boolean;
    }
  >();
  let totalMassTon = 0;
  const hasExplicitOther = proportionQualities.some(
    (entry) => parseCategoricalProportionQualityId(entry.id)?.token === "other",
  );

  for (const record of records) {
    const recordMassTon = isFiniteNumber(record.massTon) ? record.massTon : 0;

    if (recordMassTon <= 0) {
      continue;
    }

    let sawAnyGroupValue = false;
    let knownRatioSum = 0;

    for (const proportionQuality of proportionQualities) {
      const parsed = parseCategoricalProportionQualityId(proportionQuality.id);
      const rawRatio = record.qualityValues[proportionQuality.id];

      if (!parsed || !isFiniteNumber(rawRatio)) {
        continue;
      }

      sawAnyGroupValue = true;
      const clampedRatio = clampRatio(rawRatio);
      knownRatioSum += clampedRatio;

      const current = grouped.get(proportionQuality.id);

      if (current) {
        current.massTon += recordMassTon * clampedRatio;
        continue;
      }

      grouped.set(proportionQuality.id, {
        qualityId: proportionQuality.id,
        value: null,
        token: parsed.token,
        label: proportionQuality.label,
        color:
          proportionQuality.palette[proportionQuality.palette.length - 1] ?? OTHER_COLOR,
        massTon: recordMassTon * clampedRatio,
        isOther: parsed.token === "other",
      });
    }

    if (!sawAnyGroupValue) {
      continue;
    }

    totalMassTon += recordMassTon;

    if (!hasExplicitOther && knownRatioSum < 1 - CATEGORY_TOLERANCE) {
      const residualRatio = 1 - Math.min(1, knownRatioSum);
      const residualMassTon = recordMassTon * residualRatio;
      const currentOther = grouped.get("__derived_other__");

      if (currentOther) {
        currentOther.massTon += residualMassTon;
      } else {
        grouped.set("__derived_other__", {
          qualityId: null,
          value: null,
          token: "other",
          label: "Other",
          color: OTHER_COLOR,
          massTon: residualMassTon,
          isOther: true,
        });
      }
    }
  }

  if (totalMassTon <= 0) {
    return null;
  }

  const segments = sortSegments(
    Array.from(grouped.values())
      .filter((segment) => segment.massTon > 0)
      .map((segment) => ({
        ...segment,
        ratio: segment.massTon / totalMassTon,
      })),
  );

  return {
    quality,
    totalMassTon,
    segments,
    dominant: segments[0] ?? null,
    source: "proportion-records",
  };
}

function buildSegmentsFromAggregateProportions(
  quality: QualityDefinition,
  proportionQualities: QualityDefinition[],
  values: QualityValueMap,
  totalMassTon?: number | null,
): CategoricalProportionBreakdown | null {
  const grouped: CategoricalProportionSegment[] = [];
  const hasExplicitOther = proportionQualities.some(
    (entry) => parseCategoricalProportionQualityId(entry.id)?.token === "other",
  );
  let knownRatioSum = 0;

  for (const proportionQuality of proportionQualities) {
    const parsed = parseCategoricalProportionQualityId(proportionQuality.id);
    const rawRatio = values[proportionQuality.id];

    if (!parsed || !isFiniteNumber(rawRatio)) {
      continue;
    }

    const clampedRatio = clampRatio(rawRatio);
    knownRatioSum += clampedRatio;
    grouped.push({
      qualityId: proportionQuality.id,
      value: null,
      token: parsed.token,
      label: proportionQuality.label,
      color:
        proportionQuality.palette[proportionQuality.palette.length - 1] ?? OTHER_COLOR,
      massTon:
        isFiniteNumber(totalMassTon) && totalMassTon !== null
          ? totalMassTon * clampedRatio
          : null,
      ratio: clampedRatio,
      isOther: parsed.token === "other",
    });
  }

  if (!hasExplicitOther && knownRatioSum < 1 - CATEGORY_TOLERANCE) {
    const residualRatio = 1 - Math.min(1, knownRatioSum);
    grouped.push({
      qualityId: null,
      value: null,
      token: "other",
      label: "Other",
      color: OTHER_COLOR,
      massTon:
        isFiniteNumber(totalMassTon) && totalMassTon !== null
          ? totalMassTon * residualRatio
          : null,
      ratio: residualRatio,
      isOther: true,
    });
    knownRatioSum += residualRatio;
  }

  if (grouped.length === 0 || knownRatioSum <= 0) {
    return null;
  }

  const normalizationDenominator =
    knownRatioSum > 1 + CATEGORY_TOLERANCE ? knownRatioSum : 1;
  const segments = sortSegments(
    grouped
      .map((segment) => ({
        ...segment,
        massTon:
          segment.massTon !== null ? segment.massTon / normalizationDenominator : null,
        ratio: segment.ratio / normalizationDenominator,
      }))
      .filter((segment) => segment.ratio > 0),
  );
  const normalizedTotalMassTon =
    isFiniteNumber(totalMassTon) && totalMassTon !== null ? totalMassTon : null;

  return {
    quality,
    totalMassTon: normalizedTotalMassTon,
    segments,
    dominant: segments[0] ?? null,
    source: "proportion-aggregate",
  };
}

export function buildCategoricalProportionBreakdown(
  quality: QualityDefinition,
  allQualities: QualityDefinition[],
  values: QualityValueMap,
  records?: ProfiledPropertyRecord[] | null,
  totalMassTon?: number | null,
): CategoricalProportionBreakdown | null {
  if (quality.kind !== "categorical") {
    return null;
  }

  const distributionGroup = buildCategoricalDistributionGroups([quality], allQualities)[0];
  const proportionQualities = distributionGroup?.proportionQualities ?? [];

  if (proportionQualities.length > 0) {
    const recordsBreakdown = buildSegmentsFromProportionRecords(
      quality,
      proportionQualities,
      records ?? [],
    );

    if (recordsBreakdown) {
      return recordsBreakdown;
    }

    const aggregateBreakdown = buildSegmentsFromAggregateProportions(
      quality,
      proportionQualities,
      values,
      totalMassTon,
    );

    if (aggregateBreakdown) {
      return aggregateBreakdown;
    }
  }

  return buildSegmentsFromMainRecords(quality, records ?? []);
}

export function buildDominantCategoricalEntries(
  categoricalQualities: QualityDefinition[],
  allQualities: QualityDefinition[],
  values: QualityValueMap,
  records?: ProfiledPropertyRecord[] | null,
  totalMassTon?: number | null,
): DominantCategoricalEntry[] {
  return categoricalQualities
    .filter((quality) => quality.kind === "categorical" && hasQualityValue(values, quality.id))
    .map((quality) => {
      const breakdown = buildCategoricalProportionBreakdown(
        quality,
        allQualities,
        values,
        records,
        totalMassTon,
      );

      if (breakdown?.dominant) {
        return {
          quality,
          label: breakdown.dominant.label,
          color: breakdown.dominant.color,
          ratio: breakdown.dominant.ratio,
          massTon: breakdown.dominant.massTon,
          source: breakdown.source,
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
          source: "aggregate",
        };
      }

      return {
        quality,
        label: "Unavailable",
        color: getQualityColor(quality, null),
        ratio: null,
        massTon: null,
        source: "unavailable",
      };
    });
}
