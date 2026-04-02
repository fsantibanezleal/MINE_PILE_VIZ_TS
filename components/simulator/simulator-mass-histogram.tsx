"use client";

import { MassDistributionChart } from "@/components/ui/mass-distribution-chart";
import { buildScenarioMassHistogram } from "@/lib/simulator-histogram";
import type { ProfilerSummaryRow, QualityDefinition } from "@/types/app-data";

interface SimulatorMassHistogramProps {
  rows: ProfilerSummaryRow[];
  quality: QualityDefinition | undefined;
  binCount: number;
}

export function SimulatorMassHistogram({
  rows,
  quality,
  binCount,
}: SimulatorMassHistogramProps) {
  const histogram = buildScenarioMassHistogram(rows, quality, { binCount });

  return (
    <MassDistributionChart
      distribution={histogram}
      quality={quality}
      subjectLabel="Scenario step"
      recordLabel="objects"
    />
  );
}
