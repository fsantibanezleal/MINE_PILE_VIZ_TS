import { getQualityValueKey } from "@/lib/quality-values";
import type {
  QualityDefinition,
  QualityValue,
  QualityValueMap,
} from "@/types/app-data";

export interface MassWeightedQualityRecord {
  massTon: number;
  qualityValues: QualityValueMap;
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function getMassWeightedDominantCategoricalValue(
  records: MassWeightedQualityRecord[],
  qualityId: string,
): QualityValue {
  const groupedMass = new Map<string, { value: QualityValue; massTon: number }>();

  records.forEach((record) => {
    const value = record.qualityValues[qualityId];

    if ((value === null || value === undefined) || !isPositiveFiniteNumber(record.massTon)) {
      return;
    }

    const key = getQualityValueKey(value);

    if (!key) {
      return;
    }

    const current = groupedMass.get(key);

    if (current) {
      current.massTon += record.massTon;
      return;
    }

    groupedMass.set(key, {
      value,
      massTon: record.massTon,
    });
  });

  const dominant = [...groupedMass.values()].sort((left, right) => right.massTon - left.massTon)[0];
  return dominant?.value ?? null;
}

export function getMassWeightedNumericalAverage(
  records: MassWeightedQualityRecord[],
  qualityId: string,
) {
  let representedMassTon = 0;
  let weightedSum = 0;

  records.forEach((record) => {
    const value = record.qualityValues[qualityId];

    if (
      !isPositiveFiniteNumber(record.massTon) ||
      typeof value !== "number" ||
      !Number.isFinite(value)
    ) {
      return;
    }

    representedMassTon += record.massTon;
    weightedSum += value * record.massTon;
  });

  if (representedMassTon <= 0) {
    return null;
  }

  return weightedSum / representedMassTon;
}

export function buildMassWeightedQualitySummary(
  records: MassWeightedQualityRecord[],
  qualities: QualityDefinition[],
): QualityValueMap {
  const qualityValues: QualityValueMap = {};

  qualities.forEach((quality) => {
    qualityValues[quality.id] =
      quality.kind === "numerical"
        ? getMassWeightedNumericalAverage(records, quality.id)
        : getMassWeightedDominantCategoricalValue(records, quality.id);
  });

  return qualityValues;
}
