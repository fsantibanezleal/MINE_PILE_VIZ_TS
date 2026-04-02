import { describe, expect, it } from "vitest";
import { buildBeltMassHistogram } from "@/lib/live-histogram";
import type { BeltSnapshot, QualityDefinition } from "@/types/app-data";

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
  id: "q_cat_type",
  kind: "categorical",
  label: "Material Type",
  description: "Material family",
  palette: ["#59ddff", "#f4bc63", "#ff7d7d"],
  categories: [
    { value: 10001, label: "Oxide", color: "#59ddff" },
    { value: 10002, label: "Mixed", color: "#f4bc63" },
    { value: 10003, label: "Sulfide", color: "#ff7d7d" },
  ],
};

const stringCategoricalQuality: QualityDefinition = {
  id: "q_cat_mineral",
  kind: "categorical",
  label: "Mineral",
  description: "Predominant mineral",
  palette: ["#2f90ff", "#f4bc63", "#46d6a7"],
  categories: [
    { value: "calcopirita", label: "Chalcopyrite", color: "#f4bc63" },
    { value: "bornita", label: "Bornite", color: "#2f90ff" },
    { value: "pirita", label: "Pyrite", color: "#46d6a7" },
  ],
};

const snapshot: BeltSnapshot = {
  objectId: "belt_cv200",
  displayName: "CV 200",
  timestamp: "2025-03-19T01:15:00Z",
  totalMassTon: 120,
  blockCount: 4,
  qualityAverages: { q_num_fe: 1.2, q_cat_type: 10002 },
  blocks: [
    {
      position: 0,
      massTon: 10,
      timestampOldestMs: 1,
      timestampNewestMs: 2,
      qualityValues: { q_num_fe: 0.4, q_cat_type: 10001 },
    },
    {
      position: 1,
      massTon: 20,
      timestampOldestMs: 1,
      timestampNewestMs: 2,
      qualityValues: { q_num_fe: 0.8, q_cat_type: 10001 },
    },
    {
      position: 2,
      massTon: 30,
      timestampOldestMs: 1,
      timestampNewestMs: 2,
      qualityValues: { q_num_fe: 1.4, q_cat_type: 10002 },
    },
    {
      position: 3,
      massTon: 60,
      timestampOldestMs: 1,
      timestampNewestMs: 2,
      qualityValues: { q_num_fe: 1.6, q_cat_type: 10003 },
    },
  ],
};

describe("buildBeltMassHistogram", () => {
  it("aggregates numerical blocks into mass-weighted bins", () => {
    const histogram = buildBeltMassHistogram(snapshot, numericalQuality, { binCount: 2 });

    expect(histogram.kind).toBe("numerical");

    if (histogram.kind !== "numerical") {
      return;
    }

    expect(histogram.representedMassTon).toBe(120);
    expect(histogram.weightedMean).toBeCloseTo(1.3166666667, 5);
    expect(histogram.bins).toHaveLength(2);
    expect(histogram.bins[0]?.massTon).toBe(30);
    expect(histogram.bins[1]?.massTon).toBe(90);
  });

  it("aggregates categorical blocks by mass per category", () => {
    const histogram = buildBeltMassHistogram(snapshot, categoricalQuality);

    expect(histogram.kind).toBe("categorical");

    if (histogram.kind !== "categorical") {
      return;
    }

    expect(histogram.representedMassTon).toBe(120);
    expect(histogram.bins.map((bin) => [bin.label, bin.massTon])).toEqual([
      ["Sulfide", 60],
      ["Oxide", 30],
      ["Mixed", 30],
    ]);
  });

  it("aggregates string-valued categorical blocks by mapped label and mass", () => {
    const histogram = buildBeltMassHistogram(
      {
        ...snapshot,
        qualityAverages: { ...snapshot.qualityAverages, q_cat_mineral: "bornita" },
        blocks: snapshot.blocks.map((block, index) => ({
          ...block,
          qualityValues: {
            ...block.qualityValues,
            q_cat_mineral:
              index < 2 ? "calcopirita" : index === 2 ? "bornita" : "pirita",
          },
        })),
      },
      stringCategoricalQuality,
    );

    expect(histogram.kind).toBe("categorical");

    if (histogram.kind !== "categorical") {
      return;
    }

    expect(histogram.bins.map((bin) => [bin.label, bin.massTon])).toEqual([
      ["Pyrite", 60],
      ["Chalcopyrite", 30],
      ["Bornite", 30],
    ]);
  });
});
