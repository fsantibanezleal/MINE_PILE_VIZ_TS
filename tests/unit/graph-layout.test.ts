import { describe, expect, it } from "vitest";
import { layoutCircuitGraph } from "@/lib/graph-layout";
import type { CircuitGraph } from "@/types/app-data";

const graph: CircuitGraph = {
  stages: [
    { index: 0, label: "Stage 1", nodeIds: ["a"] },
    { index: 1, label: "Stage 2", nodeIds: ["b"] },
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
      shortDescription: "First node",
      inputs: [],
      outputs: [],
    },
    {
      id: "b",
      objectId: "b",
      objectType: "pile",
      objectRole: "virtual",
      label: "B",
      stageIndex: 1,
      dimension: 3,
      isProfiled: true,
      shortDescription: "Second node",
      inputs: [],
      outputs: [],
    },
  ],
  edges: [{ id: "edge", source: "a", target: "b", label: "flow" }],
};

describe("layoutCircuitGraph", () => {
  it("keeps the original node and edge counts while adding stage frames", () => {
    const result = layoutCircuitGraph(graph.stages, graph.nodes, graph.edges);

    expect(result.nodes).toHaveLength(2);
    expect(result.stageNodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.nodes[0]?.position.x).toBeTypeOf("number");
    expect(result.nodes[1]?.position.y).toBeTypeOf("number");
    expect(result.stageNodes[0]?.data.label).toBe("Stage 1");
    expect(result.stageNodes[1]?.data.nodeCount).toBe(1);
    expect(result.stageNodes[0]?.style?.width).toBeTypeOf("number");
    expect(result.stageNodes[0]?.style?.height).toBeTypeOf("number");
  });
});
