import { describe, expect, it } from "vitest";
import {
  buildCircuitPresentation,
  getPresentationAnchorPoint,
  getPresentationAnchorPoint3d,
  getPresentationStageFootprint3d,
  type CircuitPresentationNode,
} from "@/lib/circuit-presentation";
import type { CircuitGraph } from "@/types/app-data";

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
  z: 1.8,
  width: 138,
  height: 120,
};

const mixedStageGraph: CircuitGraph = {
  stages: [{ index: 0, label: "Transport", nodeIds: ["belt_cv200", "pile_stockpile"] }],
  nodes: [
    {
      id: "belt_cv200",
      objectId: "belt_cv200",
      objectType: "belt",
      objectRole: "physical",
      label: "CV 200",
      stageIndex: 0,
      dimension: 1,
      isProfiled: true,
      shortDescription: "Conveyor",
      inputs: [],
      outputs: [],
    },
    {
      id: "pile_stockpile",
      objectId: "pile_stockpile",
      objectType: "pile",
      objectRole: "physical",
      label: "Plant Stockpile",
      stageIndex: 0,
      dimension: 3,
      isProfiled: true,
      shortDescription: "Stockpile",
      inputs: [],
      outputs: [],
    },
  ],
  edges: [],
};

const multiStageGraph: CircuitGraph = {
  stages: [
    { index: 0, label: "Feed", nodeIds: ["belt_feed"] },
    { index: 1, label: "Stockpile", nodeIds: ["pile_a"] },
  ],
  nodes: [
    {
      id: "belt_feed",
      objectId: "belt_feed",
      objectType: "belt",
      objectRole: "physical",
      label: "Feed Conveyor",
      stageIndex: 0,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Feed conveyor",
      inputs: [],
      outputs: [],
    },
    {
      id: "pile_a",
      objectId: "pile_a",
      objectType: "pile",
      objectRole: "physical",
      label: "Pile A",
      stageIndex: 1,
      dimension: 3,
      isProfiled: false,
      shortDescription: "Stockpile",
      inputs: [],
      outputs: [],
    },
  ],
  edges: [],
};

const localDependencyGraph: CircuitGraph = {
  stages: [
    {
      index: 0,
      label: "Same stage flow",
      nodeIds: ["a", "b", "c"],
    },
  ],
  nodes: [
    {
      id: "a",
      objectId: "a",
      objectType: "belt",
      objectRole: "physical",
      label: "A",
      stageIndex: 0,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Source",
      inputs: [],
      outputs: [],
    },
    {
      id: "b",
      objectId: "b",
      objectType: "belt",
      objectRole: "virtual",
      label: "B",
      stageIndex: 0,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Branch 1",
      inputs: [],
      outputs: [],
    },
    {
      id: "c",
      objectId: "c",
      objectType: "pile",
      objectRole: "virtual",
      label: "C",
      stageIndex: 0,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Branch 2",
      inputs: [],
      outputs: [],
    },
  ],
  edges: [
    { id: "a-b", source: "a", target: "b", label: "a-b" },
    { id: "a-c", source: "a", target: "c", label: "a-c" },
  ],
};

