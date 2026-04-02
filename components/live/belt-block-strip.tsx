"use client";

import { getQualityColor } from "@/lib/color";
import type { BeltSnapshot, QualityDefinition } from "@/types/app-data";

interface BeltBlockStripProps {
  snapshot: BeltSnapshot;
  quality: QualityDefinition | undefined;
}

export function BeltBlockStrip({ snapshot, quality }: BeltBlockStripProps) {
  return (
    <div className="belt-strip" role="img" aria-label={`${snapshot.displayName} block strip`}>
      {snapshot.blocks.map((block) => {
        const value = quality ? block.qualityValues[quality.id] : null;

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
