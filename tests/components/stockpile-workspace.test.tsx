import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StockpileWorkspace } from "@/components/stockpiles/stockpile-workspace";
import type {
  ObjectRegistryEntry,
  PileDataset,
  QualityDefinition,
} from "@/types/app-data";

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
    inputs: [],
    outputs: [],
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
    await screen.findByRole("heading", { name: "Pile A" });
    expect(fetchMock).toHaveBeenCalledWith("/api/stockpiles/pile_a");

    fireEvent.change(screen.getByLabelText("Pile"), {
      target: { value: "pile_b" },
    });

    expect(screen.getByText("Loading stockpile dataset...")).toBeInTheDocument();
    await screen.findByRole("heading", { name: "Pile B" });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/stockpiles/pile_b");
    });
  });
});
