import { buildMassWeightedQualitySummary } from "@/lib/quality-summary";
import type {
  BeltBlockRecord,
  BeltSnapshot,
  PileCellRecord,
  ProfilerSnapshot,
  QualityDefinition,
} from "@/types/app-data";

export type SimulatorBeltSnapshotSource = "profiler-snapshot";

type BeltAxis = "ix" | "iy" | "iz";

function getDistinctCount(values: number[]) {
  return new Set(values.filter((value) => Number.isFinite(value))).size;
}

function resolveProfilerBeltAxis(rows: PileCellRecord[]): BeltAxis | null {
  const axisCounts = (["ix", "iy", "iz"] as BeltAxis[]).map((axis) => ({
    axis,
    distinctCount: getDistinctCount(rows.map((row) => row[axis])),
  }));
  const bestAxis = axisCounts.sort(
    (left, right) => right.distinctCount - left.distinctCount,
  )[0];

  return bestAxis && bestAxis.distinctCount > 1 ? bestAxis.axis : null;
}

function mapProfilerRowsToBeltBlocks(rows: PileCellRecord[]): BeltBlockRecord[] {
  const axis = resolveProfilerBeltAxis(rows);
  const sortedBlocks = rows
    .map((row, index) => ({
      position: axis ? row[axis] : index,
      massTon: row.massTon,
      timestampOldestMs: row.timestampOldestMs,
      timestampNewestMs: row.timestampNewestMs,
      qualityValues: row.qualityValues,
      sourceIndex: index,
    }))
    .sort(
      (left, right) =>
        left.position - right.position || left.sourceIndex - right.sourceIndex,
    );

  return sortedBlocks.map((block) => ({
    position: block.position,
    massTon: block.massTon,
    timestampOldestMs: block.timestampOldestMs,
    timestampNewestMs: block.timestampNewestMs,
    qualityValues: block.qualityValues,
  }));
}

export function normalizeProfilerBeltSnapshot(
  snapshot: ProfilerSnapshot,
  qualities: QualityDefinition[],
): BeltSnapshot {
  const blocks = mapProfilerRowsToBeltBlocks(snapshot.rows);
  const availableQualityIds = new Set(
    blocks.flatMap((block) => Object.keys(block.qualityValues)),
  );
  const relevantQualities = qualities.filter((quality) =>
    availableQualityIds.has(quality.id),
  );

  return {
    objectId: snapshot.objectId,
    displayName: snapshot.displayName,
    timestamp: snapshot.timestamp,
    totalMassTon: blocks.reduce((sum, block) => sum + block.massTon, 0),
    blockCount: blocks.length,
    qualityAverages: buildMassWeightedQualitySummary(blocks, relevantQualities),
    blocks,
  };
}
