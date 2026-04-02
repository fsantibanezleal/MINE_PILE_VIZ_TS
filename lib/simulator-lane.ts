import type {
  BeltBlockRecord,
  BeltSnapshot,
  QualityDefinition,
  QualityValueMap,
} from "@/types/app-data";

export interface SimulatorLaneSnapshot {
  snapshot: BeltSnapshot;
  timestamps: string[];
  timestampsAligned: boolean;
}

function dedupeSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function buildQualityAverages(
  blocks: BeltBlockRecord[],
  qualities: QualityDefinition[],
): QualityValueMap {
  const qualityValues: QualityValueMap = {};

  qualities.forEach((quality) => {
    if (quality.kind === "numerical") {
      const validBlocks = blocks.filter((block) => {
        const value = block.qualityValues[quality.id];
        return typeof value === "number" && Number.isFinite(value) && block.massTon > 0;
      });

      if (validBlocks.length === 0) {
        qualityValues[quality.id] = null;
        return;
      }

      const representedMassTon = validBlocks.reduce((sum, block) => sum + block.massTon, 0);
      qualityValues[quality.id] =
        validBlocks.reduce((sum, block) => {
          return sum + (block.qualityValues[quality.id] ?? 0) * block.massTon;
        }, 0) / Math.max(representedMassTon, 1);
      return;
    }

    const groupedMass = new Map<number, number>();

    blocks.forEach((block) => {
      const value = block.qualityValues[quality.id];

      if (typeof value !== "number" || !Number.isFinite(value) || block.massTon <= 0) {
        return;
      }

      groupedMass.set(value, (groupedMass.get(value) ?? 0) + block.massTon);
    });

    const dominant = [...groupedMass.entries()].sort((left, right) => right[1] - left[1])[0];
    qualityValues[quality.id] = dominant?.[0] ?? null;
  });

  return qualityValues;
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
  const qualityAverages = buildQualityAverages(normalizedBlocks, relevantQualities);

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
