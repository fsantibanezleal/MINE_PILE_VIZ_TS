import { buildMassDistribution } from "@/lib/mass-distribution";
import type { ProfilerSummaryRow, QualityDefinition } from "@/types/app-data";

export {
  type CategoricalMassDistributionBin as CategoricalScenarioHistogramBin,
  type MassDistribution as ScenarioMassHistogram,
  type NumericalMassDistributionBin as NumericalScenarioHistogramBin,
} from "@/lib/mass-distribution";

export function buildScenarioMassHistogram(
  rows: ProfilerSummaryRow[],
  quality: QualityDefinition | undefined,
  options?: {
    binCount?: number;
  },
) {
  return buildMassDistribution(rows, quality, options);
}
