export interface MaterialTimeRecord {
  massTon: number;
  timestampOldestMs: number;
  timestampNewestMs: number;
}

export interface MaterialTimeSummary {
  recordCount: number;
  totalMassTon: number;
  oldestTimestampMs: number;
  newestTimestampMs: number;
  representedSpanMs: number;
  oldestAgeMs: number | null;
  newestAgeMs: number | null;
}

function normalizeTimestamp(value: number) {
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getNormalizedTimeBounds(record: MaterialTimeRecord) {
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

export function getMaterialTimeSpanMs(record: MaterialTimeRecord) {
  const bounds = getNormalizedTimeBounds(record);

  return bounds ? Math.max(0, bounds.newestMs - bounds.oldestMs) : null;
}

export function buildMaterialTimeSummary(
  records: MaterialTimeRecord[],
  referenceTimestamp?: string | number | null,
): MaterialTimeSummary | null {
  let oldestTimestampMs = Number.POSITIVE_INFINITY;
  let newestTimestampMs = Number.NEGATIVE_INFINITY;
  let validRecordCount = 0;
  let totalMassTon = 0;

  records.forEach((record) => {
    const bounds = getNormalizedTimeBounds(record);

    if (!bounds) {
      return;
    }

    oldestTimestampMs = Math.min(oldestTimestampMs, bounds.oldestMs);
    newestTimestampMs = Math.max(newestTimestampMs, bounds.newestMs);
    validRecordCount += 1;
    totalMassTon += record.massTon;
  });

  if (validRecordCount === 0) {
    return null;
  }

  const normalizedReferenceTimestamp = normalizeReferenceTimestamp(referenceTimestamp);

  return {
    recordCount: validRecordCount,
    totalMassTon,
    oldestTimestampMs,
    newestTimestampMs,
    representedSpanMs: Math.max(0, newestTimestampMs - oldestTimestampMs),
    oldestAgeMs:
      normalizedReferenceTimestamp !== null
        ? Math.max(0, normalizedReferenceTimestamp - oldestTimestampMs)
        : null,
    newestAgeMs:
      normalizedReferenceTimestamp !== null
        ? Math.max(0, normalizedReferenceTimestamp - newestTimestampMs)
        : null,
  };
}
