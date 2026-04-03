import { describe, expect, it } from "vitest";
import { buildSimulatorDischargeLanes } from "@/lib/simulator-topology";
import {
  buildSimulatorRouteGrouping,
  deriveTransportNodeSemantics,
} from "@/lib/transport-semantics";
import type { CircuitGraph } from "@/types/app-data";

const graph: CircuitGraph = {
  stages: [
    { index: 0, label: "Accumulation", nodeIds: ["pile_main"] },
    { index: 1, label: "Discharge", nodeIds: ["vbelt_a", "vbelt_b", "vpile_mix"] },
    { index: 2, label: "Transport", nodeIds: ["belt_cv301"] },
  ],
  nodes: [
    {
      id: "pile_main",
      objectId: "pile_main",
      objectType: "pile",
      objectRole: "physical",
      label: "Main Pile",
      stageIndex: 0,
      dimension: 3,
      isProfiled: true,
      shortDescription: "Central pile",
      inputs: [],
      outputs: [
        {
          id: "out-west",
          label: "West reclaim",
          kind: "output",
          x: 0.25,
          y: 0.9,
          relatedObjectId: "vbelt_a",
        },
        {
          id: "out-east",
          label: "East reclaim",
          kind: "output",
          x: 0.75,
          y: 0.9,
          relatedObjectId: "vbelt_b",
        },
      ],
    },
    {
      id: "vbelt_a",
      objectId: "vbelt_a",
      objectType: "belt",
      objectRole: "virtual",
      label: "Virtual Lane A",
      stageIndex: 1,
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
      stageIndex: 1,
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
      stageIndex: 1,
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
      stageIndex: 2,
      dimension: 1,
      isProfiled: true,
      shortDescription: "Measured downstream belt",
      inputs: [],
      outputs: [],
    },
  ],
  edges: [
    { id: "e-1", source: "pile_main", target: "vbelt_a", label: "west" },
    { id: "e-2", source: "pile_main", target: "vbelt_b", label: "east" },
    { id: "e-3", source: "vbelt_a", target: "vpile_mix", label: "mix west" },
    { id: "e-4", source: "vbelt_b", target: "vpile_mix", label: "mix east" },
    { id: "e-5", source: "vpile_mix", target: "belt_cv301", label: "to cv301" },
  ],
};

describe("transport-semantics", () => {
  it("classifies grouped virtual discharge transport and merge accumulation", () => {
    const beltSemantics = deriveTransportNodeSemantics(graph, "vbelt_a");
    const mergeSemantics = deriveTransportNodeSemantics(graph, "vpile_mix");

    expect(beltSemantics?.roleLabel).toBe("Source transport");
    expect(beltSemantics?.companionTransportNodes.map((node) => node.label)).toEqual([
      "Virtual Lane B",
    ]);
    expect(beltSemantics?.sharedDownstreamBelts.map((node) => node.label)).toEqual([
      "CV301",
    ]);

    expect(mergeSemantics?.roleLabel).toBe("Merge accumulation");
    expect(mergeSemantics?.groupedContributorNodes.map((node) => node.label)).toEqual([
      "Virtual Lane A",
      "Virtual Lane B",
    ]);
  });

  it("derives grouped discharge route semantics from shared merge and downstream context", () => {
    const lanes = buildSimulatorDischargeLanes(graph, "pile_main");
    const routeGrouping = buildSimulatorRouteGrouping(lanes);
    const westLane = routeGrouping.laneSemanticsByOutputId["out-west"];

    expect(westLane?.routeKindLabel).toBe("Grouped discharge route");
    expect(westLane?.groupedOutputLabels).toEqual(["East reclaim", "West reclaim"]);
    expect(westLane?.sharedMergeLabels).toEqual(["Virtual Mixer"]);
    expect(westLane?.sharedDownstreamLabels).toEqual(["CV301"]);
    expect(routeGrouping.mergeContributorLabelsByNodeId.vpile_mix).toEqual([
      "East reclaim",
      "West reclaim",
    ]);
  });
});
