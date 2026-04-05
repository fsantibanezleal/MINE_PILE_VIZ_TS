import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SimulatorWorkspace } from "@/components/simulator/simulator-workspace";
import type {
  CircuitGraph,
  PileDataset,
  ProfilerIndex,
  ProfilerSnapshot,
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

vi.mock("@/components/stockpiles/pile-3d-canvas", () => ({
  Pile3DCanvas: () => <div data-testid="pile-3d-canvas">3D pile</div>,
}));

vi.mock("@/components/stockpiles/pile-anchor-frame", () => ({
  PileAnchorFrame: ({ children }: { children: ReactNode }) => (
    <div data-testid="pile-anchor-frame">{children}</div>
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
  stages: [
    { index: 0, label: "Accumulation", nodeIds: ["pile_a"] },
    { index: 1, label: "Discharge", nodeIds: ["vbelt_lane", "vpile_mix"] },
    { index: 2, label: "Transport", nodeIds: ["belt_b"] },
  ],
  nodes: [
    {
      id: "pile_a",
      objectId: "pile_a",
      objectType: "pile",
      objectRole: "physical",
      label: "Pile A",
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
          x: 0.3,
          y: 0.9,
          relatedObjectId: "vbelt_lane",
        },
      ],
    },
    {
      id: "vbelt_lane",
      objectId: "vbelt_lane",
      objectType: "belt",
      objectRole: "virtual",
      label: "Virtual Lane",
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
      shortDescription: "Virtual pile",
      inputs: [],
      outputs: [
        {
          id: "out-b",
          label: "To CV301",
          kind: "output",
          x: 0.5,
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
      stageIndex: 2,
      dimension: 1,
      isProfiled: true,
      shortDescription: "Physical downstream belt",
      inputs: [],
      outputs: [],
    },
  ],
  edges: [
    { id: "e1", source: "pile_a", target: "vbelt_lane", label: "west" },
    { id: "e2", source: "vbelt_lane", target: "vpile_mix", label: "mix" },
    { id: "e3", source: "vpile_mix", target: "belt_b", label: "belt" },
  ],
};

const index: ProfilerIndex = {
  defaultObjectId: "pile_a",
  objects: [
    {
      objectId: "pile_a",
      displayName: "Pile A",
      objectType: "pile",
      dimension: 3,
      manifestRef: "profiler/objects/pile_a/manifest.json",
    },
    {
      objectId: "belt_b",
      displayName: "Belt B",
      objectType: "belt",
      dimension: 1,
      manifestRef: "profiler/objects/belt_b/manifest.json",
    },
    {
      objectId: "vpile_mix",
      displayName: "Virtual Mixer",
      objectType: "pile",
      dimension: 1,
      manifestRef: "profiler/objects/vpile_mix/manifest.json",
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
    dimension: 3,
    massTon: 95,
    qualityValues: { q_num_fe: 1.04 },
  },
  {
    snapshotId: "20250319011500",
    timestamp: "2025-03-19T01:15:00Z",
    objectId: "pile_a",
    objectType: "pile",
    displayName: "Pile A",
    dimension: 3,
    massTon: 104,
    qualityValues: { q_num_fe: 1.14 },
  },
  {
    snapshotId: "20250319011500",
    timestamp: "2025-03-19T01:15:00Z",
    objectId: "vpile_mix",
    objectType: "pile",
    displayName: "Virtual Mixer",
    dimension: 1,
    massTon: 54,
    qualityValues: { q_num_fe: 1.22 },
  },
];

const profilerSnapshot: ProfilerSnapshot = {
  objectId: "pile_a",
  displayName: "Pile A",
  objectType: "pile",
  snapshotId: "20250319011500",
  timestamp: "2025-03-19T01:15:00Z",
  dimension: 3,
  rows: [
    {
      ix: 0,
      iy: 0,
      iz: 0,
      massTon: 50,
      timestampOldestMs: 1742346000000,
      timestampNewestMs: 1742346900000,
      qualityValues: { q_num_fe: 1.1 },
    },
    {
      ix: 1,
      iy: 0,
      iz: 0,
      massTon: 54,
      timestampOldestMs: 1742346000000,
      timestampNewestMs: 1742346900000,
      qualityValues: { q_num_fe: 1.18 },
    },
  ],
};

const currentVirtualPile: PileDataset = {
  objectId: "vpile_mix",
  displayName: "Virtual Mixer",
  objectRole: "virtual",
  timestamp: "2025-03-19T01:15:00Z",
  dimension: 1,
  extents: { x: 1, y: 1, z: 3 },
  occupiedCellCount: 3,
  surfaceCellCount: 1,
  defaultQualityId: "q_num_fe",
  availableQualityIds: ["q_num_fe"],
  viewModes: ["full"],
  suggestedFullStride: 1,
  fullModeThreshold: 12,
  qualityAverages: { q_num_fe: 1.22 },
  inputs: [],
  outputs: [
    {
      id: "out-b",
      label: "To CV301",
      kind: "output",
      x: 0.5,
      y: 0.9,
      relatedObjectId: "belt_b",
    },
  ],
  files: { cells: "live/piles/vpile_mix/cells.arrow" },
  cells: [
    {
      ix: 0,
      iy: 0,
      iz: 0,
      massTon: 18,
      timestampOldestMs: 1742346000000,
      timestampNewestMs: 1742346900000,
      qualityValues: { q_num_fe: 1.16 },
    },
    {
      ix: 0,
      iy: 0,
      iz: 1,
      massTon: 18,
      timestampOldestMs: 1742346000000,
      timestampNewestMs: 1742346900000,
      qualityValues: { q_num_fe: 1.22 },
    },
    {
      ix: 0,
      iy: 0,
      iz: 2,
      massTon: 18,
      timestampOldestMs: 1742346000000,
      timestampNewestMs: 1742346900000,
      qualityValues: { q_num_fe: 1.28 },
    },
  ],
  surfaceCells: [
    {
      ix: 0,
      iy: 0,
      iz: 2,
      massTon: 18,
      timestampOldestMs: 1742346000000,
      timestampNewestMs: 1742346900000,
      qualityValues: { q_num_fe: 1.28 },
    },
  ],
  shellCells: [],
};

const profiledPhysicalBelt: ProfilerSnapshot = {
  objectId: "belt_b",
  displayName: "Belt B",
  objectType: "belt",
  snapshotId: "20250319011500",
  timestamp: "2025-03-19T01:15:00Z",
  dimension: 1,
  rows: [
    {
      ix: 0,
      iy: 0,
      iz: 0,
      massTon: 18,
      timestampOldestMs: 1742346000000,
      timestampNewestMs: 1742346900000,
      qualityValues: { q_num_fe: 1.2 },
    },
    {
      ix: 1,
      iy: 0,
      iz: 0,
      massTon: 18,
      timestampOldestMs: 1742346000000,
      timestampNewestMs: 1742346900000,
      qualityValues: { q_num_fe: 1.24 },
    },
    {
      ix: 2,
      iy: 0,
      iz: 0,
      massTon: 18,
      timestampOldestMs: 1742346000000,
      timestampNewestMs: 1742346900000,
      qualityValues: { q_num_fe: 1.28 },
    },
  ],
};

const virtualPileProfilerSnapshot: ProfilerSnapshot = {
  objectId: "vpile_mix",
  displayName: "Virtual Mixer",
  objectType: "pile",
  snapshotId: "20250319011500",
  timestamp: "2025-03-19T01:15:00Z",
  dimension: 1,
  rows: currentVirtualPile.cells,
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("SimulatorWorkspace", () => {
  it("centers the simulator on piles and renders the active discharge route as direct, merge, and downstream stages", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith("/api/profiler/summary")) {
        return jsonResponse(summaryRows);
      }

      if (url.endsWith("/api/profiler/objects/pile_a/snapshots/20250319011500")) {
        return jsonResponse(profilerSnapshot);
      }

      if (url.endsWith("/api/profiler/objects/vpile_mix/snapshots/20250319011500")) {
        return jsonResponse(virtualPileProfilerSnapshot);
      }

      if (url.endsWith("/api/profiler/objects/belt_b/snapshots/20250319011500")) {
        return jsonResponse(profiledPhysicalBelt);
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<SimulatorWorkspace graph={graph} index={index} qualities={qualities} />);

    expect(screen.getByText("Loading simulator history...")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/profiler/summary");
    });

    await waitFor(() => {
      expect(screen.getByTestId("pile-3d-canvas")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/profiler/objects/belt_b/snapshots/20250319011500",
    );
    expect(fetchMock).not.toHaveBeenCalledWith("/api/live/belts/vbelt_lane");
    expect(fetchMock).not.toHaveBeenCalledWith("/api/live/belts/belt_b");

    expect(screen.getByRole("button", { name: /West reclaim/i })).toBeInTheDocument();
    expect(screen.getByText("Direct reclaim")).toBeInTheDocument();
    expect(screen.getAllByText("Virtual merge").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Downstream conveyors").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Virtual Lane").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Virtual Mixer").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Belt B").length).toBeGreaterThan(0);
    expect(screen.getByText("Active route evidence")).toBeInTheDocument();
    expect(screen.getByText("Discharge reading context")).toBeInTheDocument();
    expect(screen.getByText("Active route context")).toBeInTheDocument();
    expect(screen.getByText("Route semantics")).toBeInTheDocument();
    expect(screen.getByText("Inspect route anchor")).toBeInTheDocument();
    expect(screen.getAllByText("Independent discharge route").length).toBeGreaterThan(0);
    expect(screen.getByText("Combined mass")).toBeInTheDocument();
    expect(screen.getAllByText("Profiler-aligned").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Snapshot UTC").length).toBeGreaterThan(0);
    expect(screen.getByText("Structural transport only")).toBeInTheDocument();
    expect(screen.queryByText("Profiled properties")).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("West reclaim numerical mass distribution for Fe"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Virtual Lane block strip")).not.toBeInTheDocument();
    expect(screen.getByTestId("pile-3d-canvas")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Route anchor"), {
      target: { value: "vpile_mix" },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/profiler/objects/vpile_mix/snapshots/20250319011500",
      );
    });

    await waitFor(() => {
      expect(screen.getAllByText("Virtual Mixer").length).toBeGreaterThan(0);
    });

    expect(screen.getByRole("button", { name: /To CV301/i })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Inspect route anchor"));
    expect(screen.getByText("Central object material time")).toBeInTheDocument();
  });
});
