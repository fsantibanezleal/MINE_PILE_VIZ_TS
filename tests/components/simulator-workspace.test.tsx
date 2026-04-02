import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SimulatorWorkspace } from "@/components/simulator/simulator-workspace";
import type {
  BeltSnapshot,
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
  files: { cells: "stockpiles/vpile_mix/cells.arrow" },
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

const virtualBelt: BeltSnapshot = {
  objectId: "vbelt_lane",
  displayName: "Virtual Lane",
  timestamp: "2025-03-19T01:15:00Z",
  totalMassTon: 36,
  blockCount: 2,
  qualityAverages: { q_num_fe: 1.18 },
  blocks: [
    {
      position: 0,
      massTon: 18,
      timestampOldestMs: 1742346000000,
      timestampNewestMs: 1742346900000,
      qualityValues: { q_num_fe: 1.16 },
    },
    {
      position: 1,
      massTon: 18,
      timestampOldestMs: 1742346000000,
      timestampNewestMs: 1742346900000,
      qualityValues: { q_num_fe: 1.2 },
    },
  ],
};

const physicalBelt: BeltSnapshot = {
  objectId: "belt_b",
  displayName: "Belt B",
  timestamp: "2025-03-19T01:15:00Z",
  totalMassTon: 54,
  blockCount: 3,
  qualityAverages: { q_num_fe: 1.24 },
  blocks: [
    {
      position: 0,
      massTon: 18,
      timestampOldestMs: 1742346000000,
      timestampNewestMs: 1742346900000,
      qualityValues: { q_num_fe: 1.2 },
    },
    {
      position: 1,
      massTon: 18,
      timestampOldestMs: 1742346000000,
      timestampNewestMs: 1742346900000,
      qualityValues: { q_num_fe: 1.24 },
    },
    {
      position: 2,
      massTon: 18,
      timestampOldestMs: 1742346000000,
      timestampNewestMs: 1742346900000,
      qualityValues: { q_num_fe: 1.28 },
    },
  ],
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
  it("centers the simulator on piles and renders downstream belt content under each output", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith("/api/profiler/summary")) {
        return jsonResponse(summaryRows);
      }

      if (url.endsWith("/api/profiler/objects/pile_a/snapshots/20250319011500")) {
        return jsonResponse(profilerSnapshot);
      }

      if (url.endsWith("/api/stockpiles/vpile_mix")) {
        return jsonResponse(currentVirtualPile);
      }

      if (url.endsWith("/api/live/belts/vbelt_lane")) {
        return jsonResponse(virtualBelt);
      }

      if (url.endsWith("/api/live/belts/belt_b")) {
        return jsonResponse(physicalBelt);
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

    expect(screen.getByRole("button", { name: /West reclaim/i })).toBeInTheDocument();
    expect(screen.getByText("Virtual Lane")).toBeInTheDocument();
    expect(screen.getByText("Belt B")).toBeInTheDocument();
    expect(screen.getByText("Active lane summary")).toBeInTheDocument();
    expect(screen.getByText("Combined mass")).toBeInTheDocument();
    expect(
      screen.getByLabelText("West reclaim numerical mass distribution for Fe"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Virtual Lane block strip")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Virtual Lane numerical mass distribution for Fe"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("pile-3d-canvas")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Central pile"), {
      target: { value: "vpile_mix" },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/stockpiles/vpile_mix");
    });

    await waitFor(() => {
      expect(screen.getAllByText("Virtual Mixer").length).toBeGreaterThan(0);
    });

    expect(screen.getByRole("button", { name: /To CV301/i })).toBeInTheDocument();
  });
});
