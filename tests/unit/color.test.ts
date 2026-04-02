import { describe, expect, it } from "vitest";
import { deriveNumericColorDomain, getQualityColor } from "@/lib/color";
import type { QualityDefinition } from "@/types/app-data";

const feDefinition: QualityDefinition = {
  id: "q_num_fe",
  kind: "numerical",
  label: "Fe",
  description: "Iron grade",
  min: 0,
  max: 2,
  palette: ["#153a63", "#2b8cff", "#59ddff", "#f4bc63"],
};

const cutDefinition: QualityDefinition = {
  id: "q_num_cut",
  kind: "numerical",
  label: "CuT",
  description: "Total copper grade",
  min: 0,
  max: 2,
  palette: ["#1c2136", "#5b8cff", "#59ddff", "#f4bc63"],
};

describe("color helpers", () => {
  it("prefers configured quality bounds when deriving numerical domains", () => {
    const domain = deriveNumericColorDomain([1.25, 1.3, 1.36], feDefinition);

    expect(domain).toEqual({ min: 0, max: 2 });
  });

  it("produces different colors for different numerical properties with the same raw value", () => {
    const feColor = getQualityColor(feDefinition, 1.25, deriveNumericColorDomain([1.25], feDefinition));
    const cutColor = getQualityColor(cutDefinition, 1.25, deriveNumericColorDomain([1.25], cutDefinition));

    expect(feColor).not.toBe(cutColor);
  });
});
