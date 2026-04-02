import { describe, expect, it } from "vitest";
import {
  formatQualityValueDisplay,
  getQualityDisplayLabel,
  humanizeQualityId,
} from "@/lib/quality-display";
import type { QualityDefinition } from "@/types/app-data";

const numericalQuality: QualityDefinition = {
  id: "q_num_al",
  kind: "numerical",
  label: "Al grade",
  description: "Aluminum grade",
  min: 0,
  max: 1,
  palette: ["#153a63", "#59ddff", "#f4bc63"],
};

const categoricalQuality: QualityDefinition = {
  id: "q_cat_materialtype_main",
  kind: "categorical",
  label: "Predominant materialtype",
  description: "Predominant material type",
  palette: ["#56B4E9", "#E69F00", "#CC79A7"],
  categories: [
    { value: 10001, label: "Oxide 1", color: "#56B4E9" },
    { value: 10002, label: "Oxide 2", color: "#E69F00" },
    { value: 10003, label: "High copper", color: "#CC79A7" },
  ],
};

describe("quality display helpers", () => {
  it("keeps configured labels when they are already operator-friendly", () => {
    expect(getQualityDisplayLabel(numericalQuality)).toBe("Al grade");
    expect(getQualityDisplayLabel(categoricalQuality)).toBe(
      "Predominant materialtype",
    );
  });

  it("falls back to a humanized label when a technical id leaks into the label field", () => {
    expect(
      getQualityDisplayLabel({
        ...numericalQuality,
        label: "q_num_al",
      }),
    ).toBe("Al");

    expect(
      getQualityDisplayLabel({
        ...categoricalQuality,
        label: "q_cat_materialtype_main",
      }),
    ).toBe("Predominant Materialtype");
  });

  it("humanizes technical ids for numerical and categorical qualities", () => {
    expect(humanizeQualityId("q_num_cut")).toBe("Cut");
    expect(humanizeQualityId("q_cat_cfp_main")).toBe("Predominant Cfp");
    expect(humanizeQualityId("q_cat_materialtype_prop_other")).toBe(
      "Materialtype proportion other",
    );
  });

  it("formats categorical values through the configured dictionary", () => {
    expect(formatQualityValueDisplay(categoricalQuality, 10003)).toBe("High copper");
    expect(formatQualityValueDisplay(categoricalQuality, 19999)).toBe("19999");
  });

  it("formats numerical values without exposing ids", () => {
    expect(formatQualityValueDisplay(numericalQuality, 0.456)).toBe("0.46");
  });
});
