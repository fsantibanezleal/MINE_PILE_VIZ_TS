"use client";

import { getQualityColor } from "@/lib/color";
import type {
  BeltBlockRecord,
  BeltSnapshot,
  QualityDefinition,
  QualityValue,
} from "@/types/app-data";

interface BeltBlockStripProps {
  snapshot: BeltSnapshot;
  quality: QualityDefinition | undefined;
  valueAccessor?: (block: BeltBlockRecord) => QualityValue;
}

export function BeltBlockStrip({
  snapshot,
  quality,
  valueAccessor,
}: BeltBlockStripProps) {
  return (
    <div className="belt-strip" role="img" aria-label={`${snapshot.displayName} block strip`}>
      {snapshot.blocks.map((block) => {
        const value = valueAccessor
          ? valueAccessor(block)
          : quality
            ? block.qualityValues[quality.id]
            : null;

        return (
          <div
            key={`${snapshot.objectId}-${block.position}`}
            className="belt-strip__block"
            style={{ backgroundColor: getQualityColor(quality, value) }}
            title={`Block ${block.position + 1}`}
          />
        );
      })}
    </div>
  );
}
