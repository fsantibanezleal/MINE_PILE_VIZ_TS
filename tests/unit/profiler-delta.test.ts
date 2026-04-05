import { describe, expect, it } from "vitest";
import { buildProfilerDeltaFrame } from "@/lib/profiler-delta";
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

describe("buildProfilerDeltaFrame", () => {
  it("builds numerical snapshot deltas", () => {
    const frame = buildProfilerDeltaFrame(rows, "s2", numericalQuality);

    expect(frame).not.toBeNull();
    expect(frame?.deltaMassTon).toBe(20);
    expect(frame?.deltaMassSinceStartTon).toBe(20);
    expect(frame?.qualityMode).toBe("numerical");
    expect(frame?.qualityDeltaText).toBe("+0.1");
    expect(frame?.currentQualityValue).toBe("1.2");
    expect(frame?.previousQualityValue).toBe("1.1");
  });

  it("builds categorical change summaries", () => {
    const frame = buildProfilerDeltaFrame(rows, "s2", categoricalQuality);

    expect(frame).not.toBeNull();
    expect(frame?.qualityMode).toBe("categorical");
    expect(frame?.qualityDeltaText).toBe("Changed");
    expect(frame?.currentQualityValue).toBe("Pyrite");
    expect(frame?.previousQualityValue).toBe("Chalcopyrite");
  });

  it("keeps quality comparison available even under material-time coloring", () => {
    const frame = buildProfilerDeltaFrame(rows, "s2");

    expect(frame).not.toBeNull();
    expect(frame?.qualityMode).toBe("unavailable");
    expect(frame?.qualityDeltaText).toBe("Time coloring active");
  });
});
