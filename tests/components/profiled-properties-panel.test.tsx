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
    description: "Dominant material type",
    palette: ["#59ddff", "#f4bc63", "#ff7d7d"],
    categories: [
      { value: 10001, label: "Chalcopyrite", color: "#59ddff" },
      { value: 10002, label: "Bornite", color: "#f4bc63" },
      { value: 10003, label: "Malachite", color: "#ff7d7d" },
    ],
  },
  {
    id: "q_cat_cfp_main",
    kind: "categorical",
    label: "CFP",
    description: "Dominant CFP group",
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
  q_cat_cfp_main: 11002,
};

const records = [
  {
    massTon: 30,
    qualityValues: {
      q_num_fe: 1.1,
      q_cat_materialtype_main: 10001,
      q_cat_cfp_main: 11002,
    },
  },
  {
    massTon: 20,
    qualityValues: {
      q_num_fe: 1.2,
      q_cat_materialtype_main: 10003,
      q_cat_cfp_main: 11002,
    },
  },
  {
    massTon: 10,
    qualityValues: {
      q_num_fe: 1.18,
      q_cat_materialtype_main: 10001,
      q_cat_cfp_main: 11003,
    },
  },
];

describe("ProfiledPropertiesPanel", () => {
  it("separates quantitative, dominant categorical, and proportion views", () => {
    render(
      <ProfiledPropertiesPanel
        qualities={qualities}
        values={values}
        records={records}
      />,
    );

    expect(screen.getByText("Profiled properties")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quantitative" })).toBeInTheDocument();
    expect(screen.getByText("Fe")).toBeInTheDocument();
    expect(screen.getByText("1.12")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dominant" }));

    expect(screen.getByText("Material Type")).toBeInTheDocument();
    expect(screen.getByText("Chalcopyrite")).toBeInTheDocument();
    expect(screen.getByText("66.67% by mass")).toBeInTheDocument();
    expect(screen.getByText("CFP B")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Proportions" }));

    expect(screen.getByText("Categorical property")).toBeInTheDocument();
    expect(screen.getByText("Chalcopyrite")).toBeInTheDocument();
    expect(screen.getByText("Malachite")).toBeInTheDocument();
    expect(screen.getByText("66.67%")).toBeInTheDocument();
    expect(screen.getByText("33.33%")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Categorical property"), {
      target: { value: "q_cat_cfp_main" },
    });

    expect(screen.getByText("CFP B")).toBeInTheDocument();
    expect(screen.getByText("CFP C")).toBeInTheDocument();
    expect(screen.getByText("83.33%")).toBeInTheDocument();
    expect(screen.getByText("16.67%")).toBeInTheDocument();
  });
});
