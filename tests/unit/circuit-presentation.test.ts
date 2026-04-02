import { describe, expect, it } from "vitest";
import { buildCircuitPresentation } from "@/lib/circuit-presentation";
import type { CircuitGraph } from "@/types/app-data";

const graph: CircuitGraph = {
  stages: [
    { index: 0, label: "Feed", nodeIds: ["vbelt_feed_ch1"] },
    { index: 1, label: "Residence", nodeIds: ["vpile_ch1"] },
    { index: 2, label: "Transport", nodeIds: ["belt_cv200"] },
    { index: 3, label: "Accumulation", nodeIds: ["pile_stockpile"] },
  ],
  nodes: [
    {
      id: "vbelt_feed_ch1",
      objectId: "vbelt_feed_ch1",
      objectType: "belt",
      objectRole: "virtual",
      label: "Virtual Feed",
      stageIndex: 0,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Feed source",
      inputs: [],
      outputs: [],
    },
    {
      id: "vpile_ch1",
      objectId: "vpile_ch1",
      objectType: "pile",
      objectRole: "virtual",
      label: "Virtual Residence",
      stageIndex: 1,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Residence",
      inputs: [],
      outputs: [],
    },
    {
      id: "belt_cv200",
      objectId: "belt_cv200",
      objectType: "belt",
      objectRole: "physical",
      label: "CV 200",
      stageIndex: 2,
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
      stageIndex: 3,
      dimension: 3,
      isProfiled: true,
      shortDescription: "Physical stockpile",
      inputs: [],
      outputs: [],
    },
  ],
  edges: [
    { id: "e1", source: "vbelt_feed_ch1", target: "vpile_ch1", label: "feed" },
    { id: "e2", source: "vpile_ch1", target: "belt_cv200", label: "transfer" },
    { id: "e3", source: "belt_cv200", target: "pile_stockpile", label: "feed" },
  ],
};

const multiAnchorGraph: CircuitGraph = {
  stages: [
    { index: 0, label: "Feed", nodeIds: ["belt_a", "belt_b"] },
    { index: 1, label: "Accumulation", nodeIds: ["pile_main"] },
    { index: 2, label: "Discharge", nodeIds: ["belt_c", "belt_d"] },
  ],
  nodes: [
    {
      id: "belt_a",
      objectId: "belt_a",
      objectType: "belt",
      objectRole: "physical",
      label: "Belt A",
      stageIndex: 0,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Feed A",
      inputs: [],
      outputs: [{ id: "belt-a-out", label: "To pile", kind: "output", x: 1, y: 0.5, relatedObjectId: "pile_main" }],
    },
    {
      id: "belt_b",
      objectId: "belt_b",
      objectType: "belt",
      objectRole: "physical",
      label: "Belt B",
      stageIndex: 0,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Feed B",
      inputs: [],
      outputs: [{ id: "belt-b-out", label: "To pile", kind: "output", x: 1, y: 0.5, relatedObjectId: "pile_main" }],
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
      shortDescription: "Stockpile",
      inputs: [
        { id: "pile-in-a", label: "Feed A", kind: "input", x: 0.28, y: 0.14, relatedObjectId: "belt_a" },
        { id: "pile-in-b", label: "Feed B", kind: "input", x: 0.74, y: 0.16, relatedObjectId: "belt_b" },
      ],
      outputs: [
        { id: "pile-out-c", label: "Gate C", kind: "output", x: 0.22, y: 0.92, relatedObjectId: "belt_c" },
        { id: "pile-out-d", label: "Gate D", kind: "output", x: 0.78, y: 0.9, relatedObjectId: "belt_d" },
      ],
    },
    {
      id: "belt_c",
      objectId: "belt_c",
      objectType: "belt",
      objectRole: "physical",
      label: "Belt C",
      stageIndex: 2,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Discharge C",
      inputs: [{ id: "belt-c-in", label: "From pile", kind: "input", x: 0, y: 0.5, relatedObjectId: "pile_main" }],
      outputs: [],
    },
    {
      id: "belt_d",
      objectId: "belt_d",
      objectType: "belt",
      objectRole: "physical",
      label: "Belt D",
      stageIndex: 2,
      dimension: 1,
      isProfiled: false,
      shortDescription: "Discharge D",
      inputs: [{ id: "belt-d-in", label: "From pile", kind: "input", x: 0, y: 0.5, relatedObjectId: "pile_main" }],
      outputs: [],
    },
  ],
  edges: [
    { id: "edge-feed-a", source: "belt_a", target: "pile_main", label: "feed" },
    { id: "edge-feed-b", source: "belt_b", target: "pile_main", label: "feed" },
    { id: "edge-out-c", source: "pile_main", target: "belt_c", label: "reclaim" },
    { id: "edge-out-d", source: "pile_main", target: "belt_d", label: "reclaim" },
  ],
};

describe("circuit presentation", () => {
  it("derives illustrative visual kinds from physical and virtual objects", () => {
    const presentation = buildCircuitPresentation(graph);

    expect(
      presentation.nodes.find((node) => node.id === "vbelt_feed_ch1")?.visualKind,
    ).toBe("virtual-belt");
    expect(
      presentation.nodes.find((node) => node.id === "belt_cv200")?.visualKind,
    ).toBe("physical-belt");
    expect(
      presentation.nodes.find((node) => node.id === "pile_stockpile")?.visualKind,
    ).toBe("physical-pile");
  });

  it("pushes virtual objects into a separate lower lane", () => {
    const presentation = buildCircuitPresentation(graph);
    const virtualY = presentation.nodes.find((node) => node.id === "vpile_ch1")?.y ?? 0;
    const physicalY = presentation.nodes.find((node) => node.id === "belt_cv200")?.y ?? 0;

    expect(virtualY).toBeGreaterThan(physicalY);
  });

  it("builds curved paths that respect pile feed direction", () => {
    const presentation = buildCircuitPresentation(graph);
    const feedEdge = presentation.edges.find((edge) => edge.id === "e3");

    expect(feedEdge?.path).toContain("C");
    expect(feedEdge?.points3d.length).toBeGreaterThanOrEqual(3);
  });

  it("routes different pile feeds and discharges through distinct configured anchors", () => {
    const presentation = buildCircuitPresentation(multiAnchorGraph);
    const feedA = presentation.edges.find((edge) => edge.id === "edge-feed-a");
    const feedB = presentation.edges.find((edge) => edge.id === "edge-feed-b");
    const outC = presentation.edges.find((edge) => edge.id === "edge-out-c");
    const outD = presentation.edges.find((edge) => edge.id === "edge-out-d");

    expect(feedA?.targetAnchorId).toBe("pile-in-a");
    expect(feedB?.targetAnchorId).toBe("pile-in-b");
    expect(outC?.sourceAnchorId).toBe("pile-out-c");
    expect(outD?.sourceAnchorId).toBe("pile-out-d");
    expect(feedA?.targetPoint.x).not.toBe(feedB?.targetPoint.x);
    expect(outC?.sourcePoint.x).not.toBe(outD?.sourcePoint.x);
  });
});
