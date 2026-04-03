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
  width: 126,
  height: 104,
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

const laneSpreadGraph: CircuitGraph = {
  stages: [
    {
      index: 0,
      label: "Illustration stage",
      nodeIds: ["belt_cv200", "pile_stockpile", "vbelt_feed", "vpile_buffer"],
    },
  ],
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
      shortDescription: "Physical conveyor",
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
      shortDescription: "Physical stockpile",
      inputs: [],
      outputs: [],
    },
    {
      id: "vbelt_feed",
      objectId: "vbelt_feed",
      objectType: "belt",
      objectRole: "virtual",
      label: "Virtual Feed",
      stageIndex: 0,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Virtual conveyor",
      inputs: [],
      outputs: [],
    },
    {
      id: "vpile_buffer",
      objectId: "vpile_buffer",
      objectType: "pile",
      objectRole: "virtual",
      label: "Virtual Buffer",
      stageIndex: 0,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Virtual pile",
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
      inputs: [
        {
          id: "in-west",
          label: "From west output",
          kind: "input",
          x: 0,
          y: 0.5,
          relatedObjectId: "pile_stockpile",
        },
      ],
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
      inputs: [
        {
          id: "in-center",
          label: "From center output",
          kind: "input",
          x: 0,
          y: 0.5,
          relatedObjectId: "pile_stockpile",
        },
      ],
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
      inputs: [
        {
          id: "in-east",
          label: "From east output",
          kind: "input",
          x: 0,
          y: 0.5,
          relatedObjectId: "pile_stockpile",
        },
      ],
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

const multiBandFanoutGraph: CircuitGraph = {
  stages: [
    { index: 0, label: "Accumulation", nodeIds: ["pile_stockpile"] },
    {
      index: 1,
      label: "Direct Outputs",
      nodeIds: [
        "vbelt_out_01",
        "vbelt_out_02",
        "vbelt_out_03",
        "vbelt_out_04",
        "vbelt_out_05",
        "vbelt_out_06",
      ],
    },
    {
      index: 2,
      label: "Merged routes",
      nodeIds: ["vpile_out_cv301", "vpile_out_cv302", "vpile_out_cv303"],
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
          id: "out-01",
          label: "Out 01",
          kind: "output",
          x: 0.2,
          y: 0.35,
          relatedObjectId: "vbelt_out_01",
        },
        {
          id: "out-02",
          label: "Out 02",
          kind: "output",
          x: 0.3,
          y: 0.65,
          relatedObjectId: "vbelt_out_02",
        },
        {
          id: "out-03",
          label: "Out 03",
          kind: "output",
          x: 0.45,
          y: 0.35,
          relatedObjectId: "vbelt_out_03",
        },
        {
          id: "out-04",
          label: "Out 04",
          kind: "output",
          x: 0.55,
          y: 0.65,
          relatedObjectId: "vbelt_out_04",
        },
        {
          id: "out-05",
          label: "Out 05",
          kind: "output",
          x: 0.7,
          y: 0.35,
          relatedObjectId: "vbelt_out_05",
        },
        {
          id: "out-06",
          label: "Out 06",
          kind: "output",
          x: 0.8,
          y: 0.65,
          relatedObjectId: "vbelt_out_06",
        },
      ],
    },
    ...Array.from({ length: 6 }, (_, index) => ({
      id: `vbelt_out_0${index + 1}`,
      objectId: `vbelt_out_0${index + 1}`,
      objectType: "belt" as const,
      objectRole: "virtual" as const,
      label: `Out ${index + 1}`,
      stageIndex: 1,
      dimension: 1 as const,
      isProfiled: false,
      shortDescription: "Virtual belt",
      inputs: [],
      outputs: [],
    })),
    {
      id: "vpile_out_cv301",
      objectId: "vpile_out_cv301",
      objectType: "pile",
      objectRole: "virtual",
      label: "Route 301",
      stageIndex: 2,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Merged route 301",
      inputs: [],
      outputs: [],
    },
    {
      id: "vpile_out_cv302",
      objectId: "vpile_out_cv302",
      objectType: "pile",
      objectRole: "virtual",
      label: "Route 302",
      stageIndex: 2,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Merged route 302",
      inputs: [],
      outputs: [],
    },
    {
      id: "vpile_out_cv303",
      objectId: "vpile_out_cv303",
      objectType: "pile",
      objectRole: "virtual",
      label: "Route 303",
      stageIndex: 2,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Merged route 303",
      inputs: [],
      outputs: [],
    },
  ],
  edges: [
    ...Array.from({ length: 6 }, (_, index) => ({
      id: `edge-${index + 1}`,
      source: "pile_stockpile",
      target: `vbelt_out_0${index + 1}`,
      label: `route-${index + 1}`,
    })),
    {
      id: "merge-01",
      source: "vbelt_out_01",
      target: "vpile_out_cv301",
      label: "merge-01",
    },
    {
      id: "merge-02",
      source: "vbelt_out_02",
      target: "vpile_out_cv301",
      label: "merge-02",
    },
    {
      id: "merge-03",
      source: "vbelt_out_03",
      target: "vpile_out_cv302",
      label: "merge-03",
    },
    {
      id: "merge-04",
      source: "vbelt_out_04",
      target: "vpile_out_cv302",
      label: "merge-04",
    },
    {
      id: "merge-05",
      source: "vbelt_out_05",
      target: "vpile_out_cv303",
      label: "merge-05",
    },
    {
      id: "merge-06",
      source: "vbelt_out_06",
      target: "vpile_out_cv303",
      label: "merge-06",
    },
  ],
};

