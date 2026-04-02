import { describe, expect, it } from "vitest";
import {
  buildCategoricalDistributionGroups,
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
    description: "Predominant material type",
    palette: ["#59ddff", "#f4bc63", "#ff7d7d", "#999999"],
    categories: [
      { value: 10001, label: "Oxide 1", color: "#59ddff" },
      { value: 10002, label: "Oxide 2", color: "#f4bc63" },
      { value: 10003, label: "High copper", color: "#ff7d7d" },
      { value: 19999, label: "Other", color: "#999999" },
    ],
  },
  {
    id: "q_cat_materialtype_prop_oxido1",
    kind: "numerical",
    label: "Oxide 1",
    description: "Material type proportion: Oxide 1",
    min: 0,
    max: 1,
    palette: ["#59ddff"],
  },
  {
    id: "q_cat_materialtype_prop_oxido2",
    kind: "numerical",
    label: "Oxide 2",
    description: "Material type proportion: Oxide 2",
    min: 0,
    max: 1,
    palette: ["#f4bc63"],
  },
  {
    id: "q_cat_materialtype_prop_other",
    kind: "numerical",
    label: "Other",
    description: "Material type proportion: Other",
    min: 0,
    max: 1,
    palette: ["#999999"],
  },
];

const values: QualityValueMap = {
  q_num_fe: 1.12,
  q_cat_materialtype_main: 10001,
  q_cat_materialtype_prop_oxido1: 0.2,
  q_cat_materialtype_prop_oxido2: 0.5,
  q_cat_materialtype_prop_other: 0.3,
};

const records: ProfiledPropertyRecord[] = [
  {
    massTon: 30,
    qualityValues: {
      q_num_fe: 1.1,
      q_cat_materialtype_main: 10001,
      q_cat_materialtype_prop_oxido1: 0.45,
      q_cat_materialtype_prop_oxido2: 0.15,
      q_cat_materialtype_prop_other: 0.4,
    },
  },
  {
    massTon: 20,
    qualityValues: {
      q_num_fe: 1.2,
      q_cat_materialtype_main: 10003,
      q_cat_materialtype_prop_oxido1: 0.05,
      q_cat_materialtype_prop_oxido2: 0.8,
      q_cat_materialtype_prop_other: 0.15,
    },
  },
  {
    massTon: 10,
    qualityValues: {
      q_num_fe: 1.18,
      q_cat_materialtype_main: 10001,
      q_cat_materialtype_prop_oxido1: 0.1,
      q_cat_materialtype_prop_oxido2: 0.4,
      q_cat_materialtype_prop_other: 0.5,
    },
  },
];

describe("profiled properties helpers", () => {
  it("keeps proportion channels out of the quantitative summary bucket", () => {
    const result = splitProfiledQualities(qualities, values, records);

    expect(result.numericalQualities.map((quality) => quality.id)).toEqual(["q_num_fe"]);
    expect(result.categoricalQualities.map((quality) => quality.id)).toEqual([
      "q_cat_materialtype_main",
    ]);
    expect(result.proportionQualities.map((quality) => quality.id)).toEqual([
      "q_cat_materialtype_prop_oxido1",
      "q_cat_materialtype_prop_oxido2",
      "q_cat_materialtype_prop_other",
    ]);
  });

  it("maps qualitative main variables to their related proportion channels", () => {
    const groups = buildCategoricalDistributionGroups(
      qualities.filter((quality) => quality.kind === "categorical"),
      qualities,
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.mainQuality.id).toBe("q_cat_materialtype_main");
    expect(groups[0]?.proportionQualities.map((quality) => quality.id)).toEqual([
      "q_cat_materialtype_prop_oxido1",
      "q_cat_materialtype_prop_oxido2",
      "q_cat_materialtype_prop_other",
    ]);
  });

  it("builds a qualitative distribution from explicit proportion channels when records exist", () => {
    const breakdown = buildCategoricalProportionBreakdown(
      qualities[1]!,
      qualities,
      values,
      records,
      60,
    );

    expect(breakdown?.source).toBe("proportion-records");
    expect(breakdown?.totalMassTon).toBe(60);
    expect(breakdown?.segments.map((segment) => segment.label)).toEqual([
      "Oxide 2",
      "Other",
      "Oxide 1",
    ]);
    expect(breakdown?.segments[0]?.ratio).toBeCloseTo(24.5 / 60, 5);
    expect(breakdown?.segments[1]?.ratio).toBeCloseTo(20 / 60, 5);
    expect(breakdown?.segments[2]?.ratio).toBeCloseTo(15.5 / 60, 5);
  });

  it("falls back to aggregate proportion values when record detail is unavailable", () => {
    const breakdown = buildCategoricalProportionBreakdown(
      qualities[1]!,
      qualities,
      values,
      null,
      80,
    );

    expect(breakdown?.source).toBe("proportion-aggregate");
    expect(breakdown?.dominant?.label).toBe("Oxide 2");
    expect(breakdown?.dominant?.ratio).toBeCloseTo(0.5, 5);
    expect(breakdown?.segments.map((segment) => segment.label)).toEqual([
      "Oxide 2",
      "Other",
      "Oxide 1",
    ]);
    expect(
      breakdown?.segments.find((segment) => segment.label === "Other")?.massTon,
    ).toBeCloseTo(24, 5);
  });

  it("prefers proportion-driven dominance over a majority of block main labels", () => {
    const entries = buildDominantCategoricalEntries(
      qualities.filter((quality) => quality.kind === "categorical"),
      qualities,
      values,
      records,
      60,
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      label: "Oxide 2",
      source: "proportion-records",
    });
    expect(entries[0]?.ratio).toBeCloseTo(24.5 / 60, 5);
  });
});
