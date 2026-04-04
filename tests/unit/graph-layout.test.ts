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

const sameStageGraph: CircuitGraph = {
  stages: [{ index: 0, label: "Stage 1", nodeIds: ["a", "b", "c"] }],
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

const sameStageBranchGraph: CircuitGraph = {
  stages: [
    {
      index: 0,
      label: "Stage 1",
      nodeIds: ["pile", "west", "east", "lane_west", "lane_east"],
    },
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
          y: 0.5,
          relatedObjectId: "west",
        },
        {
          id: "out-east",
          label: "East",
          kind: "output",
          x: 0.82,
          y: 0.5,
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
      stageIndex: 0,
      dimension: 1,
      isProfiled: false,
      shortDescription: "West branch",
      inputs: [],
      outputs: [],
    },
    {
      id: "east",
      objectId: "east",
      objectType: "belt",
      objectRole: "virtual",
      label: "East",
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
      label: "Lane West",
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
      label: "Lane East",
      stageIndex: 0,
      dimension: 1,
      isProfiled: false,
      shortDescription: "East lane",
      inputs: [],
      outputs: [],
    },
  ],
  edges: [
    { id: "pile-west", source: "pile", target: "west", label: "west" },
    { id: "pile-east", source: "pile", target: "east", label: "east" },
    { id: "west-lane", source: "west", target: "lane_west", label: "west lane" },
    { id: "east-lane", source: "east", target: "lane_east", label: "east lane" },
  ],
};

describe("layoutCircuitGraph", () => {
  it("keeps the original node and edge counts while adding full-height stage frames", () => {
    const result = layoutCircuitGraph(graph.stages, graph.nodes, graph.edges);

    expect(result.nodes).toHaveLength(2);
    expect(result.stageNodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.stageNodes[0]?.position.y).toBe(result.stageNodes[1]?.position.y);
    expect(result.stageNodes[0]?.style?.height).toBe(result.stageNodes[1]?.style?.height);
    expect(result.stageNodes[0]?.style?.width).toBeTypeOf("number");
  });

  it("keeps stage frames contiguous from left to right", () => {
    const result = layoutCircuitGraph(graph.stages, graph.nodes, graph.edges);
    const firstStage = result.stageNodes.find((node) => node.id === "stage-0");
    const secondStage = result.stageNodes.find((node) => node.id === "stage-1");
    const firstRight = firstStage!.position.x + Number(firstStage!.style?.width ?? 0);

    expect(firstStage).toBeDefined();
    expect(secondStage).toBeDefined();
    expect(firstRight).toBe(secondStage!.position.x);
  });

  it("pushes same-stage receivers to the right and stacks siblings vertically", () => {
    const result = layoutCircuitGraph(
      sameStageGraph.stages,
      sameStageGraph.nodes,
      sameStageGraph.edges,
    );
    const a = result.nodes.find((node) => node.id === "a");
    const b = result.nodes.find((node) => node.id === "b");
    const c = result.nodes.find((node) => node.id === "c");

    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(c).toBeDefined();
    expect(b!.position.x).toBeGreaterThan(a!.position.x);
    expect(c!.position.x).toBeGreaterThan(a!.position.x);
    expect(b!.position.x).toBe(c!.position.x);
    expect(Math.abs(b!.position.y - c!.position.y)).toBeGreaterThan(140);
  });

  it("stacks disconnected downstream branches vertically inside the same stage column", () => {
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
    expect(west!.position.x).toBe(center!.position.x);
    expect(center!.position.x).toBe(east!.position.x);
    expect(west!.position.y).toBeLessThan(center!.position.y);
    expect(center!.position.y).toBeLessThan(east!.position.y);
  });

  it("keeps same-stage branch descendants ordered vertically through deeper columns", () => {
    const result = layoutCircuitGraph(
      sameStageBranchGraph.stages,
      sameStageBranchGraph.nodes,
      sameStageBranchGraph.edges,
    );
    const west = result.nodes.find((node) => node.id === "west");
    const east = result.nodes.find((node) => node.id === "east");
    const laneWest = result.nodes.find((node) => node.id === "lane_west");
    const laneEast = result.nodes.find((node) => node.id === "lane_east");

    expect(west).toBeDefined();
    expect(east).toBeDefined();
    expect(laneWest).toBeDefined();
    expect(laneEast).toBeDefined();
    expect(west!.position.x).toBeLessThan(laneWest!.position.x);
    expect(east!.position.x).toBeLessThan(laneEast!.position.x);
    expect(west!.position.y).toBeLessThan(east!.position.y);
    expect(laneWest!.position.y).toBeLessThan(laneEast!.position.y);
  });
});
