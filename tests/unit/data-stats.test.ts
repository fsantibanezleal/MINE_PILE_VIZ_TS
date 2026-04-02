import { describe, expect, it } from "vitest";
import { deriveCellExtents, deriveNumericExtrema } from "@/lib/data-stats";

describe("data-stats", () => {
  it("derives cell extents without spreading large row collections onto Math.max", () => {
    function* rows() {
      for (let index = 0; index < 180_000; index += 1) {
        yield {
          ix: index % 24,
          iy: index % 12,
          iz: index,
        };
      }
    }

    expect(deriveCellExtents(rows())).toEqual({
      x: 24,
      y: 12,
      z: 180_000,
    });
  });

  it("derives numeric extrema without spreading large value collections onto Math.min or Math.max", () => {
    function* values() {
      for (let index = 0; index < 220_000; index += 1) {
        yield {
          value: (index % 17) - 8,
        };
      }
    }

    expect(deriveNumericExtrema(values(), (entry) => entry.value)).toEqual({
      min: -8,
      max: 8,
    });
  });
});
