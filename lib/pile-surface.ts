import type {
  PileCellRecord,
  QualityDefinition,
  QualityValue,
} from "@/types/app-data";

export type PileSurfaceColorMode = "top-cell" | "column-mass-weighted";

export interface PileSurfaceColumn {
  ix: number;
  iy: number;
  height: number;
  topCell: PileCellRecord;
  topValue: QualityValue;
  columnValue: QualityValue;
  totalMassTon: number;
  cellCount: number;
}

function getColumnKey(cell: PileCellRecord) {
  return `${cell.ix}:${cell.iy}`;
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function aggregateColumnValue(
  cells: PileCellRecord[],
  quality: QualityDefinition | undefined,
  resolveValue: (cell: PileCellRecord) => QualityValue,
) {
  if (!quality) {
    return null;
  }

  if (quality.kind === "categorical") {
    const groupedMass = new Map<string, { value: QualityValue; massTon: number }>();

    for (const cell of cells) {
      const value = resolveValue(cell);

      if ((value === null || value === undefined) || !isPositiveFiniteNumber(cell.massTon)) {
        continue;
      }

      const key = `${typeof value}:${String(value)}`;
      const current = groupedMass.get(key);

      if (current) {
        current.massTon += cell.massTon;
        continue;
      }

      groupedMass.set(key, {
        value,
        massTon: cell.massTon,
      });
    }

    return [...groupedMass.values()].sort((left, right) => right.massTon - left.massTon)[0]
      ?.value ?? null;
  }

  let representedMassTon = 0;
  let weightedSum = 0;

  for (const cell of cells) {
    const value = resolveValue(cell);

    if (!isPositiveFiniteNumber(cell.massTon) || typeof value !== "number" || !Number.isFinite(value)) {
      continue;
    }

    representedMassTon += cell.massTon;
    weightedSum += value * cell.massTon;
  }

  if (representedMassTon <= 0) {
    return null;
  }

  return weightedSum / representedMassTon;
}

export function buildPileSurfaceColumns(
  cells: PileCellRecord[],
  quality: QualityDefinition | undefined,
  valueAccessor?: (cell: PileCellRecord) => QualityValue,
): PileSurfaceColumn[] {
  const resolveValue =
    valueAccessor ??
    ((cell: PileCellRecord) => (quality ? cell.qualityValues[quality.id] : null));
  const groupedColumns = new Map<
    string,
    {
      cells: PileCellRecord[];
      topCell: PileCellRecord;
      totalMassTon: number;
    }
  >();

  for (const cell of cells) {
    const key = getColumnKey(cell);
    const current = groupedColumns.get(key);

    if (!current) {
      groupedColumns.set(key, {
        cells: [cell],
        topCell: cell,
        totalMassTon: isPositiveFiniteNumber(cell.massTon) ? cell.massTon : 0,
      });
      continue;
    }

    current.cells.push(cell);
    current.totalMassTon += isPositiveFiniteNumber(cell.massTon) ? cell.massTon : 0;

    if (cell.iz > current.topCell.iz) {
      current.topCell = cell;
    }
  }

  return [...groupedColumns.values()]
    .map((column) => ({
      ix: column.topCell.ix,
      iy: column.topCell.iy,
      height: column.topCell.iz + 1,
      topCell: column.topCell,
      topValue: resolveValue(column.topCell),
      columnValue: aggregateColumnValue(column.cells, quality, resolveValue),
      totalMassTon: column.totalMassTon,
      cellCount: column.cells.length,
    }))
    .sort((left, right) => {
      if (left.iy !== right.iy) {
        return left.iy - right.iy;
      }

      return left.ix - right.ix;
    });
}

export function getPileSurfaceColumnValue(
  column: PileSurfaceColumn,
  colorMode: PileSurfaceColorMode,
) {
  return colorMode === "top-cell" ? column.topValue : column.columnValue;
}
