import { describe, expect, it } from "vitest";
import { buildSimulatorLaneSnapshot } from "@/lib/simulator-lane";
import type { BeltSnapshot, QualityDefinition } from "@/types/app-data";

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
  {
    id: "q_cat_material_main",
    kind: "categorical",
    label: "Material",
    description: "Dominant material",
    palette: ["#59ddff", "#f4bc63", "#ff7d7d"],
    categories: [
      { value: 1, label: "Oxide", color: "#59ddff" },
      { value: 2, label: "Sulfide", color: "#f4bc63" },
      { value: 3, label: "Mixed", color: "#ff7d7d" },
    ],
  },
];

const snapshots: BeltSnapshot[] = [
  {
    objectId: "belt_a",
    displayName: "Belt A",
    timestamp: "2025-03-19T01:15:00Z",
    totalMassTon: 40,
    blockCount: 2,
    qualityAverages: { q_num_fe: 1.05, q_cat_material_main: 1 },
    blocks: [
      {
        position: 0,
        massTon: 20,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: 1.0, q_cat_material_main: 1 },
      },
      {
        position: 1,
        massTon: 20,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: 1.1, q_cat_material_main: 1 },
      },
    ],
  },
  {
    objectId: "belt_b",
    displayName: "Belt B",
    timestamp: "2025-03-19T01:15:00Z",
    totalMassTon: 60,
    blockCount: 3,
    qualityAverages: { q_num_fe: 1.3, q_cat_material_main: 2 },
    blocks: [
      {
        position: 0,
        massTon: 20,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: 1.2, q_cat_material_main: 2 },
      },
      {
        position: 1,
        massTon: 20,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: 1.3, q_cat_material_main: 2 },
      },
      {
        position: 2,
        massTon: 20,
        timestampOldestMs: 1,
        timestampNewestMs: 2,
        qualityValues: { q_num_fe: 1.4, q_cat_material_main: 2 },
      },
    ],
  },
];

describe("simulator-lane", () => {
  it("aggregates multiple downstream belt snapshots into one lane snapshot", () => {
    const laneSnapshot = buildSimulatorLaneSnapshot({
      laneId: "out-west",
      displayName: "West reclaim",
      snapshots,
      qualities,
    });

    expect(laneSnapshot).not.toBeNull();
    expect(laneSnapshot?.timestampsAligned).toBe(true);
    expect(laneSnapshot?.snapshot.objectId).toBe("simulator-lane:out-west");
    expect(laneSnapshot?.snapshot.displayName).toBe("West reclaim");
    expect(laneSnapshot?.snapshot.totalMassTon).toBe(100);
    expect(laneSnapshot?.snapshot.blockCount).toBe(5);
    expect(laneSnapshot?.snapshot.blocks.map((block) => block.position)).toEqual([
      0,
      1,
      2,
      3,
      4,
    ]);
    expect(laneSnapshot?.snapshot.qualityAverages.q_num_fe).toBeCloseTo(1.2, 6);
    expect(laneSnapshot?.snapshot.qualityAverages.q_cat_material_main).toBe(2);
  });

  it("flags mixed timestamps across downstream belts", () => {
    const mixedSnapshots = [
      snapshots[0]!,
      {
        ...snapshots[1]!,
        timestamp: "2025-03-19T01:16:00Z",
      },
    ];

    const laneSnapshot = buildSimulatorLaneSnapshot({
      laneId: "out-east",
      displayName: "East reclaim",
      snapshots: mixedSnapshots,
      qualities,
    });

    expect(laneSnapshot?.timestampsAligned).toBe(false);
    expect(laneSnapshot?.timestamps).toEqual([
      "2025-03-19T01:15:00Z",
      "2025-03-19T01:16:00Z",
    ]);
    expect(laneSnapshot?.snapshot.timestamp).toBe("2025-03-19T01:16:00Z");
  });
});
