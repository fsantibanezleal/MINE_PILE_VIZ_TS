import { getQualityColor } from "@/lib/color";
import { deriveNumericExtrema } from "@/lib/data-stats";
import { findQualityCategory, getQualityValueKey } from "@/lib/quality-values";
import type {
  QualityDefinition,
  QualityValue,
  QualityValueMap,
} from "@/types/app-data";

export interface MassDistributionRecord {
  massTon: number;
  qualityValues: QualityValueMap;
}

export interface NumericalMassDistributionBin {
  start: number;
  end: number;
  center: number;
  massTon: number;
  recordCount: number;
}

export interface CategoricalMassDistributionBin {
  value: QualityValue;
  label: string;
  color: string;
  massTon: number;
  ratio: number;
  recordCount: number;
}

export type MassDistribution =
  | {
      kind: "empty";
      totalMassTon: number;
      representedMassTon: number;
      reason: string;
    }
  | {
      kind: "numerical";
      totalMassTon: number;
      representedMassTon: number;
      weightedMean: number;
      domain: {
        min: number;
        max: number;
      };
      maxBinMassTon: number;
      bins: NumericalMassDistributionBin[];
    }
  | {
      kind: "categorical";
      totalMassTon: number;
      representedMassTon: number;
      dominantLabel: string;
      dominantRatio: number;
      bins: CategoricalMassDistributionBin[];
    };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getDefaultBinCount(recordCount: number) {
  return clamp(Math.ceil(Math.sqrt(recordCount)), 4, 12);
}

function resolveNumericalBinIndex(
  bins: NumericalMassDistributionBin[],
  value: number,
) {
  for (let index = 0; index < bins.length; index += 1) {
    const bin = bins[index];

    if (!bin) {
      continue;
    }

    const isLastBin = index === bins.length - 1;
    const fallsInside = isLastBin
      ? value >= bin.start && value <= bin.end
      : value >= bin.start && value < bin.end;

    if (fallsInside) {
      return index;
    }
  }

  return clamp(bins.length - 1, 0, bins.length - 1);
}

export function buildMassDistribution(
  records: MassDistributionRecord[],
  quality: QualityDefinition | undefined,
  options?: {
    binCount?: number;
  },
): MassDistribution {
  const totalMassTon = records.reduce((sum, record) => sum + record.massTon, 0);

  if (!quality) {
    return {
      kind: "empty",
      totalMassTon,
      representedMassTon: 0,
      reason: "No property is selected.",
    };
  }

  if (quality.kind === "categorical") {
    const grouped = new Map<
      string,
      {
        value: QualityValue;
        label: string;
        color: string;
        massTon: number;
        recordCount: number;
      }
    >();
    let representedMassTon = 0;

    for (const record of records) {
      const rawValue = record.qualityValues[quality.id];

      if (rawValue === null || rawValue === undefined || record.massTon <= 0) {
        continue;
      }

      representedMassTon += record.massTon;

      const key = getQualityValueKey(rawValue) ?? `unmapped:${String(rawValue)}`;
      const category = findQualityCategory(quality, rawValue);
      const current = grouped.get(key);

      if (current) {
        current.massTon += record.massTon;
        current.recordCount += 1;
        continue;
      }

      grouped.set(key, {
        value: category?.value ?? rawValue,
        label: category?.label ?? String(rawValue),
        color: category?.color ?? getQualityColor(quality, rawValue),
        massTon: record.massTon,
        recordCount: 1,
      });
    }

    const bins = [...grouped.values()]
      .filter((bin) => bin.massTon > 0)
      .sort((left, right) => right.massTon - left.massTon)
      .map((bin) => ({
        ...bin,
        ratio: representedMassTon > 0 ? bin.massTon / representedMassTon : 0,
      }));

    if (bins.length === 0) {
      return {
        kind: "empty",
        totalMassTon,
        representedMassTon,
        reason:
          "The selected qualitative property has no assigned values in the represented content.",
      };
    }

    return {
      kind: "categorical",
      totalMassTon,
      representedMassTon,
      dominantLabel: bins[0]?.label ?? "N/A",
      dominantRatio: bins[0]?.ratio ?? 0,
      bins,
    };
  }

  const numericRecords = records
    .map((record) => ({
      value: record.qualityValues[quality.id],
      massTon: record.massTon,
    }))
    .filter(
      (
        record,
      ): record is {
        value: number;
        massTon: number;
      } =>
        typeof record.value === "number" &&
        Number.isFinite(record.value) &&
        record.massTon > 0,
    );

  if (numericRecords.length === 0) {
    return {
      kind: "empty",
      totalMassTon,
      representedMassTon: 0,
      reason:
        "The selected numerical property has no valid values in the represented content.",
    };
  }

  const representedMassTon = numericRecords.reduce(
    (sum, record) => sum + record.massTon,
    0,
  );
  const weightedMean =
    numericRecords.reduce(
      (sum, record) => sum + record.value * record.massTon,
      0,
    ) / Math.max(representedMassTon, 1);
  const domain = deriveNumericExtrema(numericRecords, (record) => record.value);

  if (!domain) {
    return {
      kind: "empty",
      totalMassTon,
      representedMassTon: 0,
      reason:
        "The selected numerical property has no valid values in the represented content.",
    };
  }

  const { min, max } = domain;

  if (min === max) {
    return {
      kind: "numerical",
      totalMassTon,
      representedMassTon,
      weightedMean,
      domain: { min, max },
      maxBinMassTon: representedMassTon,
      bins: [
        {
          start: min,
          end: max,
          center: min,
          massTon: representedMassTon,
          recordCount: numericRecords.length,
        },
      ],
    };
  }

  const binCount = options?.binCount ?? getDefaultBinCount(numericRecords.length);
  const step = (max - min) / binCount;
  const bins: NumericalMassDistributionBin[] = Array.from(
    { length: binCount },
    (_, index) => {
      const start = min + index * step;
      const end = index === binCount - 1 ? max : start + step;

      return {
        start,
        end,
        center: start + (end - start) / 2,
        massTon: 0,
        recordCount: 0,
      };
    },
  );

  for (const record of numericRecords) {
    const index = resolveNumericalBinIndex(bins, record.value);
    const bin = bins[index];

    if (!bin) {
      continue;
    }

    bin.massTon += record.massTon;
    bin.recordCount += 1;
  }

  return {
    kind: "numerical",
    totalMassTon,
    representedMassTon,
    weightedMean,
    domain: { min, max },
    maxBinMassTon: Math.max(0, ...bins.map((bin) => bin.massTon)),
    bins,
  };
}
