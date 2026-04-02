import { describe, expect, it } from "vitest";
import {
  getPresentationAnchorPoint,
  getPresentationAnchorPoint3d,
  type CircuitPresentationNode,
} from "@/lib/circuit-presentation";

const pileNode: CircuitPresentationNode = {
  id: "pile_stockpile",
  objectId: "pile_stockpile",
  objectType: "pile",
  objectRole: "physical",
  label: "Plant Stockpile",
  stageIndex: 3,
  dimension: 3,
  isProfiled: true,
  shortDescription: "Main 3D accumulation object",
  inputs: [
    {
      id: "stockpile-in-west",
      label: "Feed point west",
      kind: "input",
      x: 0.24,
      y: 0.15,
      relatedObjectId: "belt_cv200",
    },
    {
      id: "stockpile-in-east",
      label: "Feed point east",
      kind: "input",
      x: 0.78,
      y: 0.15,
      relatedObjectId: "belt_cv200",
    },
  ],
  outputs: [
    {
      id: "stockpile-out-west",
      label: "Reclaim west",
      kind: "output",
      x: 0.26,
      y: 0.9,
      relatedObjectId: "vpile_out_cv301",
    },
    {
      id: "stockpile-out-east",
      label: "Reclaim east",
      kind: "output",
      x: 0.74,
      y: 0.9,
      relatedObjectId: "vpile_out_cv301",
    },
  ],
  visualKind: "physical-pile",
  x: 520,
  y: 234,
  width: 126,
  height: 104,
};

describe("circuit pile anchor presentation", () => {
  it("keeps multiple feed anchors distinct in the 2D illustration", () => {
    const points = pileNode.inputs.map((anchor) =>
      getPresentationAnchorPoint(pileNode, anchor, "input"),
    );

    expect(points[0]!.x).toBeLessThan(points[1]!.x);
    expect(Math.abs(points[1]!.x - points[0]!.x)).toBeGreaterThan(24);
    expect(points.every((point) => point.y < pileNode.y - pileNode.height / 2)).toBe(true);
  });

  it("keeps multiple reclaim anchors distinct in the 3D illustration", () => {
    const points = pileNode.outputs.map((anchor) =>
      getPresentationAnchorPoint3d(pileNode, anchor, "output"),
    );

    expect(points[0]!.x).toBeLessThan(points[1]!.x);
    expect(points[0]!.z).toBeLessThan(points[1]!.z);
    expect(points.every((point) => point.y === 0.52)).toBe(true);
  });
});
