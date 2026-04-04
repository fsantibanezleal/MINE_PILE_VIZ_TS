import { describe, expect, it } from "vitest";
import { buildPileStructureSummary } from "@/lib/pile-structure";
import type { PileDataset } from "@/types/app-data";

function createDataset(
  dimension: PileDataset["dimension"],
  extents: PileDataset["extents"],
): Pick<PileDataset, "cells" | "dimension" | "extents"> {
  return {
    dimension,
    extents,
    cells: [
      {
        ix: 0,
        iy: 0,
        iz: 0,
        massTon: 10,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: {},
      },
      {
        ix: 1,
        iy: 0,
        iz: 1,
        massTon: 20,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: {},
      },
      {
        ix: 1,
        iy: 1,
        iz: 2,
        massTon: 30,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: {},
      },
    ],
  };
}

describe("buildPileStructureSummary", () => {
  it("builds a 3D footprint and elevation summary", () => {
    const summary = buildPileStructureSummary(createDataset(3, { x: 2, y: 2, z: 4 }));

    expect(summary.primaryAxis).toBe("z");
    expect(summary.primaryAxisLabel).toBe("Elevation");
    expect(summary.occupiedRatio).toBeCloseTo(3 / 16);
    expect(summary.footprintCoverageRatio).toBeCloseTo(3 / 4);
    expect(summary.activePrimaryCount).toBe(3);
    expect(summary.topActivePrimaryIndex).toBe(2);
    expect(summary.profileBins).toHaveLength(4);
  });

  it("uses the row axis as the primary profile for 2D datasets", () => {
    const summary = buildPileStructureSummary(createDataset(2, { x: 3, y: 3, z: 1 }));

    expect(summary.primaryAxis).toBe("y");
    expect(summary.primaryAxisLabel).toBe("Row");
    expect(summary.axisCoverage).toHaveLength(2);
    expect(summary.profileBins).toHaveLength(3);
  });

  it("uses the x axis for 1D datasets", () => {
    const summary = buildPileStructureSummary(createDataset(1, { x: 5, y: 1, z: 1 }));

    expect(summary.primaryAxis).toBe("x");
    expect(summary.axisCoverage).toEqual([
      expect.objectContaining({
        axis: "x",
        activeCount: 2,
        size: 5,
      }),
    ]);
  });
});
