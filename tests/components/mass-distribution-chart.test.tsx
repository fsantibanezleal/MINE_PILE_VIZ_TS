import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MassDistributionChart } from "@/components/ui/mass-distribution-chart";
import type { MassDistribution } from "@/lib/mass-distribution";
import type { QualityDefinition } from "@/types/app-data";

const numericalQuality: QualityDefinition = {
  id: "q_num_fe",
  kind: "numerical",
  label: "Fe grade",
  description: "Iron grade",
  min: 0,
  max: 2,
  palette: ["#153a63", "#2b8cff", "#59ddff", "#f4bc63"],
};

const categoricalQuality: QualityDefinition = {
  id: "q_cat_materialtype_main",
  kind: "categorical",
  label: "Predominant materialtype",
  description: "Material type",
  palette: ["#56B4E9", "#E69F00", "#CC79A7"],
  categories: [
    { value: 10001, label: "Oxide 1", color: "#56B4E9" },
    { value: 10002, label: "Oxide 2", color: "#E69F00" },
    { value: 10003, label: "High copper", color: "#CC79A7" },
  ],
};

describe("MassDistributionChart", () => {
  it("renders a literal numerical histogram with SVG bars and axis titles", () => {
    const distribution: MassDistribution = {
      kind: "numerical",
      totalMassTon: 200,
      representedMassTon: 200,
      weightedMean: 0.545,
      domain: { min: 0.3, max: 0.9 },
      maxBinMassTon: 105,
      bins: [
        { start: 0.3, end: 0.5, center: 0.4, massTon: 105, recordCount: 1 },
        { start: 0.5, end: 0.7, center: 0.6, massTon: 20, recordCount: 1 },
        { start: 0.7, end: 0.9, center: 0.8, massTon: 75, recordCount: 1 },
      ],
    };

    const { container } = render(
      <MassDistributionChart
        distribution={distribution}
        quality={numericalQuality}
        subjectLabel="Test belt"
        recordLabel="blocks"
      />,
    );

    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("Represented mass per bin")).toBeInTheDocument();
    expect(screen.getByText("Fe grade value bins")).toBeInTheDocument();
  });

  it("keeps categorical views on the qualitative proportion layout", () => {
    const distribution: MassDistribution = {
      kind: "categorical",
      totalMassTon: 200,
      representedMassTon: 200,
      dominantLabel: "High copper",
      dominantRatio: 0.5,
      bins: [
        {
          value: 10003,
          label: "High copper",
          color: "#CC79A7",
          massTon: 100,
          ratio: 0.5,
          recordCount: 3,
        },
        {
          value: 10002,
          label: "Oxide 2",
          color: "#E69F00",
          massTon: 60,
          ratio: 0.3,
          recordCount: 2,
        },
      ],
    };

    const { container } = render(
      <MassDistributionChart
        distribution={distribution}
        quality={categoricalQuality}
        subjectLabel="Test pile"
        recordLabel="cells"
      />,
    );

    expect(container.querySelector(".belt-histogram__pie")).not.toBeNull();
    expect(screen.getAllByText("High copper").length).toBeGreaterThan(0);
  });
});
