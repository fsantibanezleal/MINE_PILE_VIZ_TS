import { describe, expect, it } from "vitest";
import { buildScenarioMassHistogram } from "@/lib/simulator-histogram";
import type { ProfilerSummaryRow, QualityDefinition } from "@/types/app-data";

const numericalQuality: QualityDefinition = {
  id: "q_num_fe",
  kind: "numerical",
  label: "Fe",
  description: "Iron grade",
  min: 0,
  max: 2,
  palette: ["#153a63", "#59ddff", "#f4bc63"],
};

const categoricalQuality: QualityDefinition = {
  id: "q_cat_material",
  kind: "categorical",
  label: "Material",
  description: "Material type",
  palette: ["#153a63", "#59ddff", "#f4bc63"],
  categories: [
    { value: 1, label: "Primary", color: "#153a63" },
    { value: 2, label: "Secondary", color: "#59ddff" },
  ],
};

const rows: ProfilerSummaryRow[] = [
  {
    snapshotId: "20250319010000",
    timestamp: "2025-03-19T01:00:00Z",
    objectId: "pile_a",
    objectType: "pile",
    displayName: "Pile A",
    dimension: 1,
    massTon: 100,
    qualityValues: { q_num_fe: 1.0, q_cat_material: 1 },
  },
  {
    snapshotId: "20250319010000",
    timestamp: "2025-03-19T01:00:00Z",
    objectId: "belt_b",
    objectType: "belt",
    displayName: "Belt B",
    dimension: 1,
    massTon: 60,
    qualityValues: { q_num_fe: 1.5, q_cat_material: 2 },
  },
];

describe("buildScenarioMassHistogram", () => {
  it("builds a numerical mass-weighted histogram from scenario rows", () => {
    const histogram = buildScenarioMassHistogram(rows, numericalQuality, {
      binCount: 2,
    });

    expect(histogram.kind).toBe("numerical");
    if (histogram.kind !== "numerical") {
      return;
    }

    expect(histogram.representedMassTon).toBe(160);
    expect(histogram.weightedMean).toBeCloseTo(1.1875, 4);
    expect(histogram.bins).toHaveLength(2);
    expect(histogram.bins.map((bin) => bin.massTon)).toEqual([100, 60]);
  });

  it("builds a categorical mass-weighted histogram from scenario rows", () => {
    const histogram = buildScenarioMassHistogram(rows, categoricalQuality);

    expect(histogram.kind).toBe("categorical");
    if (histogram.kind !== "categorical") {
      return;
    }

    expect(histogram.representedMassTon).toBe(160);
    expect(histogram.bins).toHaveLength(2);
    expect(histogram.bins.map((bin) => bin.label)).toEqual(["Primary", "Secondary"]);
  });
});
