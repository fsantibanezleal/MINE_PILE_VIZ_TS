import { describe, expect, it } from "vitest";
import {
  buildSimulatorDischargeLanes,
  getSimulatorPileNodes,
} from "@/lib/simulator-topology";
import type { CircuitGraph } from "@/types/app-data";

const graph: CircuitGraph = {
  stages: [
    { index: 0, label: "Feed", nodeIds: ["vpile_feed"] },
    { index: 1, label: "Accumulation", nodeIds: ["pile_main", "pile_other"] },
    { index: 2, label: "Discharge", nodeIds: ["vbelt_a", "vbelt_b", "vpile_mix"] },
    { index: 3, label: "Transport", nodeIds: ["belt_cv301", "belt_cv302"] },
  ],
  nodes: [
    {
      id: "vpile_feed",
      objectId: "vpile_feed",
      objectType: "pile",
      objectRole: "virtual",
      label: "Virtual Feed",
      stageIndex: 0,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Virtual feed",
      inputs: [],
      outputs: [],
    },
    {
      id: "pile_main",
      objectId: "pile_main",
      objectType: "pile",
      objectRole: "physical",
      label: "Main Pile",
      stageIndex: 1,
      dimension: 3,
      isProfiled: true,
      shortDescription: "Central pile",
      inputs: [],
      outputs: [
        {
          id: "out-west",
          label: "West reclaim",
          kind: "output",
          x: 0.2,
          y: 0.9,
          relatedObjectId: "vbelt_a",
        },
        {
          id: "out-east",
          label: "East reclaim",
          kind: "output",
          x: 0.8,
          y: 0.9,
          relatedObjectId: "vbelt_b",
        },
      ],
    },
    {
      id: "pile_other",
      objectId: "pile_other",
      objectType: "pile",
      objectRole: "physical",
      label: "Other Pile",
      stageIndex: 1,
      dimension: 3,
      isProfiled: false,
      shortDescription: "Another pile",
      inputs: [],
      outputs: [],
    },
    {
      id: "vbelt_a",
      objectId: "vbelt_a",
      objectType: "belt",
      objectRole: "virtual",
      label: "Virtual Lane A",
      stageIndex: 2,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Virtual discharge lane",
      inputs: [],
      outputs: [],
    },
    {
      id: "vbelt_b",
      objectId: "vbelt_b",
      objectType: "belt",
      objectRole: "virtual",
      label: "Virtual Lane B",
      stageIndex: 2,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Virtual discharge lane",
      inputs: [],
      outputs: [],
    },
    {
      id: "vpile_mix",
      objectId: "vpile_mix",
      objectType: "pile",
      objectRole: "virtual",
      label: "Virtual Mixer",
      stageIndex: 2,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Virtual mixer",
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
      shortDescription: "Downstream belt",
      inputs: [],
      outputs: [],
    },
    {
      id: "belt_cv302",
      objectId: "belt_cv302",
      objectType: "belt",
      objectRole: "physical",
      label: "CV302",
      stageIndex: 3,
      dimension: 1,
      isProfiled: true,
      shortDescription: "Downstream belt",
      inputs: [],
      outputs: [],
    },
  ],
  edges: [
    { id: "e-1", source: "pile_main", target: "vbelt_a", label: "west" },
    { id: "e-2", source: "pile_main", target: "vbelt_b", label: "east" },
    { id: "e-3", source: "vbelt_a", target: "vpile_mix", label: "mix" },
    { id: "e-4", source: "vpile_mix", target: "belt_cv301", label: "belt" },
    { id: "e-5", source: "vbelt_b", target: "belt_cv302", label: "belt" },
    { id: "e-6", source: "belt_cv302", target: "pile_other", label: "to other pile" },
  ],
};

describe("simulator-topology", () => {
  it("sorts physical piles before virtual piles", () => {
    expect(getSimulatorPileNodes(graph).map((node) => node.objectId)).toEqual([
      "pile_main",
      "pile_other",
      "vpile_feed",
      "vpile_mix",
    ]);
  });

  it("collects downstream belts per discharge output without traversing into other physical piles", () => {
    const lanes = buildSimulatorDischargeLanes(graph, "pile_main");

    expect(lanes).toHaveLength(2);
    expect(lanes[0]?.output.id).toBe("out-west");
    expect(lanes[0]?.belts.map((belt) => belt.objectId)).toEqual([
      "vbelt_a",
      "belt_cv301",
    ]);
    expect(lanes[1]?.output.id).toBe("out-east");
    expect(lanes[1]?.belts.map((belt) => belt.objectId)).toEqual([
      "vbelt_b",
      "belt_cv302",
    ]);
  });
});