const branchFanoutGraph: CircuitGraph = {
  stages: [
    { index: 0, label: "Accumulation", nodeIds: ["pile_stockpile"] },
    {
      index: 1,
      label: "Discharge",
      nodeIds: ["vbelt_out_west", "vbelt_out_center", "vbelt_out_east"],
    },
  ],
  nodes: [
    {
      id: "pile_stockpile",
      objectId: "pile_stockpile",
      objectType: "pile",
      objectRole: "physical",
      label: "Plant Stockpile",
      stageIndex: 0,
      dimension: 3,
      isProfiled: true,
      shortDescription: "Stockpile",
      inputs: [],
      outputs: [
        {
          id: "out-west",
          label: "West",
          kind: "output",
          x: 0.18,
          y: 0.9,
          relatedObjectId: "vbelt_out_west",
        },
        {
          id: "out-center",
          label: "Center",
          kind: "output",
          x: 0.5,
          y: 0.9,
          relatedObjectId: "vbelt_out_center",
        },
        {
          id: "out-east",
          label: "East",
          kind: "output",
          x: 0.82,
          y: 0.9,
          relatedObjectId: "vbelt_out_east",
        },
      ],
    },
    {
      id: "vbelt_out_west",
      objectId: "vbelt_out_west",
      objectType: "belt",
      objectRole: "virtual",
      label: "Out West",
      stageIndex: 1,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Virtual belt west",
      inputs: [],
      outputs: [],
    },
    {
      id: "vbelt_out_center",
      objectId: "vbelt_out_center",
      objectType: "belt",
      objectRole: "virtual",
      label: "Out Center",
      stageIndex: 1,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Virtual belt center",
      inputs: [],
      outputs: [],
    },
    {
      id: "vbelt_out_east",
      objectId: "vbelt_out_east",
      objectType: "belt",
      objectRole: "virtual",
      label: "Out East",
      stageIndex: 1,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Virtual belt east",
      inputs: [],
      outputs: [],
    },
  ],
  edges: [
    {
      id: "edge-west",
      source: "pile_stockpile",
      target: "vbelt_out_west",
      label: "west route",
    },
    {
      id: "edge-center",
      source: "pile_stockpile",
      target: "vbelt_out_center",
      label: "center route",
    },
    {
      id: "edge-east",
      source: "pile_stockpile",
      target: "vbelt_out_east",
      label: "east route",
    },
  ],
};

const sameStageBranchGraph: CircuitGraph = {
  stages: [
    {
      index: 0,
      label: "Discharge board",
      nodeIds: ["pile_source", "vbelt_west", "vbelt_east", "lane_west", "lane_east"],
    },
  ],
  nodes: [
    {
      id: "pile_source",
      objectId: "pile_source",
      objectType: "pile",
      objectRole: "physical",
      label: "Pile source",
      stageIndex: 0,
      dimension: 3,
      isProfiled: true,
      shortDescription: "Pile source",
      inputs: [],
      outputs: [
        {
          id: "pile-out-west",
          label: "West",
          kind: "output",
          x: 0.18,
          y: 0.9,
          relatedObjectId: "vbelt_west",
        },
        {
          id: "pile-out-east",
          label: "East",
          kind: "output",
          x: 0.82,
          y: 0.9,
          relatedObjectId: "vbelt_east",
        },
      ],
    },
    {
      id: "vbelt_west",
      objectId: "vbelt_west",
      objectType: "belt",
      objectRole: "virtual",
      label: "Virtual west",
      stageIndex: 0,
      dimension: 1,
      isProfiled: false,
      shortDescription: "West branch",
      inputs: [],
      outputs: [],
    },
    {
      id: "vbelt_east",
      objectId: "vbelt_east",
      objectType: "belt",
      objectRole: "virtual",
      label: "Virtual east",
      stageIndex: 0,
      dimension: 1,
      isProfiled: false,
      shortDescription: "East branch",
      inputs: [],
      outputs: [],
    },
    {
      id: "lane_west",
      objectId: "lane_west",
      objectType: "belt",
      objectRole: "virtual",
      label: "Lane west",
      stageIndex: 0,
      dimension: 1,
      isProfiled: false,
      shortDescription: "West lane",
      inputs: [],
      outputs: [],
    },
    {
      id: "lane_east",
      objectId: "lane_east",
      objectType: "belt",
      objectRole: "virtual",
      label: "Lane east",
      stageIndex: 0,
      dimension: 1,
      isProfiled: false,
      shortDescription: "East lane",
      inputs: [],
      outputs: [],
    },
  ],
  edges: [
    { id: "source-west", source: "pile_source", target: "vbelt_west", label: "west" },
    { id: "source-east", source: "pile_source", target: "vbelt_east", label: "east" },
    { id: "west-lane", source: "vbelt_west", target: "lane_west", label: "west lane" },
    { id: "east-lane", source: "vbelt_east", target: "lane_east", label: "east lane" },
  ],
};

