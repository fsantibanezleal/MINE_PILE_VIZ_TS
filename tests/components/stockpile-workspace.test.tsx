import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StockpileWorkspace } from "@/components/stockpiles/stockpile-workspace";
import type {
  ObjectRegistryEntry,
  PileDataset,
  QualityDefinition,
} from "@/types/app-data";

vi.mock("next/navigation", () => ({
  usePathname: () => "/stockpiles",
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

const pileEntries: ObjectRegistryEntry[] = [
  {
    objectId: "pile_a",
    objectType: "pile",
    objectRole: "physical",
    displayName: "Pile A",
    shortDescription: "First pile",
    stageIndex: 1,
    dimension: 1,
    isProfiled: false,
    stockpileRef: "stockpiles/pile_a/meta.json",
  },
  {
    objectId: "pile_b",
    objectType: "pile",
    objectRole: "physical",
    displayName: "Pile B",
    shortDescription: "Second pile",
    stageIndex: 2,
    dimension: 1,
    isProfiled: false,
    stockpileRef: "stockpiles/pile_b/meta.json",
  },
];

function createPileDataset(objectId: string, displayName: string, fe: number): PileDataset {
  return {
    objectId,
    displayName,
    objectRole: "physical",
    timestamp: "2025-03-19T01:15:00Z",
    dimension: 1,
    extents: { x: 1, y: 1, z: 3 },
    occupiedCellCount: 3,
    surfaceCellCount: 1,
    defaultQualityId: "q_num_fe",
    availableQualityIds: ["q_num_fe"],
    viewModes: ["full"],
    suggestedFullStride: 1,
    fullModeThreshold: 100,
    qualityAverages: { q_num_fe: fe },
    inputs: [
      {
        id: `${objectId}-feed`,
        label: `${displayName} Feed`,
        kind: "input",
        x: 0.25,
        y: 0.15,
        relatedObjectId: "belt_feed",
      },
    ],
    outputs: [
      {
        id: `${objectId}-reclaim`,
        label: `${displayName} Reclaim`,
        kind: "output",
        x: 0.75,
        y: 0.9,
        relatedObjectId: "belt_reclaim",
      },
    ],
    files: {
      cells: `stockpiles/${objectId}/cells.arrow`,
    },
    cells: [
      {
        ix: 0,
        iy: 0,
        iz: 0,
        massTon: 10,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: fe - 0.1 },
      },
      {
        ix: 0,
        iy: 0,
        iz: 1,
        massTon: 10,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: fe },
      },
      {
        ix: 0,
        iy: 0,
        iz: 2,
        massTon: 10,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: fe + 0.1 },
      },
    ],
    surfaceCells: [
      {
        ix: 0,
        iy: 0,
        iz: 2,
        massTon: 10,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: fe + 0.1 },
      },
    ],
    shellCells: [],
  };
}

function create2DPileDataset(objectId: string, displayName: string, fe: number): PileDataset {
  return {
    objectId,
    displayName,
    objectRole: "physical",
    timestamp: "2025-03-19T01:15:00Z",
    dimension: 2,
    extents: { x: 2, y: 2, z: 1 },
    occupiedCellCount: 4,
    surfaceCellCount: 4,
    defaultQualityId: "q_num_fe",
    availableQualityIds: ["q_num_fe"],
    viewModes: ["full"],
    suggestedFullStride: 1,
    fullModeThreshold: 100,
    qualityAverages: { q_num_fe: fe },
    inputs: [
      {
        id: `${objectId}-feed-west`,
        label: `${displayName} Feed West`,
        kind: "input",
        x: 0.22,
        y: 0.15,
        relatedObjectId: "belt_feed",
      },
      {
        id: `${objectId}-feed-east`,
        label: `${displayName} Feed East`,
        kind: "input",
        x: 0.78,
        y: 0.15,
        relatedObjectId: "belt_feed",
      },
    ],
    outputs: [
      {
        id: `${objectId}-reclaim-west`,
        label: `${displayName} Reclaim West`,
        kind: "output",
        x: 0.28,
        y: 0.9,
        relatedObjectId: "belt_reclaim",
      },
      {
        id: `${objectId}-reclaim-east`,
        label: `${displayName} Reclaim East`,
        kind: "output",
        x: 0.72,
        y: 0.9,
        relatedObjectId: "belt_reclaim",
      },
    ],
    files: {
      cells: `stockpiles/${objectId}/cells.arrow`,
    },
    cells: [
      {
        ix: 0,
        iy: 0,
        iz: 0,
        massTon: 12,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: fe - 0.08 },
      },
      {
        ix: 1,
        iy: 0,
        iz: 0,
        massTon: 13,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: fe - 0.02 },
      },
      {
        ix: 0,
        iy: 1,
        iz: 0,
        massTon: 14,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: fe + 0.04 },
      },
      {
        ix: 1,
        iy: 1,
        iz: 0,
        massTon: 15,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: fe + 0.1 },
      },
    ],
    surfaceCells: [
      {
        ix: 0,
        iy: 0,
        iz: 0,
        massTon: 12,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: fe - 0.08 },
      },
      {
        ix: 1,
        iy: 0,
        iz: 0,
        massTon: 13,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: fe - 0.02 },
      },
      {
        ix: 0,
        iy: 1,
        iz: 0,
        massTon: 14,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: fe + 0.04 },
      },
      {
        ix: 1,
        iy: 1,
        iz: 0,
        massTon: 15,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: fe + 0.1 },
      },
    ],
    shellCells: [],
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

