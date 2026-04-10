export const MIN_VERTICAL_COMPRESSION_FACTOR = 1;
export const MAX_VERTICAL_COMPRESSION_FACTOR = 1000;

export function clampVerticalCompressionFactor(
  factor: number | undefined,
) {
  if (!Number.isFinite(factor)) {
    return MIN_VERTICAL_COMPRESSION_FACTOR;
  }

  const normalizedFactor = factor as number;

  return Math.min(
    MAX_VERTICAL_COMPRESSION_FACTOR,
    Math.max(MIN_VERTICAL_COMPRESSION_FACTOR, Math.round(normalizedFactor)),
  );
}

export function getVerticalCompressionScale(
  factor: number | undefined,
) {
  return 1 / clampVerticalCompressionFactor(factor);
}
