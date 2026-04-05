import type {
  BeltBlockRecord,
  PileCellRecord,
  QualityDefinition,
  QualityValue,
} from "@/types/app-data";

export type MaterialTimeMode =
  | "property"
  | "oldest-age"
  | "newest-age"
  | "material-span";

type MaterialTimeRecord = Pick<
  BeltBlockRecord | PileCellRecord,
  "timestampOldestMs" | "timestampNewestMs"
>;

const MATERIAL_TIME_PALETTE = ["#1f3348", "#3eb7e4", "#f4c96a", "#f2714e"];

const MATERIAL_TIME_MODE_DEFINITIONS: Record<
  Exclude<MaterialTimeMode, "property">,
  QualityDefinition
> = {
  "oldest-age": {
    id: "material_time_oldest_age",
    kind: "numerical",
    label: "Oldest material age",
    description:
      "Age of the oldest represented material relative to the current snapshot timestamp.",
    unit: "ms",
    palette: MATERIAL_TIME_PALETTE,
  },
  "newest-age": {
    id: "material_time_newest_age",
    kind: "numerical",
    label: "Newest material age",
    description:
      "Age of the newest represented material relative to the current snapshot timestamp.",
    unit: "ms",
    palette: MATERIAL_TIME_PALETTE,
  },
  "material-span": {
    id: "material_time_span",
    kind: "numerical",
    label: "Represented material span",
    description:
      "Timestamp span currently represented inside each block or cell.",
    unit: "ms",
    palette: MATERIAL_TIME_PALETTE,
  },
};

export const MATERIAL_TIME_MODE_OPTIONS: Array<{
  id: MaterialTimeMode;
  label: string;
}> = [
  { id: "property", label: "Quality" },
  { id: "oldest-age", label: "Oldest age" },
  { id: "newest-age", label: "Newest age" },
  { id: "material-span", label: "Material span" },
];

function normalizeTimestamp(value: number) {
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getNormalizedBounds(record: MaterialTimeRecord) {
  const oldest = normalizeTimestamp(record.timestampOldestMs);
  const newest = normalizeTimestamp(record.timestampNewestMs);

  if (oldest === null && newest === null) {
    return null;
  }

  const safeOldest = oldest ?? newest!;
  const safeNewest = newest ?? oldest!;

  return {
    oldestMs: Math.min(safeOldest, safeNewest),
    newestMs: Math.max(safeOldest, safeNewest),
  };
}

function normalizeReferenceTimestamp(referenceTimestamp: string | number | null | undefined) {
  if (referenceTimestamp === null || referenceTimestamp === undefined) {
    return null;
  }

  const numericValue =
    typeof referenceTimestamp === "string"
      ? new Date(referenceTimestamp).getTime()
      : referenceTimestamp;

  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
}

export function getMaterialTimeDefinition(
  mode: Exclude<MaterialTimeMode, "property">,
) {
  return MATERIAL_TIME_MODE_DEFINITIONS[mode];
}

export function getMaterialTimeValue(
  record: MaterialTimeRecord,
  mode: MaterialTimeMode,
  referenceTimestamp?: string | number | null,
): QualityValue {
  if (mode === "property") {
    return null;
  }

  const bounds = getNormalizedBounds(record);

  if (!bounds) {
    return null;
  }

  if (mode === "material-span") {
    return Math.max(0, bounds.newestMs - bounds.oldestMs);
  }

  const normalizedReferenceTimestamp = normalizeReferenceTimestamp(referenceTimestamp);

  if (normalizedReferenceTimestamp === null) {
    return null;
  }

  if (mode === "oldest-age") {
    return Math.max(0, normalizedReferenceTimestamp - bounds.oldestMs);
  }

  return Math.max(0, normalizedReferenceTimestamp - bounds.newestMs);
}
