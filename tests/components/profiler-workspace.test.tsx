import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfilerWorkspace } from "@/components/profiler/profiler-workspace";
import type {
  CircuitGraph,
  ProfilerIndex,
  ProfilerSnapshot,
  ProfilerSummaryRow,
  QualityDefinition,
} from "@/types/app-data";

vi.mock("next/navigation", () => ({
  usePathname: () => "/profiler",
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
      inputs: [
        {
          id: "pile-a-in",
          label: "Pile A Feed",
          kind: "input",
          x: 0.25,
          y: 0.15,
          relatedObjectId: "belt_b",
        },
      ],
      outputs: [
        {
          id: "pile-a-out",
          label: "Pile A Reclaim",
          kind: "output",
          x: 0.75,
          y: 0.9,
          relatedObjectId: "belt_b",
        },
      ],
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

function createSnapshot(
  objectId: string,
  displayName: string,
  snapshotId: string,
): ProfilerSnapshot {
  return {
    objectId,
    displayName,
    objectType: objectId === "pile_a" ? "pile" : "belt",
    snapshotId,
    timestamp: "2025-03-19T01:15:00Z",
    dimension: 1,
    rows: [
      {
        ix: 0,
        iy: 0,
        iz: 0,
        massTon: 20,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: 1.2 },
      },
    ],
  };
}

function create2DPileSnapshot(snapshotId: string): ProfilerSnapshot {
  return {
    objectId: "pile_a",
    displayName: "Pile A",
    objectType: "pile",
    snapshotId,
    timestamp: "2025-03-19T01:15:00Z",
    dimension: 2,
    rows: [
      {
        ix: 0,
        iy: 0,
        iz: 0,
        massTon: 18,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: 1.1 },
      },
      {
        ix: 1,
        iy: 0,
        iz: 0,
        massTon: 20,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: 1.18 },
      },
      {
        ix: 0,
        iy: 1,
        iz: 0,
        massTon: 22,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: 1.24 },
      },
      {
        ix: 1,
        iy: 1,
        iz: 0,
        massTon: 24,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: 1.3 },
      },
    ],
  };
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("ProfilerWorkspace", () => {
  it("loads summary history on demand and requests a new snapshot when the selected object changes", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith("/api/profiler/summary")) {
        return jsonResponse(summaryRows);
      }

      if (url.endsWith("/api/profiler/objects/pile_a/snapshots/20250319011500")) {
        return jsonResponse(createSnapshot("pile_a", "Pile A", "20250319011500"));
      }

      if (url.endsWith("/api/profiler/objects/belt_b/snapshots/20250319011500")) {
        return jsonResponse(createSnapshot("belt_b", "Belt B", "20250319011500"));
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<ProfilerWorkspace graph={graph} index={index} qualities={qualities} />);

    expect(screen.getByText("Loading profiler history...")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/profiler/summary");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/profiler/objects/pile_a/snapshots/20250319011500",
      );
    });

    await screen.findByRole("heading", { name: "Pile A" });
    fireEvent.change(screen.getByLabelText("Object"), {
      target: { value: "belt_b" },
    });

    expect(screen.getByText("Loading profiler snapshot...")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/profiler/objects/belt_b/snapshots/20250319011500",
      );
    });
    await screen.findByRole("heading", { name: "Belt B" });
    expect(screen.getByText("Historical circuit reading")).toBeInTheDocument();
    expect(screen.getByText("History coverage")).toBeInTheDocument();
    expect(screen.getByText("Timeline context")).toBeInTheDocument();
    expect(screen.queryByText("Profiled properties")).not.toBeInTheDocument();
  });

  it("shows pile anchors and hovered cell details in profiler detail mode", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith("/api/profiler/summary")) {
        return jsonResponse(summaryRows);
      }

      if (url.endsWith("/api/profiler/objects/pile_a/snapshots/20250319011500")) {
        return jsonResponse(createSnapshot("pile_a", "Pile A", "20250319011500"));
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<ProfilerWorkspace graph={graph} index={index} qualities={qualities} />);

    await screen.findByRole("heading", { name: "Pile A" });
    fireEvent.click(screen.getByRole("button", { name: "Detail" }));

    await screen.findByText("Pile A Feed");
    expect(screen.getByText("Pile A Reclaim")).toBeInTheDocument();
    expect(screen.queryByTestId("pile-anchor-overlay-input")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pile-anchor-overlay-output")).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByLabelText("Pile cell 0,0,0"));

    expect(screen.getByText("Cell Focus")).toBeInTheDocument();
    expect(screen.getByText("0, 0, 0")).toBeInTheDocument();
    expect(screen.getAllByText("20 t").length).toBeGreaterThan(0);
  });

  it("states explicitly that profiler detail is summarized historical content", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith("/api/profiler/summary")) {
        return jsonResponse(summaryRows);
      }

      if (url.endsWith("/api/profiler/objects/pile_a/snapshots/20250319011500")) {
        return jsonResponse(createSnapshot("pile_a", "Pile A", "20250319011500"));
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<ProfilerWorkspace graph={graph} index={index} qualities={qualities} />);

    await screen.findByRole("heading", { name: "Pile A" });
    fireEvent.click(screen.getByRole("button", { name: "Detail" }));

    await screen.findByText("Historical summary only");
    expect(screen.getByText("Reduced pile summary bands")).toBeInTheDocument();
    expect(screen.getByText("Band basis")).toBeInTheDocument();
    expect(screen.getByText("Timeline context")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Hover a summary cell, band, or row in the active profiler detail view to inspect its coordinates, mass, and property values.",
      ),
    ).toBeInTheDocument();
  });

  it("allows selecting a historical snapshot directly from the profiler timeline", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith("/api/profiler/summary")) {
        return jsonResponse(summaryRows);
      }

      if (url.endsWith("/api/profiler/objects/pile_a/snapshots/20250319010000")) {
        return jsonResponse(createSnapshot("pile_a", "Pile A", "20250319010000"));
      }

      if (url.endsWith("/api/profiler/objects/pile_a/snapshots/20250319011500")) {
        return jsonResponse(createSnapshot("pile_a", "Pile A", "20250319011500"));
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<ProfilerWorkspace graph={graph} index={index} qualities={qualities} />);

    await screen.findByRole("heading", { name: "Pile A" });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Select snapshot 1 at 2025-03-19T01:00:00Z",
      }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/profiler/objects/pile_a/snapshots/20250319010000",
      );
    });
  });

  it("adds in-figure anchors for 2D profiler pile detail snapshots", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith("/api/profiler/summary")) {
        return jsonResponse(summaryRows);
      }

      if (url.endsWith("/api/profiler/objects/pile_a/snapshots/20250319011500")) {
        return jsonResponse(create2DPileSnapshot("20250319011500"));
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<ProfilerWorkspace graph={graph} index={index} qualities={qualities} />);

    await screen.findByRole("heading", { name: "Pile A" });
    fireEvent.click(screen.getByRole("button", { name: "Detail" }));

    await screen.findByText("Pile A Feed");
    const inputOverlay = await screen.findByTestId("pile-anchor-overlay-input");
    const outputOverlay = screen.getByTestId("pile-anchor-overlay-output");

    expect(screen.getByText("View-scaled contrast active")).toBeInTheDocument();
    expect(screen.getByText("Numerical - view-scaled")).toBeInTheDocument();
    expect(inputOverlay.querySelectorAll(".pile-anchor-overlay__item")).toHaveLength(1);
    expect(outputOverlay.querySelectorAll(".pile-anchor-overlay__item")).toHaveLength(1);
    expect(screen.getByText("Pile A Feed")).toBeInTheDocument();
    expect(screen.getByText("Pile A Reclaim")).toBeInTheDocument();
  });
});
