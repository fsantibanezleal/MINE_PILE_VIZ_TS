import type {
  QualityCategory,
  QualityDefinition,
  QualityValue,
} from "@/types/app-data";

const CATEGORY_TOLERANCE = 1e-6;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function normalizeQualityValue(rawValue: unknown): QualityValue {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    return rawValue;
  }

  if (typeof rawValue === "bigint") {
    const value = Number(rawValue);
    return Number.isFinite(value) ? value : null;
  }

  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();

    if (trimmed.length === 0) {
      return null;
    }

    const numericValue = Number(trimmed);
    return Number.isFinite(numericValue) ? numericValue : trimmed;
  }

  return null;
}

export function qualityValuesMatch(
  left: QualityValue | undefined,
  right: QualityValue | undefined,
) {
  if (left === null || left === undefined || right === null || right === undefined) {
    return false;
  }

  if (isFiniteNumber(left) && isFiniteNumber(right)) {
    return Math.abs(left - right) <= CATEGORY_TOLERANCE;
  }

  if (typeof left === "string" && typeof right === "string") {
    return left === right;
  }

  if (typeof left === "string" && isFiniteNumber(right)) {
    const coerced = Number(left);
    return Number.isFinite(coerced) && Math.abs(coerced - right) <= CATEGORY_TOLERANCE;
  }

  if (isFiniteNumber(left) && typeof right === "string") {
    const coerced = Number(right);
    return Number.isFinite(coerced) && Math.abs(left - coerced) <= CATEGORY_TOLERANCE;
  }

  return false;
}

export function getQualityValueKey(value: QualityValue | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "number" ? `n:${value}` : `s:${value}`;
}

export function findQualityCategory(
  quality: QualityDefinition,
  value: QualityValue | undefined,
): QualityCategory | undefined {
  if (quality.kind !== "categorical") {
    return undefined;
  }

  return quality.categories?.find((category) => qualityValuesMatch(category.value, value));
}
