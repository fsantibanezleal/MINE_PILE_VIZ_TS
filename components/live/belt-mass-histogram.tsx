"use client";

import { MassDistributionChart } from "@/components/ui/mass-distribution-chart";
import { buildBeltMassHistogram } from "@/lib/live-histogram";
import type { BeltSnapshot, QualityDefinition } from "@/types/app-data";

interface BeltMassHistogramProps {
  snapshot: BeltSnapshot;
  quality: QualityDefinition | undefined;
}

export function BeltMassHistogram({
  snapshot,
  quality,
}: BeltMassHistogramProps) {
  const histogram = buildBeltMassHistogram(snapshot, quality);

  return (
    <MassDistributionChart
      distribution={histogram}
      quality={quality}
      subjectLabel={snapshot.displayName}
      recordLabel="blocks"
    />
  );
}
