import type {
  BeltSnapshot,
  QualityDefinition,
} from "@/types/app-data";
import { buildMassWeightedQualitySummary } from "@/lib/quality-summary";

export interface SimulatorLaneSnapshot {
  snapshot: BeltSnapshot;
  timestamps: string[];
  timestampsAligned: boolean;
}

function dedupeSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function buildSimulatorLaneSnapshot({
  laneId,
  displayName,
  snapshots,
  qualities,
}: {
  laneId: string;
  displayName: string;
  snapshots: BeltSnapshot[];
  qualities: QualityDefinition[];
}): SimulatorLaneSnapshot | null {
  if (snapshots.length === 0) {
    return null;
  }

  const blocks = snapshots.flatMap((snapshot) => snapshot.blocks);
  const timestamps = dedupeSorted(snapshots.map((snapshot) => snapshot.timestamp));
  const normalizedBlocks = blocks.map((block, index) => ({
    ...block,
    position: index,
  }));
  const availableQualityIds = new Set(
    normalizedBlocks.flatMap((block) => Object.keys(block.qualityValues)),
  );
  const relevantQualities = qualities.filter((quality) => availableQualityIds.has(quality.id));
  const qualityAverages = buildMassWeightedQualitySummary(
    normalizedBlocks,
    relevantQualities,
  );

  return {
    snapshot: {
      objectId: `simulator-lane:${laneId}`,
      displayName,
      timestamp: timestamps[timestamps.length - 1] ?? snapshots[0]?.timestamp ?? "",
      totalMassTon: normalizedBlocks.reduce((sum, block) => sum + block.massTon, 0),
      blockCount: normalizedBlocks.length,
      qualityAverages,
      blocks: normalizedBlocks,
    },
    timestamps,
    timestampsAligned: timestamps.length <= 1,
  };
}
