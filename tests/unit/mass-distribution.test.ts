import { describe, expect, it } from "vitest";
import { buildMassDistribution } from "@/lib/mass-distribution";
import type { QualityDefinition } from "@/types/app-data";

const numericalQuality: QualityDefinition = {
  id: "q_num_cut",
  kind: "numerical",
  label: "CuT",
  description: "Total copper",
  min: 0,
  max: 2,
  palette: ["#153a63", "#59ddff", "#f4bc63"],
};

const categoricalQuality: QualityDefinition = {
  id: "q_cat_materialtype_main",
  kind: "categorical",
  label: "Predominant materialtype",
  description: "Material type",
  palette: ["#56B4E9", "#E69F00", "#CC79A7"],
  categories: [
    { value: 10001, label: "Oxide 1", color: "#56B4E9" },
    { value: 10002, label: "Oxide 2", color: "#E69F00" },
    { value: 10003, label: "High copper", color: "#CC79A7" },
  ],
};

describe("buildMassDistribution", () => {
  it("builds a numerical mass distribution using represented mass inside each interval", () => {
    const distribution = buildMassDistribution(
      [
        { massTon: 105, qualityValues: { q_num_cut: 0.3 } },
        { massTon: 20, qualityValues: { q_num_cut: 0.5 } },
        { massTon: 75, qualityValues: { q_num_cut: 0.9 } },
      ],
      numericalQuality,
      { binCount: 3 },
    );

    expect(distribution.kind).toBe("numerical");

    if (distribution.kind !== "numerical") {
      return;
    }

    expect(distribution.representedMassTon).toBe(200);
    expect(distribution.weightedMean).toBeCloseTo(0.545, 6);
    expect(distribution.bins.map((bin) => bin.massTon)).toEqual([105, 20, 75]);
  });

  it("builds categorical mass shares from mapped qualitative values", () => {
    const distribution = buildMassDistribution(
      [
        { massTon: 40, qualityValues: { q_cat_materialtype_main: 10001 } },
        { massTon: 60, qualityValues: { q_cat_materialtype_main: 10002 } },
        { massTon: 100, qualityValues: { q_cat_materialtype_main: 10003 } },
      ],
      categoricalQuality,
    );

    expect(distribution.kind).toBe("categorical");

    if (distribution.kind !== "categorical") {
      return;
    }

    expect(distribution.representedMassTon).toBe(200);
    expect(distribution.dominantLabel).toBe("High copper");
    expect(distribution.bins.map((bin) => [bin.label, bin.ratio])).toEqual([
      ["High copper", 0.5],
      ["Oxide 2", 0.3],
      ["Oxide 1", 0.2],
    ]);
  });
});
