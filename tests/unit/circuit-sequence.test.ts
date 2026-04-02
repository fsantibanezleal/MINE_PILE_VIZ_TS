import { describe, expect, it } from "vitest";
import { deriveCircuitSequence } from "@/lib/circuit-sequence";
import type { CircuitGraph } from "@/types/app-data";

const graph: CircuitGraph = {
  stages: [
    { index: 0, label: "Feed", nodeIds: ["feed"] },
    { index: 1, label: "Transport", nodeIds: ["belt"] },
    { index: 2, label: "Stockpile", nodeIds: ["pile"] },
    { index: 3, label: "Discharge", nodeIds: ["reclaim", "isolated"] },
  ],
  nodes: [
    {
      id: "feed",
      objectId: "feed",
      objectType: "belt",
      objectRole: "virtual",
      label: "Feed",
      stageIndex: 0,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Feed",
      inputs: [],
      outputs: [],
    },
    {
      id: "belt",
      objectId: "belt",
      objectType: "belt",
      objectRole: "physical",
      label: "Belt",
      stageIndex: 1,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Belt",
      inputs: [],
      outputs: [],
    },
    {
      id: "pile",
      objectId: "pile",
      objectType: "pile",
      objectRole: "physical",
      label: "Pile",
      stageIndex: 2,
      dimension: 3,
      isProfiled: true,
      shortDescription: "Pile",
      inputs: [],
      outputs: [],
    },
    {
      id: "reclaim",
      objectId: "reclaim",
      objectType: "belt",
      objectRole: "virtual",
      label: "Reclaim",
      stageIndex: 3,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Reclaim",
      inputs: [],
      outputs: [],
    },
    {
      id: "isolated",
      objectId: "isolated",
      objectType: "pile",
      objectRole: "virtual",
      label: "Isolated",
      stageIndex: 3,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Isolated",
      inputs: [],
      outputs: [],
    },
  ],
  edges: [
    { id: "e1", source: "feed", target: "belt", label: "feed" },
    { id: "e2", source: "belt", target: "pile", label: "stack" },
    { id: "e3", source: "pile", target: "reclaim", label: "reclaim" },
  ],
};

describe("deriveCircuitSequence", () => {
  it("returns the connected upstream and downstream sequence around the selected node", () => {
    const sequence = deriveCircuitSequence(graph, "pile");

    expect(sequence?.upstreamNodeIds).toEqual(new Set(["feed", "belt"]));
    expect(sequence?.downstreamNodeIds).toEqual(new Set(["reclaim"]));
    expect(sequence?.nodeIds).toEqual(new Set(["feed", "belt", "pile", "reclaim"]));
    expect(sequence?.edgeIds).toEqual(new Set(["e1", "e2", "e3"]));
  });

  it("returns null when the selected node does not exist", () => {
    expect(deriveCircuitSequence(graph, "missing")).toBeNull();
  });
});
