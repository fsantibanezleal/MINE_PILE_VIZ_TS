import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LiveRouteWorkspace } from "@/components/live/live-route-workspace";
import type {
  BeltSnapshot,
  CircuitGraph,
  ObjectRegistryEntry,
  ObjectSummary,
  QualityDefinition,
} from "@/types/app-data";

const replaceMock = vi.fn();
let search = "";

vi.mock("next/navigation", () => ({
  usePathname: () => "/live",
  useRouter: () => ({
    replace: replaceMock,
  }),
  useSearchParams: () => new URLSearchParams(search),
}));

vi.mock("@/components/live/live-workspace", () => ({
  LiveWorkspace: () => <div>live belts workspace</div>,
}));

vi.mock("@/components/stockpiles/stockpile-workspace", () => ({
  StockpileWorkspace: () => <div>live piles workspace</div>,
}));

const graph: CircuitGraph = {
  stages: [],
  nodes: [],
  edges: [],
};

const summaries: ObjectSummary[] = [];
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

const initialBelt: BeltSnapshot = {
  objectId: "belt_a",
  displayName: "Belt A",
  timestamp: "2025-03-19T01:15:00Z",
  totalMassTon: 120,
  blockCount: 3,
  qualityAverages: { q_num_fe: 1.1 },
  blocks: [],
};

const pileEntries: ObjectRegistryEntry[] = [
  {
    objectId: "pile_a",
    objectType: "pile",
    objectRole: "physical",
    displayName: "Pile A",
    shortDescription: "Dense current pile",
    stageIndex: 1,
    dimension: 3,
    isProfiled: true,
    livePileRef: "live/piles/pile_a/meta.json",
  },
];

describe("LiveRouteWorkspace", () => {
  it("defaults to the dense belts subview when live belts are available", () => {
    search = "";
    replaceMock.mockReset();

    render(
      <LiveRouteWorkspace
        graph={graph}
        summaries={summaries}
        registry={pileEntries}
        qualities={qualities}
        initialBelt={initialBelt}
        pileEntries={pileEntries}
        initialPileId="pile_a"
      />,
    );

    expect(screen.getByText("live belts workspace")).toBeInTheDocument();
    expect(screen.queryByText("live piles workspace")).not.toBeInTheDocument();
  });

  it("switches to the dense pile subview through the shared live route query", () => {
    search = "";
    replaceMock.mockReset();

    render(
      <LiveRouteWorkspace
        graph={graph}
        summaries={summaries}
        registry={pileEntries}
        qualities={qualities}
        initialBelt={initialBelt}
        pileEntries={pileEntries}
        initialPileId="pile_a"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Piles / VPiles" }));

    expect(replaceMock).toHaveBeenCalledOnce();
    expect(String(replaceMock.mock.calls[0]?.[0])).toContain("view=piles");
  });
});