const depthContinuityGraph: CircuitGraph = {
  stages: [
    { index: 0, label: "Pile", nodeIds: ["pile_stockpile"] },
    { index: 1, label: "Direct outputs", nodeIds: ["vbelt_out_01", "vbelt_out_02"] },
    { index: 2, label: "Merge", nodeIds: ["vpile_out_cv301"] },
    { index: 3, label: "Conveyor", nodeIds: ["belt_cv301"] },
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
          id: "out-01",
          label: "Out 01",
          kind: "output",
          x: 0.25,
          y: 0.4,
          relatedObjectId: "vbelt_out_01",
        },
        {
          id: "out-02",
          label: "Out 02",
          kind: "output",
          x: 0.75,
          y: 0.6,
          relatedObjectId: "vbelt_out_02",
        },
      ],
    },
    {
      id: "vbelt_out_01",
      objectId: "vbelt_out_01",
      objectType: "belt",
      objectRole: "virtual",
      label: "Out 01",
      stageIndex: 1,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Virtual belt",
      inputs: [],
      outputs: [],
    },
    {
      id: "vbelt_out_02",
      objectId: "vbelt_out_02",
      objectType: "belt",
      objectRole: "virtual",
      label: "Out 02",
      stageIndex: 1,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Virtual belt",
      inputs: [],
      outputs: [],
    },
    {
      id: "vpile_out_cv301",
      objectId: "vpile_out_cv301",
      objectType: "pile",
      objectRole: "virtual",
      label: "Merge buffer",
      stageIndex: 2,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Virtual merge pile",
      inputs: [],
      outputs: [],
    },
    {
      id: "belt_cv301",
      objectId: "belt_cv301",
      objectType: "belt",
      objectRole: "physical",
      label: "CV301",
      stageIndex: 3,
      dimension: 1,
      isProfiled: true,
      shortDescription: "Physical discharge conveyor",
      inputs: [],
      outputs: [],
    },
  ],
  edges: [
    {
      id: "edge-pile-out-01",
      source: "pile_stockpile",
      target: "vbelt_out_01",
      label: "out-01",
    },
    {
      id: "edge-pile-out-02",
      source: "pile_stockpile",
      target: "vbelt_out_02",
      label: "out-02",
    },
    {
      id: "edge-vbelt-01-merge",
      source: "vbelt_out_01",
      target: "vpile_out_cv301",
      label: "merge-01",
    },
    {
      id: "edge-vbelt-02-merge",
      source: "vbelt_out_02",
      target: "vpile_out_cv301",
      label: "merge-02",
    },
    {
      id: "edge-merge-belt",
      source: "vpile_out_cv301",
      target: "belt_cv301",
      label: "discharge",
    },
  ],
};

