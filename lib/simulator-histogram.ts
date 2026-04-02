import type { ProfilerSummaryRow, QualityDefinition } from "@/types/app-data";

export interface NumericalScenarioHistogramBin {
  start: number;
  end: number;
  center: number;
  massTon: number;
  objectCount: number;
}

export interface CategoricalScenarioHistogramBin {
  value: number | null;
  label: string;
  color: string;
  massTon: number;
  objectCount: number;
}

export type ScenarioMassHistogram =
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
      bins: NumericalScenarioHistogramBin[];
    }
  | {
      kind: "categorical";
      totalMassTon: number;
      representedMassTon: number;
      maxBinMassTon: number;
      bins: CategoricalScenarioHistogramBin[];
    };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getDefaultBinCount(objectCount: number) {
  return clamp(Math.ceil(Math.sqrt(objectCount)), 4, 12);
}

export function buildScenarioMassHistogram(
  rows: ProfilerSummaryRow[],
  quality: QualityDefinition | undefined,
  options?: {
    binCount?: number;
  },
): ScenarioMassHistogram {
  const totalMassTon = rows.reduce((sum, row) => sum + row.massTon, 0);

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
          objectCount: 0,
        },
      ]),
    );

    let representedMassTon = 0;

    rows.forEach((row) => {
      const rawValue = row.qualityValues[quality.id];

      if (typeof rawValue !== "number" || Number.isNaN(rawValue)) {
        return;
      }

      representedMassTon += row.massTon;

      const current = categoryMap.get(rawValue) ?? {
        value: rawValue,
        label: `Value ${rawValue}`,
        color:
          quality.palette[categoryMap.size % Math.max(1, quality.palette.length)] ??
          "#7ca4c9",
        massTon: 0,
        objectCount: 0,
      };

      current.massTon += row.massTon;
      current.objectCount += 1;
      categoryMap.set(rawValue, current);
    });

    const bins = Array.from(categoryMap.values()).filter((bin) => bin.massTon > 0);

    return bins.length > 0
      ? {
          kind: "categorical",
          totalMassTon,
          representedMassTon,
          maxBinMassTon: Math.max(0, ...bins.map((bin) => bin.massTon)),
          bins,
        }
      : {
          kind: "empty",
          totalMassTon,
          representedMassTon,
          reason: "The selected categorical property has no assigned values in this scenario step.",
        };
  }

  const numericRows = rows
    .map((row) => ({
      value: row.qualityValues[quality.id],
      massTon: row.massTon,
    }))
    .filter(
      (
        row,
      ): row is {
        value: number;
        massTon: number;
      } => typeof row.value === "number" && Number.isFinite(row.value),
    );

  if (numericRows.length === 0) {
    return {
      kind: "empty",
      totalMassTon,
      representedMassTon: 0,
      reason: "The selected numerical property has no valid values in this scenario step.",
    };
  }

  const representedMassTon = numericRows.reduce((sum, row) => sum + row.massTon, 0);
  const weightedMean =
    numericRows.reduce((sum, row) => sum + row.value * row.massTon, 0) /
    Math.max(representedMassTon, 1);
  const min = Math.min(...numericRows.map((row) => row.value));
  const max = Math.max(...numericRows.map((row) => row.value));

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
          objectCount: numericRows.length,
        },
      ],
    };
  }

  const binCount = options?.binCount ?? getDefaultBinCount(numericRows.length);
  const step = (max - min) / binCount;
  const bins: NumericalScenarioHistogramBin[] = Array.from(
    { length: binCount },
    (_, index) => {
      const start = min + index * step;
      const end = index === binCount - 1 ? max : start + step;

      return {
        start,
        end,
        center: start + (end - start) / 2,
        massTon: 0,
        objectCount: 0,
      };
    },
  );

  numericRows.forEach((row) => {
    const rawIndex = Math.floor((row.value - min) / step);
    const index = clamp(rawIndex, 0, bins.length - 1);
    const bin = bins[index];

    if (!bin) {
      return;
    }

    bin.massTon += row.massTon;
    bin.objectCount += 1;
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