describe("StockpileWorkspace", () => {
  it("loads the selected pile dataset on demand and refreshes when the selection changes", async () => {
    const pileA = createPileDataset("pile_a", "Pile A", 1.1);
    const pileB = createPileDataset("pile_b", "Pile B", 1.4);
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith("/api/stockpiles/pile_a")) {
        return jsonResponse(pileA);
      }

      if (url.endsWith("/api/stockpiles/pile_b")) {
        return jsonResponse(pileB);
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(
      <StockpileWorkspace
        pileEntries={pileEntries}
        qualities={qualities}
        initialPileId="pile_a"
      />,
    );

    expect(screen.getByText("Loading stockpile dataset...")).toBeInTheDocument();
    await screen.findByText("Pile A Feed");
    expect(fetchMock).toHaveBeenCalledWith("/api/stockpiles/pile_a");
    expect(screen.getByText("Pile A Feed")).toBeInTheDocument();
    expect(screen.getByText("Pile A Reclaim")).toBeInTheDocument();
    expect(screen.getByText("Structure profile")).toBeInTheDocument();
    expect(screen.getByText("Mass by x axis")).toBeInTheDocument();
    expect(screen.queryByTestId("pile-anchor-overlay-input")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pile-anchor-overlay-output")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Pile"), {
      target: { value: "pile_b" },
    });

    expect(screen.getByText("Loading stockpile dataset...")).toBeInTheDocument();
    await screen.findByText("Pile B Feed");
    expect(screen.getByText("Pile B Feed")).toBeInTheDocument();
    expect(screen.getByText("Pile B Reclaim")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/stockpiles/pile_b");
    });
  });

  it("shows hovered cell details for the active pile view", async () => {
    const pileA = createPileDataset("pile_a", "Pile A", 1.1);
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith("/api/stockpiles/pile_a")) {
        return jsonResponse(pileA);
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(
      <StockpileWorkspace
        pileEntries={pileEntries}
        qualities={qualities}
        initialPileId="pile_a"
      />,
    );

    await screen.findByText("Pile A Feed");
    fireEvent.mouseEnter(screen.getByLabelText("Pile cell 0,0,0"));

    expect(screen.getByText("Cell Focus")).toBeInTheDocument();
    expect(screen.getByText("0, 0, 0")).toBeInTheDocument();
    expect(screen.getAllByText("10 t").length).toBeGreaterThan(0);
  });

  it("switches the pile inspection to material time mode", async () => {
    const pileA = createPileDataset("pile_a", "Pile A", 1.1);
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith("/api/stockpiles/pile_a")) {
        return jsonResponse(pileA);
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(
      <StockpileWorkspace
        pileEntries={pileEntries}
        qualities={qualities}
        initialPileId="pile_a"
      />,
    );

    await screen.findByText("Pile A Feed");
    fireEvent.change(screen.getByLabelText("Inspection mode"), {
      target: { value: "oldest-age" },
    });

    expect(screen.getByText("Material time mode active")).toBeInTheDocument();
    expect(screen.getByText("Oldest material age")).toBeInTheDocument();
  });

  it("renders in-figure pile anchors for 2D stockpiles while keeping the external anchor tracks", async () => {
    const pileA = create2DPileDataset("pile_a", "Pile A", 1.1);
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith("/api/stockpiles/pile_a")) {
        return jsonResponse(pileA);
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(
      <StockpileWorkspace
        pileEntries={pileEntries}
        qualities={qualities}
        initialPileId="pile_a"
      />,
    );

    await screen.findByText("Pile A Feed West");

    const inputOverlay = screen.getByTestId("pile-anchor-overlay-input");
    const outputOverlay = screen.getByTestId("pile-anchor-overlay-output");

    expect(inputOverlay).toBeInTheDocument();
    expect(outputOverlay).toBeInTheDocument();
    expect(screen.getByText("View-scaled contrast active")).toBeInTheDocument();
    expect(screen.getByText("Numerical - view-scaled")).toBeInTheDocument();
    expect(inputOverlay.querySelectorAll(".pile-anchor-overlay__item")).toHaveLength(2);
    expect(outputOverlay.querySelectorAll(".pile-anchor-overlay__item")).toHaveLength(2);
    expect(screen.getByText("Pile A Feed West")).toBeInTheDocument();
    expect(screen.getByText("Pile A Reclaim East")).toBeInTheDocument();
  });
});
