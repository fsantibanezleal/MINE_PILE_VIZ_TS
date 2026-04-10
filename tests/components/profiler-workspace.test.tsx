import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfilerWorkspace } from "@/components/profiler/profiler-workspace";
import { getVerticalCompressionStorageKey } from "@/lib/use-persistent-vertical-compression";
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

vi.mock("@/components/stockpiles/pile-3d-canvas", () => ({
  Pile3DCanvas: ({
    verticalCompressionFactor = 1,
    viewpoint,
  }: {
    verticalCompressionFactor?: number;
    viewpoint?: { position: [number, number, number] };
  }) => (
    <div
      data-testid="pile-3d-canvas"
      data-vertical-compression={String(verticalCompressionFactor)}
      data-viewpoint-position={viewpoint?.position.join(",") ?? "none"}
    >
      3D pile
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
    timestamp: snapshotId === "20250319010000" ? "2025-03-19T01:00:00Z" : "2025-03-19T01:15:00Z",
    dimension: 1,
    rows: [
      {
        ix: 0,
        iy: 0,
        iz: 0,
        massTon: snapshotId === "20250319010000" ? 18 : 20,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: snapshotId === "20250319010000" ? 1.1 : 1.2 },
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

function create3DPileSnapshot(snapshotId: string): ProfilerSnapshot {
  return {
    objectId: "pile_a",
    displayName: "Pile A",
    objectType: "pile",
    snapshotId,
    timestamp: "2025-03-19T01:15:00Z",
    dimension: 3,
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
        iz: 1,
        massTon: 20,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: 1.18 },
      },
      {
        ix: 1,
        iy: 1,
        iz: 2,
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

function createDeferredJsonResponse() {
  let resolveResponse: ((value: Response) => void) | null = null;
  const promise = new Promise<Response>((resolve) => {
    resolveResponse = resolve;
  });

  return {
    promise,
    resolve(payload: unknown) {
      resolveResponse?.(jsonResponse(payload));
    },
  };
}

describe("ProfilerWorkspace", () => {
  it("renders one-object historical exploration with quality series instead of a circuit mode", async () => {
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

    await screen.findByRole("heading", { name: "Pile A" });
    expect(screen.getByText("Historical object content")).toBeInTheDocument();
    expect(screen.getByText("Quality series")).toBeInTheDocument();
    expect(screen.queryByText("Circuit")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Object"), {
      target: { value: "belt_b" },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/profiler/objects/belt_b/snapshots/20250319011500",
      );
    });

    await screen.findByRole("heading", { name: "Belt B" });
    expect(screen.getByText("Historical object content")).toBeInTheDocument();
    expect(screen.getByText("Quality series")).toBeInTheDocument();
  });

  it("shows pile anchors and hovered cell details in the historical object view", async () => {
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
    await screen.findByText("Pile A Feed");
    expect(screen.getByText("Pile A Reclaim")).toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByLabelText("Pile cell 0,0,0"));

    expect(screen.getByText("Cell Focus")).toBeInTheDocument();
    expect(screen.getByText("0, 0, 0")).toBeInTheDocument();
    expect(screen.getAllByText("20 t").length).toBeGreaterThan(0);
  });

  it("allows selecting a historical snapshot directly from the quality series", async () => {
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
        name: "Select quality series snapshot 1 at 2025-03-19T01:00:00Z",
      }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/profiler/objects/pile_a/snapshots/20250319010000",
      );
    });
  });

  it("adds in-figure anchors for 2D profiler pile snapshots", async () => {
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
    await screen.findByText("Pile A Feed");
    const inputOverlay = await screen.findByTestId("pile-anchor-overlay-input");
    const outputOverlay = screen.getByTestId("pile-anchor-overlay-output");

    expect(screen.getByText("View-scaled contrast active")).toBeInTheDocument();
    expect(screen.getByText("Numerical - view-scaled")).toBeInTheDocument();
    expect(inputOverlay.querySelectorAll(".pile-anchor-overlay__item")).toHaveLength(1);
    expect(outputOverlay.querySelectorAll(".pile-anchor-overlay__item")).toHaveLength(1);
  });

  it("exposes vertical compression for 3D profiler snapshots", async () => {
    window.localStorage.clear();
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith("/api/profiler/summary")) {
        return jsonResponse(summaryRows);
      }

      if (url.endsWith("/api/profiler/objects/pile_a/snapshots/20250319011500")) {
        return jsonResponse(create3DPileSnapshot("20250319011500"));
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<ProfilerWorkspace graph={graph} index={index} qualities={qualities} />);

    const pileCanvas = await screen.findByTestId("pile-3d-canvas");
    const factorInput = screen.getByLabelText("Vertical compression factor");

    expect(pileCanvas).toHaveAttribute("data-vertical-compression", "1");

    fireEvent.change(factorInput, {
      target: { value: "40" },
    });

    expect(screen.getByText("Effective vertical scale: 1 / 40")).toBeInTheDocument();
    expect(screen.getByTestId("pile-3d-canvas")).toHaveAttribute(
      "data-vertical-compression",
      "40",
    );
  });

  it("restores the stored profiler vertical compression factor", async () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      getVerticalCompressionStorageKey("profiler"),
      "21",
    );
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith("/api/profiler/summary")) {
        return jsonResponse(summaryRows);
      }

      if (url.endsWith("/api/profiler/objects/pile_a/snapshots/20250319011500")) {
        return jsonResponse(create3DPileSnapshot("20250319011500"));
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<ProfilerWorkspace graph={graph} index={index} qualities={qualities} />);

    await screen.findByTestId("pile-3d-canvas");
    expect(screen.getByTestId("pile-3d-canvas")).toHaveAttribute(
      "data-vertical-compression",
      "21",
    );
    expect(screen.getByText("Effective vertical scale: 1 / 21")).toBeInTheDocument();
  });

  it("keeps the active 3D pile canvas mounted while the next profiler snapshot loads", async () => {
    const deferredSnapshot = createDeferredJsonResponse();
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith("/api/profiler/summary")) {
        return jsonResponse(summaryRows);
      }

      if (url.endsWith("/api/profiler/objects/pile_a/snapshots/20250319011500")) {
        return jsonResponse(create3DPileSnapshot("20250319011500"));
      }

      if (url.endsWith("/api/profiler/objects/pile_a/snapshots/20250319010000")) {
        return deferredSnapshot.promise;
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<ProfilerWorkspace graph={graph} index={index} qualities={qualities} />);

    await screen.findByTestId("pile-3d-canvas");

    fireEvent.change(screen.getByLabelText("Snapshot"), {
      target: { value: "0" },
    });

    expect(screen.getByTestId("pile-3d-canvas")).toBeInTheDocument();
    expect(screen.getByText("Loading profiler snapshot...")).toBeInTheDocument();

    deferredSnapshot.resolve(create3DPileSnapshot("20250319010000"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/profiler/objects/pile_a/snapshots/20250319010000",
      );
    });
  });
});
