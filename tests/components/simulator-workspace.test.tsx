import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SimulatorWorkspace } from "@/components/simulator/simulator-workspace";
import type {
  CircuitGraph,
  QualityDefinition,
  SimulatorIndex,
  SimulatorObjectManifest,
  SimulatorStepSnapshot,
} from "@/types/app-data";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/simulator",
  useRouter: () => ({
    replace: replaceMock,
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
  stages: [{ index: 0, label: "Accumulation", nodeIds: ["pile_stockpile"] }],
  nodes: [
    {
      id: "pile_stockpile",
      objectId: "pile_stockpile",
      objectType: "pile",
      objectRole: "physical",
      label: "Plant Stockpile",
      stageIndex: 0,
      dimension: 3,
      isProfiled: true,
      shortDescription: "Main pile",
      inputs: [],
      outputs: [
        {
          id: "out_1",
          label: "Feeder 01",
          kind: "output",
          x: 0.25,
          y: 0.35,
          relatedObjectId: "vbelt_sp_f01",
        },
        {
          id: "out_2",
          label: "Feeder 02",
          kind: "output",
          x: 0.75,
          y: 0.65,
          relatedObjectId: "vbelt_sp_f02",
        },
      ],
    },
  ],
  edges: [],
};

const index: SimulatorIndex = {
  defaultObjectId: "pile_stockpile",
  objects: [
    {
      objectId: "pile_stockpile",
      displayName: "Plant Stockpile",
      objectType: "pile",
      dimension: 3,
      manifestRef: "simulator/objects/pile_stockpile/manifest.json",
    },
  ],
};

const manifest: SimulatorObjectManifest = {
  objectId: "pile_stockpile",
  objectType: "pile",
  displayName: "Plant Stockpile",
  objectRole: "physical",
  dimension: 3,
  defaultQualityId: "q_num_fe",
  availableQualityIds: ["q_num_fe"],
  latestProfilerSnapshotId: "20250301234500",
  latestProfilerTimestamp: "2025-03-01T23:45:00Z",
  stepMinutes: 15,
  outputs: [
    {
      id: "out_1",
      label: "Feeder 01",
      kind: "output",
      x: 0.25,
      y: 0.35,
      spanX: 0.12,
      spanY: 0.12,
      positionMode: "fixed",
      relatedObjectId: "vbelt_sp_f01",
      tonsPerStep: 30,
      tonsPerHour: 120,
      stepMinutes: 15,
      rateSource: "latest-transport",
      parentBeltId: "belt_cv301",
    },
    {
      id: "out_2",
      label: "Feeder 02",
      kind: "output",
      x: 0.75,
      y: 0.65,
      spanX: 0.12,
      spanY: 0.12,
      positionMode: "fixed",
      relatedObjectId: "vbelt_sp_f02",
      tonsPerStep: 20,
      tonsPerHour: 80,
      stepMinutes: 15,
      rateSource: "latest-transport",
      parentBeltId: "belt_cv301",
    },
  ],
  steps: [
    {
      snapshotId: "20250301234500",
      timestamp: "2025-03-01T23:45:00Z",
      kind: "base",
      pileSnapshotRef: "simulator/objects/pile_stockpile/steps/20250301234500/pile.arrow",
      outputSnapshotRefs: {
        out_1: "simulator/objects/pile_stockpile/steps/20250301234500/outputs/out_1.arrow",
        out_2: "simulator/objects/pile_stockpile/steps/20250301234500/outputs/out_2.arrow",
      },
    },
    {
      snapshotId: "20250302000000",
      timestamp: "2025-03-02T00:00:00Z",
      kind: "simulated",
      pileSnapshotRef: "simulator/objects/pile_stockpile/steps/20250302000000/pile.arrow",
      outputSnapshotRefs: {
        out_1: "simulator/objects/pile_stockpile/steps/20250302000000/outputs/out_1.arrow",
        out_2: "simulator/objects/pile_stockpile/steps/20250302000000/outputs/out_2.arrow",
      },
    },
  ],
};

const baseStep: SimulatorStepSnapshot = {
  objectId: "pile_stockpile",
  displayName: "Plant Stockpile",
  objectType: "pile",
  snapshotId: "20250301234500",
  timestamp: "2025-03-01T23:45:00Z",
  dimension: 3,
  pileRows: [
    {
      ix: 0,
      iy: 0,
      iz: 0,
      massTon: 120,
      timestampOldestMs: 1740872700000,
      timestampNewestMs: 1740872700000,
      qualityValues: { q_num_fe: 0.9 },
    },
    {
      ix: 1,
      iy: 0,
      iz: 0,
      massTon: 140,
      timestampOldestMs: 1740872700000,
      timestampNewestMs: 1740872700000,
      qualityValues: { q_num_fe: 1.1 },
    },
  ],
  outputSnapshots: {
    out_1: {
      objectId: "vbelt_sp_f01",
      displayName: "Feeder 01",
      timestamp: "2025-03-01T23:45:00Z",
      totalMassTon: 30,
      blockCount: 2,
      qualityAverages: { q_num_fe: 0.95 },
      blocks: [
        {
          position: 0,
          massTon: 15,
          timestampOldestMs: 1740872700000,
          timestampNewestMs: 1740872700000,
          qualityValues: { q_num_fe: 0.9 },
        },
        {
          position: 1,
          massTon: 15,
          timestampOldestMs: 1740872700000,
          timestampNewestMs: 1740872700000,
          qualityValues: { q_num_fe: 1.0 },
        },
      ],
    },
    out_2: {
      objectId: "vbelt_sp_f02",
      displayName: "Feeder 02",
      timestamp: "2025-03-01T23:45:00Z",
      totalMassTon: 20,
      blockCount: 1,
      qualityAverages: { q_num_fe: 1.1 },
      blocks: [
        {
          position: 0,
          massTon: 20,
          timestampOldestMs: 1740872700000,
          timestampNewestMs: 1740872700000,
          qualityValues: { q_num_fe: 1.1 },
        },
      ],
    },
  },
};

const simulatedStep: SimulatorStepSnapshot = {
  ...baseStep,
  snapshotId: "20250302000000",
  timestamp: "2025-03-02T00:00:00Z",
  pileRows: [
    {
      ix: 0,
      iy: 0,
      iz: 0,
      massTon: 90,
      timestampOldestMs: 1740873600000,
      timestampNewestMs: 1740873600000,
      qualityValues: { q_num_fe: 0.88 },
    },
    {
      ix: 1,
      iy: 0,
      iz: 0,
      massTon: 120,
      timestampOldestMs: 1740873600000,
      timestampNewestMs: 1740873600000,
      qualityValues: { q_num_fe: 1.08 },
    },
  ],
  outputSnapshots: {
    out_1: {
      ...baseStep.outputSnapshots.out_1,
      timestamp: "2025-03-02T00:00:00Z",
      totalMassTon: 30,
    },
    out_2: {
      ...baseStep.outputSnapshots.out_2,
      timestamp: "2025-03-02T00:00:00Z",
      totalMassTon: 20,
    },
  },
};

describe("SimulatorWorkspace", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/simulator/objects/pile_stockpile/steps/20250301234500")) {
        return Promise.resolve(
          new Response(JSON.stringify(baseStep), { status: 200 }),
        );
      }
      if (url.includes("/api/simulator/objects/pile_stockpile/steps/20250302000000")) {
        return Promise.resolve(
          new Response(JSON.stringify(simulatedStep), { status: 200 }),
        );
      }
      if (url.includes("/api/simulator/objects/pile_stockpile")) {
        return Promise.resolve(
          new Response(JSON.stringify(manifest), { status: 200 }),
        );
      }
      return Promise.resolve(new Response("Not found", { status: 404 }));
    });
    localStorage.clear();
  });

  it("shows the pile and all direct feeder outputs at the same time", async () => {
    render(<SimulatorWorkspace graph={graph} index={index} qualities={qualities} />);

    expect(await screen.findByText("Simulated feeder outputs")).toBeInTheDocument();
    expect(screen.getByText("Feeder 01")).toBeInTheDocument();
    expect(screen.getByText("Feeder 02")).toBeInTheDocument();
    expect(screen.getByTestId("pile-3d-canvas")).toBeInTheDocument();
    expect(screen.queryByText("Output discharge rates")).not.toBeInTheDocument();
  });

  it("moves to the next simulated step and keeps output columns visible", async () => {
    render(<SimulatorWorkspace graph={graph} index={index} qualities={qualities} />);

    await screen.findByText("Feeder 01");
    const stepLabel = screen.getByText("Simulated step").closest("label");
    const stepInput = stepLabel?.querySelector("input[type='range']");
    expect(stepInput).toBeTruthy();
    fireEvent.change(stepInput as HTMLInputElement, {
      target: { value: "1" },
    });

    await waitFor(() => {
      expect(screen.getAllByText("+15 min").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Simulated mass").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Rate \/ 15 min/i).length).toBeGreaterThan(0);
  });

  it("keeps vertical compression with the other 3D pile controls in simulator", async () => {
    render(<SimulatorWorkspace graph={graph} index={index} qualities={qualities} />);

    await screen.findByText("3D pile view");
    const factorInput = screen.getByLabelText("Vertical compression factor");

    fireEvent.change(factorInput, { target: { value: "25" } });

    await waitFor(() => {
      expect(screen.getByTestId("pile-3d-canvas")).toHaveAttribute(
        "data-vertical-compression",
        "25",
      );
    });
    expect(screen.getByText("Simulation reading notes")).toBeInTheDocument();
  });

  it("shows an export action for the active simulator report", async () => {
    render(<SimulatorWorkspace graph={graph} index={index} qualities={qualities} />);

    const exportButton = await screen.findByText("Export HTML report");
    await waitFor(() => {
      expect(exportButton).toBeEnabled();
    });
  });
});
