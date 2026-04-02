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
});
