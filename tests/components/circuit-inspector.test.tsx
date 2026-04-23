import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CircuitInspector } from "@/components/circuit/circuit-inspector";
import type { CircuitGraph, ObjectSummary } from "@/types/app-data";

vi.mock("next/navigation", () => ({
  usePathname: () => "/circuit",
  useSearchParams: () => new URLSearchParams(),
}));

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
      outputs: [],
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
      shortDescription: "Measured belt",
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

const summary: ObjectSummary = {
  objectId: "vbelt_a",
  objectType: "belt",
  displayName: "Virtual Lane A",
  timestamp: "2025-03-19T01:15:00Z",
  massTon: 36,
  status: "Updated",
  qualityValues: {
    q_num_fe: 1.2,
  },
};

describe("CircuitInspector", () => {
  it("renders reusable flow semantics for a virtual discharge contributor", () => {
    render(
      <CircuitInspector
        graph={graph}
        node={graph.nodes[1]}
        summary={summary}
        relatedObjectLabels={{}}
      />,
    );

    expect(screen.getByText("Flow semantics")).toBeInTheDocument();
    expect(screen.getByText("Visual reading notes")).toBeInTheDocument();
    expect(screen.getByText("Anchor marks encode")).toBeInTheDocument();
    expect(screen.getByText("Source transport")).toBeInTheDocument();
    expect(screen.getByText("Companion transport")).toBeInTheDocument();
    expect(screen.getByText("Virtual Lane B")).toBeInTheDocument();
    expect(screen.getByText("Shared downstream conveyors")).toBeInTheDocument();
    expect(screen.getByText("CV301")).toBeInTheDocument();
    expect(screen.getByText("Cross-route context")).toBeInTheDocument();
    expect(screen.getByText("Runtime mass")).toBeInTheDocument();
    expect(screen.queryByText("q_num_fe")).not.toBeInTheDocument();
  });
});
