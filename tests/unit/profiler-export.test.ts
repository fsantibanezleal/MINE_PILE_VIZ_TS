import { describe, expect, it } from "vitest";
import { buildProfilerExportArtifact } from "@/lib/profiler-export";
import type {
  ProfilerSnapshot,
  ProfilerSummaryRow,
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

const rows: ProfilerSummaryRow[] = [
  {
    snapshotId: "20250307231500",
    timestamp: "2025-03-07T23:15:00Z",
    objectId: "pile_stockpile",
    objectType: "pile",
    displayName: "Plant Stockpile",
    dimension: 3,
    massTon: 96,
    qualityValues: { q_num_fe: 0.58 },
  },
  {
    snapshotId: "20250307233000",
    timestamp: "2025-03-07T23:30:00Z",
    objectId: "pile_stockpile",
    objectType: "pile",
    displayName: "Plant Stockpile",
    dimension: 3,
    massTon: 94,
    qualityValues: { q_num_fe: 0.61 },
  },
  {
    snapshotId: "20250307234500",
    timestamp: "2025-03-07T23:45:00Z",
    objectId: "pile_stockpile",
    objectType: "pile",
    displayName: "Plant Stockpile",
    dimension: 3,
    massTon: 92,
    qualityValues: { q_num_fe: 0.64 },
  },
];

const snapshot: ProfilerSnapshot = {
  objectId: "pile_stockpile",
  displayName: "Plant Stockpile",
  objectType: "pile",
  snapshotId: "20250307234500",
  timestamp: "2025-03-07T23:45:00Z",
  dimension: 3,
  rows: [
    {
      ix: 0,
      iy: 0,
      iz: 0,
      massTon: 20,
      timestampOldestMs: 1741386300000,
      timestampNewestMs: 1741387200000,
      qualityValues: { q_num_fe: 0.55 },
    },
    {
      ix: 1,
      iy: 0,
      iz: 1,
      massTon: 22,
      timestampOldestMs: 1741386360000,
      timestampNewestMs: 1741387260000,
      qualityValues: { q_num_fe: 0.61 },
    },
    {
      ix: 0,
      iy: 1,
      iz: 2,
      massTon: 24,
      timestampOldestMs: 1741386420000,
      timestampNewestMs: 1741387320000,
      qualityValues: { q_num_fe: 0.66 },
    },
  ],
};

describe("buildProfilerExportArtifact", () => {
  it("builds a profiler report with series and snapshot evidence", () => {
    const artifact = buildProfilerExportArtifact({
      rows,
      selectedSummaryRow: rows[2]!,
      detailSnapshot: snapshot,
      selectedStepLabel: "3/3",
      selectedQuality: quality,
      inspectionQuality: quality,
      selectedTimeMode: "property",
      verticalCompressionFactor: 25,
      materialTimeSummary: {
        recordCount: 3,
        totalMassTon: 66,
        oldestTimestampMs: 1741386300000,
        newestTimestampMs: 1741387320000,
        representedSpanMs: 1020000,
        oldestAgeMs: 900000,
        newestAgeMs: 0,
      },
      semanticFrame: {
        source: "Profiler detail snapshot",
        resolution: "Reduced pile summary cells",
        note: "Historical summarized pile content for one object.",
        recordLabel: "summary cells",
        basisLabel: "Cell basis",
        densityLabel: "Historical summary only",
        aggregationLabel: "Reduced pile summary cells",
      },
    });

    expect(artifact.filename).toContain("profiler-report");
    expect(artifact.html).toContain("Plant Stockpile");
    expect(artifact.html).toContain("Tracked quality through time");
    expect(artifact.html).toContain("Selected snapshot comparison");
    expect(artifact.html).toContain("Mass distribution");
    expect(artifact.html).toContain("Vertical compression");
  });
});
