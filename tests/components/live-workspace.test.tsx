import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LiveWorkspace } from "@/components/live/live-workspace";
import type {
  BeltSnapshot,
  CircuitGraph,
  ObjectRegistryEntry,
  ObjectSummary,
  QualityDefinition,
} from "@/types/app-data";

vi.mock("next/navigation", () => ({
  usePathname: () => "/live",
  useRouter: () => ({
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/circuit/circuit-flow", () => ({
  CircuitFlow: ({
    graph,
    onSelect,
  }: {
    graph: CircuitGraph;
    onSelect?: (objectId: string) => void;
  }) => (
    <div>
      {graph.nodes.map((node) => (
        <button key={node.objectId} type="button" onClick={() => onSelect?.(node.objectId)}>
          {node.label}
        </button>
      ))}
    </div>
  ),
}));

const qualities: QualityDefinition[] = [
  {
    id: "q_num_fe",
    kind: "numerical",
    label: "Fe",
    description: "Iron grade",
    min: 0,
    max: 2,
    palette: ["#153a63", "#59ddff", "#f4bc63"],
  },
];

const graph: CircuitGraph = {
  stages: [{ index: 0, label: "Primary", nodeIds: ["belt_feed", "pile_a"] }],
  nodes: [
    {
      id: "belt_feed",
      objectId: "belt_feed",
      objectType: "belt",
      objectRole: "physical",
      label: "Feed Belt",
      stageIndex: 0,
      dimension: 1,
      isProfiled: true,
      shortDescription: "Measured live belt",
      inputs: [],
      outputs: [],
    },
    {
      id: "pile_a",
      objectId: "pile_a",
      objectType: "pile",
      objectRole: "physical",
      label: "Pile A",
      stageIndex: 0,
      dimension: 3,
      isProfiled: true,
      shortDescription: "Accumulation object",
      inputs: [],
      outputs: [],
    },
  ],
  edges: [{ id: "edge-feed-pile", source: "belt_feed", target: "pile_a", label: "feed" }],
};

const summaries: ObjectSummary[] = [
  {
    objectId: "belt_feed",
    objectType: "belt",
    displayName: "Feed Belt",
    timestamp: "2025-03-19T01:15:00Z",
    massTon: 120,
    status: "Updated",
    qualityValues: { q_num_fe: 0.61 },
  },
  {
    objectId: "pile_a",
    objectType: "pile",
    displayName: "Pile A",
    timestamp: "2025-03-19T01:15:00Z",
    massTon: 410,
    status: "Updated",
    qualityValues: { q_num_fe: 1.42 },
  },
];

const registry: ObjectRegistryEntry[] = [
  {
    objectId: "belt_feed",
    displayName: "Feed Belt",
    objectType: "belt",
    objectRole: "physical",
    shortDescription: "Measured live belt",
    stageIndex: 0,
    dimension: 1,
    isProfiled: true,
    liveRef: "live/belts/belt_feed.json",
  },
  {
    objectId: "pile_a",
    displayName: "Pile A",
    objectType: "pile",
    objectRole: "physical",
    shortDescription: "Accumulation object",
    stageIndex: 0,
    dimension: 3,
    isProfiled: true,
  },
];

const initialBelt: BeltSnapshot = {
  objectId: "belt_feed",
  displayName: "Feed Belt",
  timestamp: "2025-03-19T01:15:00Z",
  totalMassTon: 120,
  blockCount: 2,
  qualityAverages: { q_num_fe: 0.61 },
  blocks: [
    {
      position: 0,
      massTon: 55,
      timestampOldestMs: 1742346000000,
      timestampNewestMs: 1742346900000,
      qualityValues: { q_num_fe: 0.52 },
    },
    {
      position: 1,
      massTon: 65,
      timestampOldestMs: 1742346060000,
      timestampNewestMs: 1742346960000,
      qualityValues: { q_num_fe: 0.68 },
    },
  ],
};

describe("LiveWorkspace", () => {
  it("keeps dense evidence tied to the inspected belt when graph focus moves to a pile", () => {
    render(
      <LiveWorkspace
        graph={graph}
        summaries={summaries}
        registry={registry}
        qualities={qualities}
        initialBelt={initialBelt}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Pile A" }));

    expect(screen.getAllByText("Current belt snapshot")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Feed Belt" })).toBeInTheDocument();
    expect(screen.getByLabelText("Feed Belt block strip")).toBeInTheDocument();
    expect(screen.getByText("Inspection belt route context")).toBeInTheDocument();
    expect(screen.getByText("Downstream objects")).toBeInTheDocument();
    expect(screen.getAllByText("Stage peers").length).toBeGreaterThan(0);
    expect(screen.getByText("Graph focus context")).toBeInTheDocument();
    expect(screen.getByText(/The graph focus is Pile A, but the dense live content below stays on Feed Belt\./)).toBeInTheDocument();
    expect(screen.getByText("Focused object semantics")).toBeInTheDocument();
    expect(screen.queryByText("No belt block strip for this object")).not.toBeInTheDocument();
  });
});
