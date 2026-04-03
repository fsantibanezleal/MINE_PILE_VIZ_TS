import { buildMassDistribution } from "@/lib/mass-distribution";
import type {
  BeltSnapshot,
  BeltBlockRecord,
  QualityDefinition,
  QualityValue,
} from "@/types/app-data";

export {
  type CategoricalMassDistributionBin as CategoricalMassHistogramBin,
  type MassDistribution as BeltMassHistogram,
  type NumericalMassDistributionBin as NumericalMassHistogramBin,
} from "@/lib/mass-distribution";

export function buildBeltMassHistogram(
  snapshot: BeltSnapshot,
  quality: QualityDefinition | undefined,
  options?: {
    binCount?: number;
    valueAccessor?: (block: BeltBlockRecord) => QualityValue;
  },
) {
  return buildMassDistribution(snapshot.blocks, quality, options);
}
