import type { GraphAnchor } from "@/types/app-data";

export interface StockpileAnchorPlacement {
  anchor: GraphAnchor;
  normalizedX: number;
}

const MIN_X = 0.12;
const MAX_X = 0.88;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getAnchorX(anchor: GraphAnchor) {
  return clamp(anchor.x ?? 0.5, 0, 1);
}

export function getStockpileAnchorPlacements(
  anchors: GraphAnchor[],
): StockpileAnchorPlacement[] {
  if (anchors.length === 0) {
    return [];
  }

  const ordered = anchors
    .map((anchor, index) => ({
      anchor,
      index,
      normalizedX: MIN_X + getAnchorX(anchor) * (MAX_X - MIN_X),
    }))
    .sort(
      (left, right) =>
        left.normalizedX - right.normalizedX || left.index - right.index,
    );

  const evenlySpaced = ordered.map((_, index) => {
    if (ordered.length === 1) {
      return 0.5;
    }

    return MIN_X + ((MAX_X - MIN_X) * index) / (ordered.length - 1);
  });
  const minimumGap = Math.min(
    0.14,
    (MAX_X - MIN_X) / Math.max(ordered.length + 1, 4),
  );
  const positions = ordered.map((entry, index) =>
    clamp(entry.normalizedX * 0.72 + evenlySpaced[index]! * 0.28, MIN_X, MAX_X),
  );

  for (let index = 1; index < positions.length; index += 1) {
    positions[index] = Math.max(positions[index]!, positions[index - 1]! + minimumGap);
  }

  const overflow = positions[positions.length - 1]! - MAX_X;

  if (overflow > 0) {
    for (let index = 0; index < positions.length; index += 1) {
      positions[index] -= overflow;
    }
  }

  for (let index = positions.length - 2; index >= 0; index -= 1) {
    positions[index] = Math.min(positions[index]!, positions[index + 1]! - minimumGap);
  }

  const underflow = MIN_X - positions[0]!;

  if (underflow > 0) {
    for (let index = 0; index < positions.length; index += 1) {
      positions[index] += underflow;
    }
  }

  return ordered.map((entry, index) => ({
    anchor: entry.anchor,
    normalizedX: positions[index]!,
  }));
}
