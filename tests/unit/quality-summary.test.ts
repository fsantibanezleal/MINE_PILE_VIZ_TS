import { describe, expect, it } from "vitest";
import { buildMassWeightedQualitySummary } from "@/lib/quality-summary";
import type { QualityDefinition } from "@/types/app-data";

const qualities: QualityDefinition[] = [
  {
    id: "q_num_fe",
    kind: "numerical",
    label: "Fe",
    description: "Iron grade",
    min: 0,
    max: 2,
    palette: ["#153a63", "#59ddff", "#f4bc63"],
  },
  {
    id: "q_cat_material_main",
    kind: "categorical",
    label: "Material",
    description: "Dominant material",
    palette: ["#59ddff", "#f4bc63", "#ff7d7d"],
    categories: [
      { value: 1, label: "Oxide", color: "#59ddff" },
      { value: 2, label: "Sulfide", color: "#f4bc63" },
      { value: 3, label: "Mixed", color: "#ff7d7d" },
    ],
  },
  {
    id: "q_cat_mineral_main",
    kind: "categorical",
    label: "Mineral",
    description: "Predominant mineral",
    palette: ["#59ddff", "#f4bc63", "#ff7d7d"],
    categories: [
      { value: "chalcopyrite", label: "Chalcopyrite", color: "#f4bc63" },
      { value: "bornite", label: "Bornite", color: "#59ddff" },
    ],
  },
];

describe("quality-summary", () => {
  it("builds one shared mass-weighted summary for numerical and categorical values", () => {
    const summary = buildMassWeightedQualitySummary(
      [
        {
          massTon: 30,
          qualityValues: {
            q_num_fe: 1.1,
            q_cat_material_main: 1,
            q_cat_mineral_main: "chalcopyrite",
          },
        },
        {
          massTon: 70,
          qualityValues: {
            q_num_fe: 1.4,
            q_cat_material_main: 2,
            q_cat_mineral_main: "bornite",
          },
        },
      ],
      qualities,
    );

    expect(summary.q_num_fe).toBeCloseTo(1.31, 6);
    expect(summary.q_cat_material_main).toBe(2);
    expect(summary.q_cat_mineral_main).toBe("bornite");
  });

  it("returns null when a quality has no represented positive-mass values", () => {
    const summary = buildMassWeightedQualitySummary(
      [
        {
          massTon: 0,
          qualityValues: {
            q_num_fe: 1.2,
            q_cat_material_main: 1,
          },
        },
        {
          massTon: 10,
          qualityValues: {
            q_num_fe: null,
            q_cat_material_main: null,
          },
        },
      ],
      qualities.slice(0, 2),
    );

    expect(summary.q_num_fe).toBeNull();
    expect(summary.q_cat_material_main).toBeNull();
  });
});
