import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfiledPropertiesPanel } from "@/components/ui/profiled-properties-panel";
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
  {
    id: "q_cat_cfp_main",
    kind: "categorical",
    label: "CFP",
    description: "Predominant CFP group",
    palette: ["#5b8cff", "#59ddff", "#f4bc63"],
    categories: [
      { value: 11001, label: "CFP A", color: "#5b8cff" },
      { value: 11002, label: "CFP B", color: "#59ddff" },
      { value: 11003, label: "CFP C", color: "#f4bc63" },
    ],
  },
];

const values: QualityValueMap = {
  q_num_fe: 1.12,
  q_cat_materialtype_main: 10001,
  q_cat_materialtype_prop_oxido1: 0.2,
  q_cat_materialtype_prop_oxido2: 0.5,
  q_cat_materialtype_prop_other: 0.3,
  q_cat_cfp_main: 11002,
};

const records = [
  {
    massTon: 30,
    qualityValues: {
      q_num_fe: 1.1,
      q_cat_materialtype_main: 10001,
      q_cat_materialtype_prop_oxido1: 0.45,
      q_cat_materialtype_prop_oxido2: 0.15,
      q_cat_materialtype_prop_other: 0.4,
      q_cat_cfp_main: 11002,
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
      q_cat_cfp_main: 11002,
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
      q_cat_cfp_main: 11003,
    },
  },
];

describe("ProfiledPropertiesPanel", () => {
  it("separates quantitative, dominant categorical, and qualitative distribution views", () => {
    render(
      <ProfiledPropertiesPanel
        qualities={qualities}
        values={values}
        records={records}
        totalMassTon={60}
      />,
    );

    expect(screen.getByText("Profiled properties")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quantitative" })).toBeInTheDocument();
    expect(screen.getByText("Fe")).toBeInTheDocument();
    expect(screen.getByText("1.12")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dominant" }));

    expect(screen.getByText("Material Type")).toBeInTheDocument();
    expect(screen.getByText("Oxide 2")).toBeInTheDocument();
    expect(screen.getByText("40.83% from explicit distribution")).toBeInTheDocument();
    expect(screen.getByText("CFP B")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Proportions" }));

    expect(screen.getByText("Qualitative property")).toBeInTheDocument();
    expect(screen.getByText("Explicit proportions")).toBeInTheDocument();
    expect(screen.getByText("Mass-weighted distribution from explicit categorical proportion values.")).toBeInTheDocument();
    expect(screen.getByText("Derived from 3 explicit proportion channels for this qualitative variable.")).toBeInTheDocument();
    expect(screen.getByText("Oxide 2")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
    expect(screen.getByText("24.5 t")).toBeInTheDocument();
    expect(screen.getByText("20 t")).toBeInTheDocument();
    expect(screen.getByText("40.83%")).toBeInTheDocument();
    expect(screen.getByText("33.33%")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Qualitative property"), {
      target: { value: "q_cat_cfp_main" },
    });

    expect(screen.getByText("Predominant-label estimate")).toBeInTheDocument();
    expect(screen.getByText("Estimated from block or cell predominant labels because explicit proportion values are unavailable in this cache.")).toBeInTheDocument();
    expect(screen.getByText("CFP B")).toBeInTheDocument();
    expect(screen.getByText("CFP C")).toBeInTheDocument();
    expect(screen.getByText("83.33%")).toBeInTheDocument();
    expect(screen.getByText("16.67%")).toBeInTheDocument();
  });
});
