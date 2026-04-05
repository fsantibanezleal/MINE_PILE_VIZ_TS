import { describe, expect, it } from "vitest";
import { buildProfilerQualitySeries } from "@/lib/profiler-quality-series";
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
  id: "q_cat_mineral_main",
  kind: "categorical",
  label: "Predominant mineral",
  description: "Dominant mineral class",
  palette: ["#153a63", "#59ddff", "#f4bc63"],
  categories: [
    { value: "cpy", label: "Chalcopyrite", color: "#f4bc63" },
    { value: "py", label: "Pyrite", color: "#59ddff" },
  ],
};

const rows: ProfilerSummaryRow[] = [
  {
    snapshotId: "s1",
    timestamp: "2025-03-19T01:00:00Z",
    objectId: "pile_a",
    objectType: "pile",
    displayName: "Pile A",
    dimension: 3,
    massTon: 100,
    qualityValues: { q_num_fe: 1.1, q_cat_mineral_main: "cpy" },
  },
  {
    snapshotId: "s2",
    timestamp: "2025-03-19T01:15:00Z",
    objectId: "pile_a",
    objectType: "pile",
    displayName: "Pile A",
    dimension: 3,
    massTon: 120,
    qualityValues: { q_num_fe: 1.2, q_cat_mineral_main: "py" },
  },
];

describe("buildProfilerQualitySeries", () => {
  it("builds a numerical quality series from profiler summary rows", () => {
    const series = buildProfilerQualitySeries(rows, numericalQuality);

    expect(series.kind).toBe("numerical");

    if (series.kind !== "numerical") {
      return;
    }

    expect(series.points).toHaveLength(2);
    expect(series.firstValue).toBe(1.1);
    expect(series.latestValue).toBe(1.2);
    expect(series.delta).toBeCloseTo(0.1);
  });

  it("builds a categorical quality series with mapped labels", () => {
    const series = buildProfilerQualitySeries(rows, categoricalQuality);

    expect(series.kind).toBe("categorical");

    if (series.kind !== "categorical") {
      return;
    }

    expect(series.points[0]?.label).toBe("Chalcopyrite");
    expect(series.points[1]?.label).toBe("Pyrite");
    expect(series.changeCount).toBe(1);
  });
});
