import type { PileCellRecord, PileDataset } from "@/types/app-data";

type AxisKey = "x" | "y" | "z";

interface AxisCoverage {
  axis: AxisKey;
  size: number;
  activeCount: number;
  coverageRatio: number;
}

interface AxisCenter {
  axis: AxisKey;
  ratio: number;
}

interface StructureProfileBin {
  startIndex: number;
  endIndex: number;
  label: string;
  massTon: number;
  occupiedCells: number;
}

export interface PileStructureSummary {
  dimension: PileDataset["dimension"];
  totalSlots: number;
  occupiedRatio: number;
  primaryAxis: AxisKey;
  primaryAxisLabel: string;
  primaryAxisSize: number;
  activePrimaryCount: number;
  activePrimarySpan: number;
  topActivePrimaryIndex: number | null;
  footprintCoverageRatio: number;
  axisCoverage: AxisCoverage[];
  massCenter: AxisCenter[];
  profileBins: StructureProfileBin[];
}

const MAX_PROFILE_BINS = 12;

function getAxisLabel(axis: AxisKey, dimension: PileDataset["dimension"]) {
  if (dimension === 3 && axis === "z") {
    return "Elevation";
  }

  if (dimension === 2 && axis === "y") {
    return "Row";
  }

  return `${axis.toUpperCase()} axis`;
}

function getPrimaryAxis(dimension: PileDataset["dimension"]): AxisKey {
  if (dimension === 3) {
    return "z";
  }

  if (dimension === 2) {
    return "y";
  }

  return "x";
}

function getAxisIndex(cell: PileCellRecord, axis: AxisKey) {
  if (axis === "x") {
    return cell.ix;
  }

  if (axis === "y") {
    return cell.iy;
  }

  return cell.iz;
}

function getUniqueIndexCount(cells: PileCellRecord[], axis: AxisKey) {
  return new Set(cells.map((cell) => getAxisIndex(cell, axis))).size;
}

function buildProfileBins(
  cells: PileCellRecord[],
  axis: AxisKey,
  axisSize: number,
): StructureProfileBin[] {
  if (axisSize <= 0) {
    return [];
  }

  const rawMassByIndex = new Array<number>(axisSize).fill(0);
  const rawCountByIndex = new Array<number>(axisSize).fill(0);

  for (const cell of cells) {
    const axisIndex = getAxisIndex(cell, axis);
    rawMassByIndex[axisIndex] += cell.massTon;
    rawCountByIndex[axisIndex] += 1;
  }

  const binCount = Math.min(MAX_PROFILE_BINS, axisSize);
  const binSize = Math.ceil(axisSize / binCount);
  const bins: StructureProfileBin[] = [];

  for (let binIndex = 0; binIndex < binCount; binIndex += 1) {
    const startIndex = binIndex * binSize;
    const endIndex = Math.min(axisSize - 1, startIndex + binSize - 1);

    if (startIndex > endIndex) {
      continue;
    }

    let massTon = 0;
    let occupiedCells = 0;

    for (let index = startIndex; index <= endIndex; index += 1) {
      massTon += rawMassByIndex[index] ?? 0;
      occupiedCells += rawCountByIndex[index] ?? 0;
    }

    bins.push({
      startIndex,
      endIndex,
      label: startIndex === endIndex ? String(startIndex) : `${startIndex}-${endIndex}`,
      massTon,
      occupiedCells,
    });
  }

  return bins;
}

/**
 * Builds an operator-facing structural summary for the stockpile route.
 * It focuses on occupancy, spread, footprint use, and coarse mass profile
 * instead of raw rendering details.
 */
export function buildPileStructureSummary(dataset: Pick<
  PileDataset,
  "cells" | "dimension" | "extents"
>): PileStructureSummary {
  const { cells, dimension, extents } = dataset;
  const totalSlots = Math.max(1, extents.x * extents.y * extents.z);
  const occupiedRatio = cells.length / totalSlots;
  const primaryAxis = getPrimaryAxis(dimension);
  const primaryAxisSize = extents[primaryAxis];
  const axisCoverage: AxisCoverage[] = (["x", "y", "z"] as AxisKey[])
    .filter((axis) =>
      dimension === 1 ? axis === "x" : dimension === 2 ? axis !== "z" : true,
    )
    .map((axis) => {
      const size = extents[axis];
      const activeCount = getUniqueIndexCount(cells, axis);

      return {
        axis,
        size,
        activeCount,
        coverageRatio: size > 0 ? activeCount / size : 0,
      };
    });

  const activePrimaryIndices = Array.from(
    new Set(cells.map((cell) => getAxisIndex(cell, primaryAxis))),
  ).sort((left, right) => left - right);
  const activePrimaryCount = activePrimaryIndices.length;
  const topActivePrimaryIndex =
    activePrimaryIndices.length > 0
      ? activePrimaryIndices[activePrimaryIndices.length - 1]!
      : null;
  const activePrimarySpan =
    activePrimaryIndices.length > 0
      ? activePrimaryIndices[activePrimaryIndices.length - 1]! -
        activePrimaryIndices[0]! +
        1
      : 0;

  const totalMass = cells.reduce((sum, cell) => sum + cell.massTon, 0);
  const massCenter = axisCoverage.map(({ axis, size }) => {
    const weightedPosition = cells.reduce(
      (sum, cell) => sum + (getAxisIndex(cell, axis) + 0.5) * cell.massTon,
      0,
    );

    return {
      axis,
      ratio:
        totalMass > 0 && size > 0 ? weightedPosition / totalMass / size : 0,
    };
  });

  const footprintCoverageRatio =
    dimension === 3
      ? (() => {
          const uniqueFootprintCells = new Set(
            cells.map((cell) => `${cell.ix}:${cell.iy}`),
          ).size;

          return extents.x * extents.y > 0
            ? uniqueFootprintCells / (extents.x * extents.y)
            : 0;
        })()
      : axisCoverage[0]?.coverageRatio ?? 0;

  return {
    dimension,
    totalSlots,
    occupiedRatio,
    primaryAxis,
    primaryAxisLabel: getAxisLabel(primaryAxis, dimension),
    primaryAxisSize,
    activePrimaryCount,
    activePrimarySpan,
    topActivePrimaryIndex,
    footprintCoverageRatio,
    axisCoverage,
    massCenter,
    profileBins: buildProfileBins(cells, primaryAxis, primaryAxisSize),
  };
}
