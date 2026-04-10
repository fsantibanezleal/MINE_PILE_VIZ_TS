import { describe, expect, it } from "vitest";
import {
  buildPileSurfaceColumns,
  getPileSurfaceColumnValue,
} from "@/lib/pile-surface";
import type { PileCellRecord, QualityDefinition } from "@/types/app-data";

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
  id: "q_cat_materialtype_main",
  kind: "categorical",
  label: "Material type",
  description: "Predominant material type",
  palette: ["#59ddff", "#f4bc63", "#ff7d7d"],
  categories: [
    { value: 10001, label: "Oxide 1", color: "#59ddff" },
    { value: 10002, label: "Oxide 2", color: "#f4bc63" },
    { value: 10003, label: "High Copper", color: "#ff7d7d" },
  ],
};

function createCell(
  ix: number,
  iy: number,
  iz: number,
  massTon: number,
  qualityValues: PileCellRecord["qualityValues"],
): PileCellRecord {
  return {
    ix,
    iy,
    iz,
    massTon,
    timestampOldestMs: 1,
    timestampNewestMs: 2,
    qualityValues,
  };
}

describe("pile-surface", () => {
  it("builds top-surface columns with top-cell and mass-weighted numerical values", () => {
    const columns = buildPileSurfaceColumns(
      [
        createCell(0, 0, 0, 10, { q_num_fe: 0.4 }),
        createCell(0, 0, 1, 15, { q_num_fe: 0.9 }),
        createCell(1, 0, 0, 20, { q_num_fe: 1.4 }),
      ],
      numericalQuality,
    );

    expect(columns).toHaveLength(2);
    expect(columns[0]?.height).toBe(2);
    expect(columns[0]?.topCell.iz).toBe(1);
    expect(columns[0]?.topValue).toBe(0.9);
    expect(columns[0]?.columnValue).toBeCloseTo((10 * 0.4 + 15 * 0.9) / 25, 5);
    expect(getPileSurfaceColumnValue(columns[0]!, "top-cell")).toBe(0.9);
    expect(getPileSurfaceColumnValue(columns[0]!, "column-mass-weighted")).toBeCloseTo(
      (10 * 0.4 + 15 * 0.9) / 25,
      5,
    );
  });

  it("builds top-surface columns with top-cell and dominant categorical values", () => {
    const columns = buildPileSurfaceColumns(
      [
        createCell(0, 0, 0, 20, { q_cat_materialtype_main: 10001 }),
        createCell(0, 0, 1, 5, { q_cat_materialtype_main: 10002 }),
        createCell(0, 0, 2, 6, { q_cat_materialtype_main: 10002 }),
      ],
      categoricalQuality,
    );

    expect(columns).toHaveLength(1);
    expect(columns[0]?.height).toBe(3);
    expect(columns[0]?.topValue).toBe(10002);
    expect(columns[0]?.columnValue).toBe(10001);
    expect(getPileSurfaceColumnValue(columns[0]!, "top-cell")).toBe(10002);
    expect(getPileSurfaceColumnValue(columns[0]!, "column-mass-weighted")).toBe(10001);
  });
});
