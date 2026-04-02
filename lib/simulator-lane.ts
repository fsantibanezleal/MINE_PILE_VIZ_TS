import type {
  BeltBlockRecord,
  BeltSnapshot,
  QualityDefinition,
  QualityValueMap,
} from "@/types/app-data";
import { getQualityValueKey } from "@/lib/quality-values";

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
          const value = block.qualityValues[quality.id];
          return sum + (typeof value === "number" ? value : 0) * block.massTon;
        }, 0) / Math.max(representedMassTon, 1);
      return;
    }

    const groupedMass = new Map<string, { value: QualityValueMap[string]; massTon: number }>();

    blocks.forEach((block) => {
      const value = block.qualityValues[quality.id];

      if ((value === null || value === undefined) || block.massTon <= 0) {
        return;
      }

      const key = getQualityValueKey(value);

      if (!key) {
        return;
      }

      const current = groupedMass.get(key);

      if (current) {
        current.massTon += block.massTon;
        return;
      }

      groupedMass.set(key, {
        value,
        massTon: block.massTon,
      });
    });

    const dominant = [...groupedMass.values()].sort((left, right) => right.massTon - left.massTon)[0];
    qualityValues[quality.id] = dominant?.value ?? null;
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
