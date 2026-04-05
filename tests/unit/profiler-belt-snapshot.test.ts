import { describe, expect, it } from "vitest";
import { normalizeProfilerBeltSnapshot } from "@/lib/profiler-belt-snapshot";
import type { ProfilerSnapshot, QualityDefinition } from "@/types/app-data";

const qualities: QualityDefinition[] = [
  {
    id: "q_num_fe",
    kind: "numerical",
    label: "Fe",
    description: "Iron grade",
    min: 0,
    max: 2,
    palette: ["#123456", "#abcdef"],
  },
];

describe("normalizeProfilerBeltSnapshot", () => {
  it("turns profiler belt rows into an ordered belt snapshot using the varying axis", () => {
    const snapshot: ProfilerSnapshot = {
      objectId: "belt_cv301",
      displayName: "CV301",
      objectType: "belt",
      snapshotId: "20250319001500",
      timestamp: "2025-03-19T00:15:00Z",
      dimension: 1,
      rows: [
        {
          ix: 2,
          iy: 0,
          iz: 0,
          massTon: 15,
          timestampOldestMs: 1742342400000,
          timestampNewestMs: 1742343300000,
          qualityValues: { q_num_fe: 1.4 },
        },
        {
          ix: 0,
          iy: 0,
          iz: 0,
          massTon: 12,
          timestampOldestMs: 1742342400000,
          timestampNewestMs: 1742343300000,
          qualityValues: { q_num_fe: 1.1 },
        },
        {
          ix: 1,
          iy: 0,
          iz: 0,
          massTon: 18,
          timestampOldestMs: 1742342400000,
          timestampNewestMs: 1742343300000,
          qualityValues: { q_num_fe: 1.25 },
        },
      ],
    };

    const normalized = normalizeProfilerBeltSnapshot(snapshot, qualities);

    expect(normalized.objectId).toBe("belt_cv301");
    expect(normalized.timestamp).toBe("2025-03-19T00:15:00Z");
    expect(normalized.totalMassTon).toBe(45);
    expect(normalized.blockCount).toBe(3);
    expect(normalized.blocks.map((block) => block.position)).toEqual([0, 1, 2]);
    expect(normalized.blocks.map((block) => block.massTon)).toEqual([12, 18, 15]);
    expect(normalized.qualityAverages.q_num_fe).toBeCloseTo(
      (12 * 1.1 + 18 * 1.25 + 15 * 1.4) / 45,
    );
  });
});
