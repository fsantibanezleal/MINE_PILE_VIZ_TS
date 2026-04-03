"use client";

import { MassDistributionChart } from "@/components/ui/mass-distribution-chart";
import { buildBeltMassHistogram } from "@/lib/live-histogram";
import type {
  BeltBlockRecord,
  BeltSnapshot,
  QualityDefinition,
  QualityValue,
} from "@/types/app-data";

interface BeltMassHistogramProps {
  snapshot: BeltSnapshot;
  quality: QualityDefinition | undefined;
  valueAccessor?: (block: BeltBlockRecord) => QualityValue;
}

export function BeltMassHistogram({
  snapshot,
  quality,
  valueAccessor,
}: BeltMassHistogramProps) {
  const histogram = buildBeltMassHistogram(snapshot, quality, {
    valueAccessor,
  });

  return (
    <MassDistributionChart
      distribution={histogram}
      quality={quality}
      subjectLabel={snapshot.displayName}
      recordLabel="blocks"
    />
  );
}
