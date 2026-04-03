import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CellFocusPanel } from "@/components/ui/cell-focus-panel";
import type { PileCellRecord, QualityDefinition } from "@/types/app-data";

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
    id: "q_cat_mineral_main",
    kind: "categorical",
    label: "Mineral",
    description: "Predominant mineral",
    palette: ["#2f90ff", "#f4bc63", "#46d6a7"],
    categories: [
      { value: "calcopirita", label: "Chalcopyrite", color: "#f4bc63" },
      { value: "bornita", label: "Bornite", color: "#2f90ff" },
    ],
  },
];

const hoveredCell: PileCellRecord = {
  ix: 2,
  iy: 1,
  iz: 0,
  massTon: 12.5,
  timestampOldestMs: 0,
  timestampNewestMs: 0,
  qualityValues: {
    q_num_fe: 0.42,
    q_cat_mineral_main: "calcopirita",
  },
};

describe("CellFocusPanel", () => {
  it("renders hovered cell metrics and mapped quality labels", () => {
    render(
      <CellFocusPanel
        hoveredCell={hoveredCell}
        qualities={qualities}
        selectedQuality={qualities[1]}
        emptyMessage="No hover yet."
      />,
    );

    expect(screen.getByText("Cell Focus")).toBeInTheDocument();
    expect(screen.getByText("2, 1, 0")).toBeInTheDocument();
    expect(screen.getByText("12.5 t")).toBeInTheDocument();
    expect(screen.getAllByText("Chalcopyrite").length).toBeGreaterThan(0);
  });

  it("renders an inactive message when the workspace disables hover inspection", () => {
    render(
      <CellFocusPanel
        hoveredCell={hoveredCell}
        qualities={qualities}
        selectedQuality={qualities[0]}
        inactiveMessage="Switch to detail mode first."
        emptyMessage="No hover yet."
      />,
    );

    expect(screen.getByText("Switch to detail mode first.")).toBeInTheDocument();
    expect(screen.queryByText("12.5 t")).not.toBeInTheDocument();
  });

  it("renders the empty-state message when no cell is hovered", () => {
    render(
      <CellFocusPanel
        hoveredCell={null}
        qualities={qualities}
        selectedQuality={qualities[0]}
        emptyMessage="Hover a cell to inspect it."
      />,
    );

    expect(screen.getByText("Hover a cell to inspect it.")).toBeInTheDocument();
  });
});
