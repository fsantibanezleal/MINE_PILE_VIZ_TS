import { describe, expect, it } from "vitest";
import { getStockpileAnchorPlacements } from "@/lib/stockpile-anchor-layout";
import type { GraphAnchor } from "@/types/app-data";

describe("getStockpileAnchorPlacements", () => {
  it("keeps multiple anchors ordered and separated across the pile width", () => {
    const anchors: GraphAnchor[] = [
      {
        id: "feed-west",
        label: "Feed west",
        kind: "input",
        x: 0.24,
        y: 0.1,
        relatedObjectId: "belt_a",
      },
      {
        id: "feed-east",
        label: "Feed east",
        kind: "input",
        x: 0.78,
        y: 0.1,
        relatedObjectId: "belt_a",
      },
    ];

    const placements = getStockpileAnchorPlacements(anchors);

    expect(placements).toHaveLength(2);
    expect(placements[0]!.anchor.id).toBe("feed-west");
    expect(placements[1]!.anchor.id).toBe("feed-east");
    expect(placements[0]!.normalizedX).toBeLessThan(placements[1]!.normalizedX);
    expect(placements[1]!.normalizedX - placements[0]!.normalizedX).toBeGreaterThan(0.2);
  });

  it("keeps a single anchor inside the visible pile frame", () => {
    const placements = getStockpileAnchorPlacements([
      {
        id: "reclaim",
        label: "Reclaim",
        kind: "output",
        x: 0.55,
        y: 0.9,
        relatedObjectId: "belt_b",
      },
    ]);

    expect(placements).toHaveLength(1);
    expect(placements[0]!.normalizedX).toBeGreaterThanOrEqual(0.12);
    expect(placements[0]!.normalizedX).toBeLessThanOrEqual(0.88);
  });
});
