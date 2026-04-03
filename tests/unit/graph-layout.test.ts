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

const fanoutGraph: CircuitGraph = {
  stages: [
    { index: 0, label: "Stage 1", nodeIds: ["pile"] },
    { index: 1, label: "Stage 2", nodeIds: ["west", "center", "east"] },
  ],
  nodes: [
    {
      id: "pile",
      objectId: "pile",
      objectType: "pile",
      objectRole: "physical",
      label: "Pile",
      stageIndex: 0,
      dimension: 3,
      isProfiled: true,
      shortDescription: "Pile source",
      inputs: [],
      outputs: [
        {
          id: "out-west",
          label: "West",
          kind: "output",
          x: 0.18,
          y: 0.35,
          relatedObjectId: "west",
        },
        {
          id: "out-center",
          label: "Center",
          kind: "output",
          x: 0.5,
          y: 0.5,
          relatedObjectId: "center",
        },
        {
          id: "out-east",
          label: "East",
          kind: "output",
          x: 0.82,
          y: 0.65,
          relatedObjectId: "east",
        },
      ],
    },
    {
      id: "west",
      objectId: "west",
      objectType: "belt",
      objectRole: "virtual",
      label: "West",
      stageIndex: 1,
      dimension: 1,
      isProfiled: false,
      shortDescription: "West branch",
      inputs: [],
      outputs: [],
    },
    {
      id: "center",
      objectId: "center",
      objectType: "belt",
      objectRole: "virtual",
      label: "Center",
      stageIndex: 1,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Center branch",
      inputs: [],
      outputs: [],
    },
    {
      id: "east",
      objectId: "east",
      objectType: "belt",
      objectRole: "virtual",
      label: "East",
      stageIndex: 1,
      dimension: 1,
      isProfiled: false,
      shortDescription: "East branch",
      inputs: [],
      outputs: [],
    },
  ],
  edges: [
    { id: "edge-west", source: "pile", target: "west", label: "west" },
    { id: "edge-center", source: "pile", target: "center", label: "center" },
    { id: "edge-east", source: "pile", target: "east", label: "east" },
  ],
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

  it("keeps fanout branches separated inside the downstream stage", () => {
    const result = layoutCircuitGraph(
      fanoutGraph.stages,
      fanoutGraph.nodes,
      fanoutGraph.edges,
    );
    const west = result.nodes.find((node) => node.id === "west");
    const center = result.nodes.find((node) => node.id === "center");
    const east = result.nodes.find((node) => node.id === "east");

    expect(west).toBeDefined();
    expect(center).toBeDefined();
    expect(east).toBeDefined();
    expect(west!.position.x).toBeLessThan(center!.position.x);
    expect(center!.position.x).toBeLessThan(east!.position.x);
    expect(Math.abs(center!.position.x - west!.position.x)).toBeGreaterThan(30);
    expect(Math.abs(east!.position.x - center!.position.x)).toBeGreaterThan(30);
  });

  it("expands the downstream stage frame beyond raw node bounds for high-fanout layouts", () => {
    const result = layoutCircuitGraph(
      fanoutGraph.stages,
      fanoutGraph.nodes,
      fanoutGraph.edges,
    );
    const stageFrame = result.stageNodes.find((node) => node.id === "stage-1");
    const stageMembers = result.nodes.filter((node) =>
      ["west", "center", "east"].includes(node.id),
    );
    const rawMinX = Math.min(...stageMembers.map((node) => node.position.x));
    const rawMaxRight = Math.max(...stageMembers.map((node) => node.position.x + 260));
    const rawWidth = rawMaxRight - rawMinX;
    const frameWidth = Number(stageFrame?.style?.width ?? 0);

    expect(stageFrame).toBeDefined();
    expect(frameWidth - rawWidth).toBeGreaterThan(78);
  });
});
