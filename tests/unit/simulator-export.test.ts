import { describe, expect, it } from "vitest";
import { buildSimulatorExportArtifact } from "@/lib/simulator-export";
import type {
  QualityDefinition,
  SimulatorObjectManifest,
  SimulatorStepSnapshot,
} from "@/types/app-data";

const quality: QualityDefinition = {
  id: "q_num_fe",
  kind: "numerical",
  label: "Fe",
  description: "Iron grade",
  min: 0,
  max: 2,
  palette: ["#153a63", "#59ddff", "#f4bc63"],
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
  ],
  steps: [
    {
      snapshotId: "20250301234500",
      timestamp: "2025-03-01T23:45:00Z",
      kind: "base",
      pileSnapshotRef: "simulator/objects/pile_stockpile/steps/20250301234500/pile.arrow",
      outputSnapshotRefs: {
        out_1: "simulator/objects/pile_stockpile/steps/20250301234500/outputs/out_1.arrow",
      },
    },
  ],
};

const step: SimulatorStepSnapshot = {
  objectId: "pile_stockpile",
  displayName: "Plant Stockpile",
  objectType: "pile",
  snapshotId: "20250302000000",
  timestamp: "2025-03-02T00:00:00Z",
  dimension: 3,
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
  ],
  outputSnapshots: {
    out_1: {
      objectId: "vbelt_sp_f01",
      displayName: "Feeder 01",
      timestamp: "2025-03-02T00:00:00Z",
      totalMassTon: 30,
      blockCount: 2,
      qualityAverages: { q_num_fe: 0.95 },
      blocks: [
        {
          position: 0,
          massTon: 15,
          timestampOldestMs: 1740873600000,
          timestampNewestMs: 1740873600000,
          qualityValues: { q_num_fe: 0.9 },
        },
        {
          position: 1,
          massTon: 15,
          timestampOldestMs: 1740873600000,
          timestampNewestMs: 1740873600000,
          qualityValues: { q_num_fe: 1.0 },
        },
      ],
    },
  },
};

describe("buildSimulatorExportArtifact", () => {
  it("builds a simulator HTML report with context and feeder evidence", () => {
    const artifact = buildSimulatorExportArtifact({
      manifest,
      step,
      stepLabel: "+15 min",
      selectedQuality: quality,
      pileMassTon: 210,
      visibleCellCount: 1,
      viewMode: "surface",
      verticalCompressionFactor: 25,
      surfaceColorMode: null,
    });

    expect(artifact.filename).toContain("simulator-report");
    expect(artifact.filename).toContain("pile-stockpile");
    expect(artifact.html).toContain("Plant Stockpile");
    expect(artifact.html).toContain("Feeder 01");
    expect(artifact.html).toContain("Selected quality");
    expect(artifact.html).toContain("1 / 25");
    expect(artifact.html).toContain("Rate / 15 min");
    expect(artifact.html).toContain("vbelt_sp_f01 -&gt; belt_cv301");
  });
});
