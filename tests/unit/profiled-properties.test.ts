import { describe, expect, it } from "vitest";
import {
  buildCategoricalProportionBreakdown,
  buildDominantCategoricalEntries,
  splitProfiledQualities,
  type ProfiledPropertyRecord,
} from "@/lib/profiled-properties";
import type { QualityDefinition, QualityValueMap } from "@/types/app-data";

const qualities: QualityDefinition[] = [
  {
    id: "q_num_fe",
    kind: "numerical",
    label: "Fe",
    description: "Iron grade",
    min: 0,
    max: 2,
    palette: ["#153a63", "#2b8cff", "#59ddff", "#f4bc63"],
  },
  {
    id: "q_cat_materialtype_main",
    kind: "categorical",
    label: "Material Type",
    description: "Dominant material type",
    palette: ["#59ddff", "#f4bc63", "#ff7d7d"],
    categories: [
      { value: 10001, label: "Chalcopyrite", color: "#59ddff" },
      { value: 10002, label: "Bornite", color: "#f4bc63" },
      { value: 10003, label: "Malachite", color: "#ff7d7d" },
    ],
  },
];

const values: QualityValueMap = {
  q_num_fe: 1.12,
  q_cat_materialtype_main: 10001,
};

const records: ProfiledPropertyRecord[] = [
  {
    massTon: 30,
    qualityValues: {
      q_num_fe: 1.1,
      q_cat_materialtype_main: 10001,
    },
  },
  {
    massTon: 20,
    qualityValues: {
      q_num_fe: 1.2,
      q_cat_materialtype_main: 10003,
    },
  },
  {
    massTon: 10,
    qualityValues: {
      q_num_fe: 1.18,
      q_cat_materialtype_main: 10001,
    },
  },
];

describe("profiled properties helpers", () => {
  it("splits available numerical and categorical qualities", () => {
    const result = splitProfiledQualities(qualities, values);

    expect(result.numericalQualities.map((quality) => quality.id)).toEqual(["q_num_fe"]);
    expect(result.categoricalQualities.map((quality) => quality.id)).toEqual([
      "q_cat_materialtype_main",
    ]);
  });

  it("builds a mass-weighted categorical proportion breakdown", () => {
    const breakdown = buildCategoricalProportionBreakdown(qualities[1]!, records);

    expect(breakdown?.totalMassTon).toBe(60);
    expect(breakdown?.dominant?.label).toBe("Chalcopyrite");
    expect(breakdown?.segments[0]?.ratio).toBeCloseTo(2 / 3, 5);
    expect(breakdown?.segments[1]?.label).toBe("Malachite");
  });

  it("prefers record-driven dominant categorical values over aggregate-only values", () => {
    const entries = buildDominantCategoricalEntries(qualities, values, records);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      label: "Chalcopyrite",
      source: "records",
    });
    expect(entries[0]?.ratio).toBeCloseTo(2 / 3, 5);
  });
});
