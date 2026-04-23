import { render, screen } from "@testing-library/react";
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
  it("keeps the route belt-centric and does not render the circuit view", () => {
    render(
      <LiveWorkspace
        graph={graph}
        summaries={summaries}
        registry={registry}
        qualities={qualities}
        initialBelt={initialBelt}
      />,
    );

    expect(screen.getByText("Current belt content")).toBeInTheDocument();
    expect(screen.getByText("Mass-weighted histogram")).toBeInTheDocument();
    expect(screen.getByText("Dense-state reading notes")).toBeInTheDocument();
    expect(screen.getByText("Color encodes")).toBeInTheDocument();
    expect(screen.getByText("Histogram evidence encodes")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Feed Belt" })).toBeInTheDocument();
    expect(screen.getByLabelText("Feed Belt block strip")).toBeInTheDocument();
    expect(screen.getByText("Inspection belt route context")).toBeInTheDocument();
    expect(screen.getByText("Current dense belt snapshot")).toBeInTheDocument();
    expect(screen.getByText("Export HTML report")).toBeInTheDocument();
    expect(screen.queryByText("Graph focus context")).not.toBeInTheDocument();
    expect(screen.queryByText("Focused object semantics")).not.toBeInTheDocument();
  });
});
