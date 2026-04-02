import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SimulatorWorkspace } from "@/components/simulator/simulator-workspace";
import type {
  CircuitGraph,
  ProfilerIndex,
  ProfilerSummaryRow,
  QualityDefinition,
} from "@/types/app-data";

vi.mock("next/navigation", () => ({
  usePathname: () => "/simulator",
  useRouter: () => ({
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/circuit/circuit-flow", () => ({
  CircuitFlow: ({
    selectedObjectId,
    summaries,
  }: {
    selectedObjectId?: string;
    summaries: Array<{ objectId: string }>;
  }) => (
    <div data-testid="circuit-flow">
      {selectedObjectId ?? "none"}:{summaries.length}
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
  stages: [{ index: 0, label: "Stage", nodeIds: ["pile_a", "belt_b"] }],
  nodes: [
    {
      id: "pile_a",
      objectId: "pile_a",
      objectType: "pile",
      objectRole: "physical",
      label: "Pile A",
      stageIndex: 0,
      dimension: 1,
      isProfiled: true,
      shortDescription: "Pile",
      inputs: [],
      outputs: [],
    },
    {
      id: "belt_b",
      objectId: "belt_b",
      objectType: "belt",
      objectRole: "physical",
      label: "Belt B",
      stageIndex: 0,
      dimension: 1,
      isProfiled: true,
      shortDescription: "Belt",
      inputs: [],
      outputs: [],
    },
  ],
  edges: [],
};

const index: ProfilerIndex = {
  defaultObjectId: "pile_a",
  objects: [
    {
      objectId: "pile_a",
      displayName: "Pile A",
      objectType: "pile",
      dimension: 1,
      manifestRef: "profiler/objects/pile_a/manifest.json",
    },
    {
      objectId: "belt_b",
      displayName: "Belt B",
      objectType: "belt",
      dimension: 1,
      manifestRef: "profiler/objects/belt_b/manifest.json",
    },
  ],
};

const summaryRows: ProfilerSummaryRow[] = [
  {
    snapshotId: "20250319010000",
    timestamp: "2025-03-19T01:00:00Z",
    objectId: "pile_a",
    objectType: "pile",
    displayName: "Pile A",
    dimension: 1,
    massTon: 100,
    qualityValues: { q_num_fe: 1.1 },
  },
  {
    snapshotId: "20250319011500",
    timestamp: "2025-03-19T01:15:00Z",
    objectId: "pile_a",
    objectType: "pile",
    displayName: "Pile A",
    dimension: 1,
    massTon: 120,
    qualityValues: { q_num_fe: 1.2 },
  },
  {
    snapshotId: "20250319011500",
    timestamp: "2025-03-19T01:15:00Z",
    objectId: "belt_b",
    objectType: "belt",
    displayName: "Belt B",
    dimension: 1,
    massTon: 80,
    qualityValues: { q_num_fe: 1.4 },
  },
];

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("SimulatorWorkspace", () => {
  it("loads timestep summaries and updates the scenario state when controls change", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith("/api/profiler/summary")) {
        return jsonResponse(summaryRows);
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<SimulatorWorkspace graph={graph} index={index} qualities={qualities} />);

    expect(screen.getByText("Loading simulator scenario...")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/profiler/summary");
    });

    await waitFor(() => {
      expect(screen.getByTestId("circuit-flow")).toHaveTextContent("pile_a:2");
    });
    expect(screen.getByText("Mass Ranking")).toBeInTheDocument();
    expect(screen.getAllByText("120 t").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Object"), {
      target: { value: "belt_b" },
    });
    expect(screen.getByTestId("circuit-flow")).toHaveTextContent("belt_b:2");

    fireEvent.change(screen.getByLabelText("Time step"), {
      target: { value: "0" },
    });
    expect(screen.getByTestId("circuit-flow")).toHaveTextContent("belt_b:1");
    expect(screen.getAllByText("100 t").length).toBeGreaterThan(0);
  });
});
