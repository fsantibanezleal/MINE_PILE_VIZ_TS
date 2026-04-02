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
  it("switches to a view-scaled domain when the visible values occupy only a narrow slice of the configured range", () => {
    const domain = deriveNumericColorDomain([1.25, 1.3, 1.36], feDefinition);

    expect(domain).toMatchObject({
      mode: "adaptive-local",
    });
    expect(domain?.min ?? 0).toBeLessThan(1.25);
    expect(domain?.max ?? 0).toBeGreaterThan(1.36);
    expect(domain?.max ?? 0).toBeLessThan(2);
  });

  it("keeps configured bounds when the visible values span a broad portion of the configured range", () => {
    const domain = deriveNumericColorDomain([0.15, 1.2], feDefinition);

    expect(domain).toEqual({ min: 0, max: 2, mode: "configured" });
  });

  it("produces different colors for different numerical properties with the same raw value", () => {
    const feColor = getQualityColor(
      feDefinition,
      1.25,
      deriveNumericColorDomain([1.22, 1.25, 1.29], feDefinition),
    );
    const cutColor = getQualityColor(
      cutDefinition,
      1.25,
      deriveNumericColorDomain([1.18, 1.25, 1.36], cutDefinition),
    );

    expect(feColor).not.toBe(cutColor);
  });
});
