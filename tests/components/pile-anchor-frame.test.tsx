import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PileAnchorFrame } from "@/components/stockpiles/pile-anchor-frame";
import type { GraphAnchor } from "@/types/app-data";

const outputs: GraphAnchor[] = [
  {
    id: "out-west",
    label: "West reclaim",
    kind: "output",
    x: 0.25,
    y: 0.9,
    relatedObjectId: "vbelt_west",
  },
  {
    id: "out-east",
    label: "East reclaim",
    kind: "output",
    x: 0.75,
    y: 0.9,
    relatedObjectId: "vbelt_east",
  },
];

describe("PileAnchorFrame", () => {
  it("highlights the active output anchor in the external track and the in-figure overlay", () => {
    render(
      <PileAnchorFrame
        inputs={[]}
        outputs={outputs}
        showInFigureAnchors
        activeOutputId="out-east"
      >
        <div>pile</div>
      </PileAnchorFrame>,
    );

    expect(
      screen.getByLabelText("East reclaim").className.includes("pile-anchor--active"),
    ).toBe(true);
    expect(
      screen
        .getByTestId("pile-anchor-overlay-output")
        .querySelectorAll(".pile-anchor-overlay__item--active"),
    ).toHaveLength(1);
  });
});
