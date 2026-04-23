import { describe, expect, it } from "vitest";
import {
  buildLiveBeltExportArtifact,
  buildLivePileExportArtifact,
} from "@/lib/live-export";
import type {
  BeltSnapshot,
  PileDataset,
  QualityDefinition,
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

const beltSnapshot: BeltSnapshot = {
  objectId: "belt_feed",
  displayName: "Feed Belt",
  timestamp: "2025-03-07T23:45:00Z",
  totalMassTon: 120,
  blockCount: 2,
  qualityAverages: { q_num_fe: 0.62 },
  blocks: [
    {
      position: 0,
      massTon: 55,
      timestampOldestMs: 1741387500000,
      timestampNewestMs: 1741388100000,
      qualityValues: { q_num_fe: 0.58 },
    },
    {
      position: 1,
      massTon: 65,
      timestampOldestMs: 1741387560000,
      timestampNewestMs: 1741388160000,
      qualityValues: { q_num_fe: 0.66 },
    },
  ],
};

const pileDataset: PileDataset = {
  objectId: "pile_stockpile",
  displayName: "Plant Stockpile",
  objectRole: "physical",
  timestamp: "2025-03-07T23:45:00Z",
  dimension: 3,
  extents: { x: 2, y: 2, z: 3 },
  occupiedCellCount: 4,
  surfaceCellCount: 3,
  defaultQualityId: "q_num_fe",
  availableQualityIds: ["q_num_fe"],
  viewModes: ["surface", "shell", "full", "slice"],
  suggestedFullStride: 1,
  fullModeThreshold: 100,
  qualityAverages: { q_num_fe: 0.61 },
  inputs: [],
  outputs: [
    {
      id: "out_1",
      label: "Feeder 01",
      kind: "output",
      x: 0.25,
      y: 0.88,
      relatedObjectId: "belt_f01",
    },
  ],
  files: { cells: "live/piles/pile_stockpile/cells.arrow" },
  cells: [
    {
      ix: 0,
      iy: 0,
      iz: 0,
      massTon: 20,
      timestampOldestMs: 1741387200000,
      timestampNewestMs: 1741388100000,
      qualityValues: { q_num_fe: 0.55 },
    },
    {
      ix: 1,
      iy: 0,
      iz: 1,
      massTon: 22,
      timestampOldestMs: 1741387260000,
      timestampNewestMs: 1741388160000,
      qualityValues: { q_num_fe: 0.59 },
    },
    {
      ix: 0,
      iy: 1,
      iz: 2,
      massTon: 24,
      timestampOldestMs: 1741387320000,
      timestampNewestMs: 1741388220000,
      qualityValues: { q_num_fe: 0.64 },
    },
    {
      ix: 1,
      iy: 1,
      iz: 2,
      massTon: 26,
      timestampOldestMs: 1741387380000,
      timestampNewestMs: 1741388280000,
      qualityValues: { q_num_fe: 0.68 },
    },
  ],
  surfaceCells: [
    {
      ix: 1,
      iy: 0,
      iz: 1,
      massTon: 22,
      timestampOldestMs: 1741387260000,
      timestampNewestMs: 1741388160000,
      qualityValues: { q_num_fe: 0.59 },
    },
    {
      ix: 0,
      iy: 1,
      iz: 2,
      massTon: 24,
      timestampOldestMs: 1741387320000,
      timestampNewestMs: 1741388220000,
      qualityValues: { q_num_fe: 0.64 },
    },
    {
      ix: 1,
      iy: 1,
      iz: 2,
      massTon: 26,
      timestampOldestMs: 1741387380000,
      timestampNewestMs: 1741388280000,
      qualityValues: { q_num_fe: 0.68 },
    },
  ],
  shellCells: [],
};

describe("live export builders", () => {
  it("builds a live belt report with current-state context", () => {
    const artifact = buildLiveBeltExportArtifact({
      snapshot: beltSnapshot,
      selectedQuality: quality,
      inspectionQuality: quality,
      selectedTimeMode: "property",
      routeContext: {
        stageLabel: "Primary",
        stageIndex: 0,
        upstreamNodes: [],
        downstreamNodes: [],
        stagePeers: [],
      },
      materialTimeSummary: {
        recordCount: 2,
        totalMassTon: 120,
        oldestTimestampMs: 1741387500000,
        newestTimestampMs: 1741388160000,
        representedSpanMs: 660000,
        oldestAgeMs: 60000,
        newestAgeMs: 0,
      },
    });

    expect(artifact.filename).toContain("live-belt-report");
    expect(artifact.html).toContain("Feed Belt");
    expect(artifact.html).toContain("Dense current belt context");
    expect(artifact.html).toContain("Current belt content");
    expect(artifact.html).toContain("Tracked quality");
  });

  it("builds a live pile report with simultaneous direct outputs", () => {
    const artifact = buildLivePileExportArtifact({
      dataset: pileDataset,
      selectedQuality: quality,
      inspectionQuality: quality,
      selectedTimeMode: "property",
      materialTimeSummary: {
        recordCount: 4,
        totalMassTon: 92,
        oldestTimestampMs: 1741387200000,
        newestTimestampMs: 1741388280000,
        representedSpanMs: 1080000,
        oldestAgeMs: 900000,
        newestAgeMs: 0,
      },
      visibleCellCount: 3,
      viewMode: "surface",
      verticalCompressionFactor: 20,
      surfaceColorMode: null,
      outputSnapshots: {
        belt_f01: {
          objectId: "belt_f01",
          displayName: "Feeder Belt 01",
          timestamp: "2025-03-07T23:45:00Z",
          totalMassTon: 18,
          blockCount: 2,
          qualityAverages: { q_num_fe: 0.63 },
          blocks: [
            {
              position: 0,
              massTon: 9,
              timestampOldestMs: 1741387500000,
              timestampNewestMs: 1741388100000,
              qualityValues: { q_num_fe: 0.61 },
            },
            {
              position: 1,
              massTon: 9,
              timestampOldestMs: 1741387560000,
              timestampNewestMs: 1741388160000,
              qualityValues: { q_num_fe: 0.65 },
            },
          ],
        },
      },
      outputErrors: {},
    });

    expect(artifact.filename).toContain("live-pile-report");
    expect(artifact.html).toContain("Plant Stockpile");
    expect(artifact.html).toContain("Simultaneous feeder evidence");
    expect(artifact.html).toContain("Feeder 01");
    expect(artifact.html).toContain("Feeder Belt 01");
  });
});
