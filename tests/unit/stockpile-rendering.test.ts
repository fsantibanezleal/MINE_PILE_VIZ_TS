import { describe, expect, it } from "vitest";
import {
  buildAdaptiveFullRenderPlan,
  deriveShellCells,
} from "@/lib/stockpile-rendering";
import type { PileCellRecord } from "@/types/app-data";

function buildCube(size: number) {
  const cells: PileCellRecord[] = [];

  for (let ix = 0; ix < size; ix += 1) {
    for (let iy = 0; iy < size; iy += 1) {
      for (let iz = 0; iz < size; iz += 1) {
        cells.push({
          ix,
          iy,
          iz,
          massTon: 1,
          timestampOldestMs: 0,
          timestampNewestMs: 0,
          qualityValues: {
            q_num_fe: ix + iy + iz,
          },
        });
      }
    }
  }

  return cells;
}

describe("stockpile rendering helpers", () => {
  it("derives a shell that excludes fully enclosed cells", () => {
    const shell = deriveShellCells(buildCube(3));

    expect(shell).toHaveLength(26);
    expect(shell.some((cell) => cell.ix === 1 && cell.iy === 1 && cell.iz === 1)).toBe(
      false,
    );
  });

  it("builds an adaptive full render plan for dense cell sets", () => {
    const cells = buildCube(6);
    const surfaceCells = cells.filter((cell) => cell.iz === 5);
    const plan = buildAdaptiveFullRenderPlan({
      cells,
      surfaceCells,
      threshold: 40,
      suggestedStride: 1,
    });

    expect(plan.strategy).toBe("adaptive");
    expect(plan.renderedCellCount).toBeLessThan(cells.length);
    expect(plan.stride).toBeGreaterThan(1);
    expect(
      plan.cells.some((cell) => cell.ix === 0 && cell.iy === 0 && cell.iz === 0),
    ).toBe(true);
    expect(
      plan.cells.some((cell) => cell.ix === 0 && cell.iy === 0 && cell.iz === 5),
    ).toBe(true);
  });
});