describe("circuit pile anchor presentation", () => {
  it("separates belt and pile lanes inside the same stage", () => {
    const presentation = buildCircuitPresentation(mixedStageGraph);
    const belt = presentation.nodes.find((node) => node.id === "belt_cv200");
    const pile = presentation.nodes.find((node) => node.id === "pile_stockpile");

    expect(belt).toBeDefined();
    expect(pile).toBeDefined();
    expect(belt!.y).toBeLessThan(pile!.y);
    expect(belt!.z).toBeLessThan(pile!.z);
    expect(Math.abs(belt!.x - pile!.x)).toBeGreaterThan(20);
  });

  it("uses a taller 2D stage frame and spreads the lanes over it", () => {
    const presentation = buildCircuitPresentation(laneSpreadGraph);
    const nodeYs = presentation.nodes.map((node) => node.y);

    expect(presentation.height).toBeGreaterThanOrEqual(780);
    expect(presentation.stageFrameHeight).toBeGreaterThan(660);
    expect(Math.max(...nodeYs) - Math.min(...nodeYs)).toBeGreaterThan(440);
  });

  it("maps each stage into a ground footprint for the 3D illustration", () => {
    const presentation = buildCircuitPresentation(multiStageGraph);
    const footprints = presentation.stages.map((stage) =>
      getPresentationStageFootprint3d(stage),
    );

    expect(footprints).toHaveLength(2);
    expect(footprints[0]!.x).toBeLessThan(footprints[1]!.x);
    expect(footprints.every((footprint) => footprint.width > 10)).toBe(true);
    expect(footprints.every((footprint) => footprint.depth > 18)).toBe(true);
    expect(footprints.every((footprint) => footprint.height > 0.5)).toBe(true);
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

  it("expands the downstream stage and preserves output ordering for branch fanout", () => {
    const presentation = buildCircuitPresentation(branchFanoutGraph);
    const dischargeStage = presentation.stages.find((stage) => stage.index === 1);
    const west = presentation.nodes.find((node) => node.id === "vbelt_out_west");
    const center = presentation.nodes.find((node) => node.id === "vbelt_out_center");
    const east = presentation.nodes.find((node) => node.id === "vbelt_out_east");

    expect(dischargeStage).toBeDefined();
    expect(dischargeStage!.width).toBeGreaterThan(420);
    expect(west).toBeDefined();
    expect(center).toBeDefined();
    expect(east).toBeDefined();
    expect(west!.x).toBeLessThan(center!.x);
    expect(center!.x).toBeLessThan(east!.x);
    expect(Math.abs(center!.x - west!.x)).toBeGreaterThan(80);
    expect(Math.abs(east!.x - center!.x)).toBeGreaterThan(80);
  });

  it("uses a second spatial band for high-fanout discharge stages", () => {
    const presentation = buildCircuitPresentation(multiBandFanoutGraph);
    const directOutputNodes = presentation.nodes
      .filter((node) => node.stageIndex === 1)
      .sort((left, right) => left.x - right.x);
    const dischargeStage = presentation.stages.find((stage) => stage.index === 1);
    const yValues = directOutputNodes.map((node) => node.y);
    const zValues = directOutputNodes.map((node) => node.z);

    expect(directOutputNodes).toHaveLength(6);
    expect(dischargeStage).toBeDefined();
    expect(directOutputNodes.map((node) => node.id)).toEqual([
      "vbelt_out_01",
      "vbelt_out_02",
      "vbelt_out_03",
      "vbelt_out_04",
      "vbelt_out_05",
      "vbelt_out_06",
    ]);
    expect(Math.max(...yValues) - Math.min(...yValues)).toBeGreaterThan(36);
    expect(Math.max(...zValues) - Math.min(...zValues)).toBeGreaterThan(2.2);
    expect(dischargeStage!.depth).toBeGreaterThan(22);
  });

  it("keeps grouped discharge pairs farther apart than the members inside each pair", () => {
    const presentation = buildCircuitPresentation(multiBandFanoutGraph);
    const directOutputNodes = presentation.nodes
      .filter((node) => node.stageIndex === 1)
      .sort((left, right) => left.x - right.x);
    const gaps = directOutputNodes
      .slice(1)
      .map((node, index) => node.x - directOutputNodes[index]!.x);

    expect(gaps[1]!).toBeGreaterThan(gaps[0]! * 1.5);
    expect(gaps[3]!).toBeGreaterThan(gaps[2]! * 1.5);
  });

  it("keeps downstream physical discharge transport inside the same 3D route zone", () => {
    const presentation = buildCircuitPresentation(depthContinuityGraph);
    const mergeStage = presentation.stages.find((stage) => stage.index === 2);
    const conveyorStage = presentation.stages.find((stage) => stage.index === 3);
    const conveyor = presentation.nodes.find((node) => node.id === "belt_cv301");

    expect(mergeStage).toBeDefined();
    expect(conveyorStage).toBeDefined();
    expect(conveyor).toBeDefined();
    expect(conveyorStage!.z).toBeGreaterThan(0);
    expect(conveyor!.z).toBeGreaterThan(0);
    expect(Math.abs(conveyorStage!.z - mergeStage!.z)).toBeLessThan(8.5);
  });

  it("keeps node centers contained inside the computed stage frames", () => {
    const presentation = buildCircuitPresentation(branchFanoutGraph);

    presentation.nodes.forEach((node) => {
      const stage = presentation.stages.find((candidate) => candidate.index === node.stageIndex);

      expect(stage).toBeDefined();
      const leftMargin = node.x - node.width / 2 - stage!.x;
      const rightMargin = stage!.x + stage!.width - (node.x + node.width / 2);
      expect(node.x - node.width / 2).toBeGreaterThan(stage!.x);
      expect(node.x + node.width / 2).toBeLessThan(stage!.x + stage!.width);
      expect(leftMargin).toBeGreaterThan(44);
      expect(rightMargin).toBeGreaterThan(44);
      expect(node.y - node.height / 2).toBeGreaterThan(
        presentation.stageFrameTop,
      );
      expect(node.y + node.height / 2).toBeLessThan(
        presentation.stageFrameTop + presentation.stageFrameHeight,
      );
    });
  });
});