describe("buildCircuitPresentation", () => {
  it("stacks disconnected objects vertically inside the same stage column", () => {
    const presentation = buildCircuitPresentation(mixedStageGraph);
    const belt = presentation.nodes.find((node) => node.id === "belt_cv200");
    const pile = presentation.nodes.find((node) => node.id === "pile_stockpile");

    expect(belt).toBeDefined();
    expect(pile).toBeDefined();
    expect(Math.abs(belt!.x - pile!.x)).toBeLessThan(1);
    expect(Math.abs(belt!.y - pile!.y)).toBeGreaterThan(120);
  });

  it("makes stage frames tall and contiguous from left to right", () => {
    const presentation = buildCircuitPresentation(multiStageGraph);

    expect(presentation.stageFrameHeight).toBeGreaterThan(760);
    expect(presentation.stages[0]!.x + presentation.stages[0]!.width).toBe(
      presentation.stages[1]!.x,
    );
  });

  it("pushes same-stage receivers to the right while keeping siblings vertically separated", () => {
    const presentation = buildCircuitPresentation(localDependencyGraph);
    const a = presentation.nodes.find((node) => node.id === "a");
    const b = presentation.nodes.find((node) => node.id === "b");
    const c = presentation.nodes.find((node) => node.id === "c");

    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(c).toBeDefined();
    expect(b!.x).toBeGreaterThan(a!.x);
    expect(c!.x).toBeGreaterThan(a!.x);
    expect(Math.abs(b!.x - c!.x)).toBeLessThan(1);
    expect(Math.abs(b!.y - c!.y)).toBeGreaterThan(110);
  });

  it("keeps disconnected downstream branches in the same stage column and separated vertically", () => {
    const presentation = buildCircuitPresentation(branchFanoutGraph);
    const west = presentation.nodes.find((node) => node.id === "vbelt_out_west");
    const center = presentation.nodes.find((node) => node.id === "vbelt_out_center");
    const east = presentation.nodes.find((node) => node.id === "vbelt_out_east");

    expect(west).toBeDefined();
    expect(center).toBeDefined();
    expect(east).toBeDefined();
    expect(Math.abs(west!.x - center!.x)).toBeLessThan(1);
    expect(Math.abs(center!.x - east!.x)).toBeLessThan(1);
    expect(west!.y).toBeLessThan(center!.y);
    expect(center!.y).toBeLessThan(east!.y);
    expect(center!.y - west!.y).toBeGreaterThan(120);
  });

  it("keeps same-stage branch descendants ordered in the same vertical flow direction", () => {
    const presentation = buildCircuitPresentation(sameStageBranchGraph);
    const west = presentation.nodes.find((node) => node.id === "vbelt_west");
    const east = presentation.nodes.find((node) => node.id === "vbelt_east");
    const laneWest = presentation.nodes.find((node) => node.id === "lane_west");
    const laneEast = presentation.nodes.find((node) => node.id === "lane_east");

    expect(west).toBeDefined();
    expect(east).toBeDefined();
    expect(laneWest).toBeDefined();
    expect(laneEast).toBeDefined();
    expect(west!.x).toBeLessThan(laneWest!.x);
    expect(east!.x).toBeLessThan(laneEast!.x);
    expect(west!.y).toBeLessThan(east!.y);
    expect(laneWest!.y).toBeLessThan(laneEast!.y);
  });

  it("maps 3D stage footprints as a shared top-down board", () => {
    const presentation = buildCircuitPresentation(multiStageGraph);
    const footprints = presentation.stages.map((stage) =>
      getPresentationStageFootprint3d(stage),
    );

    expect(footprints).toHaveLength(2);
    expect(footprints[0]!.x).toBeLessThan(footprints[1]!.x);
    expect(Math.abs(footprints[0]!.z - footprints[1]!.z)).toBeLessThan(1e-6);
    expect(Math.abs(footprints[0]!.depth - footprints[1]!.depth)).toBeLessThan(1e-6);
    expect(footprints.every((footprint) => footprint.width > 10)).toBe(true);
    expect(footprints.every((footprint) => footprint.depth > 20)).toBe(true);
  });

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

  it("keeps nodes contained inside their stage frames", () => {
    const presentation = buildCircuitPresentation(branchFanoutGraph);

    presentation.nodes.forEach((node) => {
      const stage = presentation.stages.find((candidate) => candidate.index === node.stageIndex);

      expect(stage).toBeDefined();
      expect(node.x - node.width / 2).toBeGreaterThan(stage!.x);
      expect(node.x + node.width / 2).toBeLessThan(stage!.x + stage!.width);
      expect(node.y - node.height / 2).toBeGreaterThan(presentation.stageFrameTop);
      expect(node.y + node.height / 2).toBeLessThan(
        presentation.stageFrameTop + presentation.stageFrameHeight,
      );
    });
  });
});
