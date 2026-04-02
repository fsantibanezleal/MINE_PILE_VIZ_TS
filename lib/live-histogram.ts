import type { BeltSnapshot, QualityDefinition } from "@/types/app-data";

export interface NumericalMassHistogramBin {
  start: number;
  end: number;
  center: number;
  massTon: number;
  blockCount: number;
}

export interface CategoricalMassHistogramBin {
  value: number | null;
  label: string;
  color: string;
  massTon: number;
  blockCount: number;
}

export type BeltMassHistogram =
  | {
      kind: "empty";
      totalMassTon: number;
      representedMassTon: number;
      reason: string;
    }
  | {
      kind: "numerical";
      totalMassTon: number;
      representedMassTon: number;
      weightedMean: number;
      domain: {
        min: number;
        max: number;
      };
      maxBinMassTon: number;
      bins: NumericalMassHistogramBin[];
    }
  | {
      kind: "categorical";
      totalMassTon: number;
      representedMassTon: number;
      maxBinMassTon: number;
      bins: CategoricalMassHistogramBin[];
    };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getDefaultBinCount(blockCount: number) {
  return clamp(Math.ceil(Math.sqrt(blockCount)), 4, 12);
}

export function buildBeltMassHistogram(
  snapshot: BeltSnapshot,
  quality: QualityDefinition | undefined,
  options?: {
    binCount?: number;
  },
): BeltMassHistogram {
  const totalMassTon = snapshot.blocks.reduce((sum, block) => sum + block.massTon, 0);

  if (!quality) {
    return {
      kind: "empty",
      totalMassTon,
      representedMassTon: 0,
      reason: "No property is selected.",
    };
  }

  if (quality.kind === "categorical") {
    const categories = quality.categories ?? [];
    const categoryMap = new Map(
      categories.map((category) => [
        category.value,
        {
          value: category.value,
          label: category.label,
          color: category.color,
          massTon: 0,
          blockCount: 0,
        },
      ]),
    );

    let representedMassTon = 0;

    snapshot.blocks.forEach((block) => {
      const rawValue = block.qualityValues[quality.id];

      if (typeof rawValue !== "number" || Number.isNaN(rawValue)) {
        return;
      }

      representedMassTon += block.massTon;

      const current = categoryMap.get(rawValue) ?? {
        value: rawValue,
        label: `Value ${rawValue}`,
        color: quality.palette[categoryMap.size % Math.max(1, quality.palette.length)] ?? "#7ca4c9",
        massTon: 0,
        blockCount: 0,
      };

      current.massTon += block.massTon;
      current.blockCount += 1;
      categoryMap.set(rawValue, current);
    });

    const bins = Array.from(categoryMap.values()).filter((bin) => bin.massTon > 0);
    const maxBinMassTon = Math.max(0, ...bins.map((bin) => bin.massTon));

    return bins.length > 0
      ? {
          kind: "categorical",
          totalMassTon,
          representedMassTon,
          maxBinMassTon,
          bins,
        }
      : {
          kind: "empty",
          totalMassTon,
          representedMassTon,
          reason: "The selected categorical property has no assigned values on this belt snapshot.",
        };
  }

  const numericBlocks = snapshot.blocks
    .map((block) => ({
      value: block.qualityValues[quality.id],
      massTon: block.massTon,
    }))
    .filter(
      (
        block,
      ): block is {
        value: number;
        massTon: number;
      } => typeof block.value === "number" && Number.isFinite(block.value),
    );

  if (numericBlocks.length === 0) {
    return {
      kind: "empty",
      totalMassTon,
      representedMassTon: 0,
      reason: "The selected numerical property has no valid values on this belt snapshot.",
    };
  }

  const representedMassTon = numericBlocks.reduce((sum, block) => sum + block.massTon, 0);
  const weightedMean =
    numericBlocks.reduce((sum, block) => sum + block.value * block.massTon, 0) /
    Math.max(representedMassTon, 1);
  const min = Math.min(...numericBlocks.map((block) => block.value));
  const max = Math.max(...numericBlocks.map((block) => block.value));

  if (min === max) {
    return {
      kind: "numerical",
      totalMassTon,
      representedMassTon,
      weightedMean,
      domain: { min, max },
      maxBinMassTon: representedMassTon,
      bins: [
        {
          start: min,
          end: max,
          center: min,
          massTon: representedMassTon,
          blockCount: numericBlocks.length,
        },
      ],
    };
  }

  const binCount = options?.binCount ?? getDefaultBinCount(numericBlocks.length);
  const step = (max - min) / binCount;
  const bins: NumericalMassHistogramBin[] = Array.from({ length: binCount }, (_, index) => {
    const start = min + index * step;
    const end = index === binCount - 1 ? max : start + step;

    return {
      start,
      end,
      center: start + (end - start) / 2,
      massTon: 0,
      blockCount: 0,
    };
  });

  numericBlocks.forEach((block) => {
    const rawIndex = Math.floor((block.value - min) / step);
    const index = clamp(rawIndex, 0, bins.length - 1);
    const bin = bins[index];

    if (!bin) {
      return;
    }

    bin.massTon += block.massTon;
    bin.blockCount += 1;
  });

  return {
    kind: "numerical",
    totalMassTon,
    representedMassTon,
    weightedMean,
    domain: { min, max },
    maxBinMassTon: Math.max(0, ...bins.map((bin) => bin.massTon)),
    bins,
  };
}
