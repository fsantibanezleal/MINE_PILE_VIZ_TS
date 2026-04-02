import type { PileCellRecord } from "@/types/app-data";

interface AdaptiveFullRenderPlanInput {
  cells: PileCellRecord[];
  surfaceCells: PileCellRecord[];
  threshold: number;
  suggestedStride: number;
}

export interface AdaptiveFullRenderPlan {
  cells: PileCellRecord[];
  strategy: "native" | "adaptive";
  stride: number;
  renderedCellCount: number;
  coverageRatio: number;
  surfaceContribution: number;
  baseContribution: number;
  sampledContribution: number;
}

function getCellKey(cell: PileCellRecord) {
  return `${cell.ix}:${cell.iy}:${cell.iz}`;
}

function sortCells(cells: PileCellRecord[]) {
  return [...cells].sort((left, right) => {
    if (left.iz !== right.iz) {
      return left.iz - right.iz;
    }

    if (left.iy !== right.iy) {
      return left.iy - right.iy;
    }

    return left.ix - right.ix;
  });
}

export function deriveSurfaceCells(cells: PileCellRecord[]) {
  const surfaceByColumn = new Map<string, PileCellRecord>();

  cells.forEach((cell) => {
    const key = `${cell.ix}:${cell.iy}`;
    const current = surfaceByColumn.get(key);

    if (!current || cell.iz > current.iz) {
      surfaceByColumn.set(key, cell);
    }
  });

  return sortCells(Array.from(surfaceByColumn.values()));
}

export function deriveBaseCells(cells: PileCellRecord[]) {
  const baseByColumn = new Map<string, PileCellRecord>();

  cells.forEach((cell) => {
    const key = `${cell.ix}:${cell.iy}`;
    const current = baseByColumn.get(key);

    if (!current || cell.iz < current.iz) {
      baseByColumn.set(key, cell);
    }
  });

  return sortCells(Array.from(baseByColumn.values()));
}

export function deriveShellCells(cells: PileCellRecord[]) {
  const occupied = new Set(cells.map((cell) => getCellKey(cell)));
  const shellCells = cells.filter((cell) => {
    const neighbors = [
      `${cell.ix - 1}:${cell.iy}:${cell.iz}`,
      `${cell.ix + 1}:${cell.iy}:${cell.iz}`,
      `${cell.ix}:${cell.iy - 1}:${cell.iz}`,
      `${cell.ix}:${cell.iy + 1}:${cell.iz}`,
      `${cell.ix}:${cell.iy}:${cell.iz - 1}`,
      `${cell.ix}:${cell.iy}:${cell.iz + 1}`,
    ];

    return neighbors.some((neighborKey) => !occupied.has(neighborKey));
  });

  return sortCells(shellCells);
}

function sampleCellsByStride(cells: PileCellRecord[], stride: number) {
  if (stride <= 1) {
    return cells;
  }

  return cells.filter(
    (cell) =>
      cell.ix % stride === 0 && cell.iy % stride === 0 && cell.iz % stride === 0,
  );
}

function buildAdaptiveSet(
  surfaceCells: PileCellRecord[],
  baseCells: PileCellRecord[],
  sampledCells: PileCellRecord[],
) {
  const cellMap = new Map<
    string,
    { cell: PileCellRecord; tags: Set<"surface" | "base" | "sample"> }
  >();

  const addCells = (
    cells: PileCellRecord[],
    tag: "surface" | "base" | "sample",
  ) => {
    cells.forEach((cell) => {
      const key = getCellKey(cell);
      const existing = cellMap.get(key);

      if (existing) {
        existing.tags.add(tag);
        return;
      }

      cellMap.set(key, {
        cell,
        tags: new Set([tag]),
      });
    });
  };

  addCells(surfaceCells, "surface");
  addCells(baseCells, "base");
  addCells(sampledCells, "sample");

  const rows = Array.from(cellMap.values());

  return {
    cells: sortCells(rows.map((entry) => entry.cell)),
    surfaceContribution: rows.filter((entry) => entry.tags.has("surface")).length,
    baseContribution: rows.filter((entry) => entry.tags.has("base")).length,
    sampledContribution: rows.filter((entry) => entry.tags.has("sample")).length,
  };
}

export function buildAdaptiveFullRenderPlan({
  cells,
  surfaceCells,
  threshold,
  suggestedStride,
}: AdaptiveFullRenderPlanInput): AdaptiveFullRenderPlan {
  if (cells.length === 0) {
    return {
      cells: [],
      strategy: "native",
      stride: 1,
      renderedCellCount: 0,
      coverageRatio: 0,
      surfaceContribution: 0,
      baseContribution: 0,
      sampledContribution: 0,
    };
  }

  const safeThreshold = Math.max(1, threshold);

  if (cells.length <= safeThreshold) {
    return {
      cells,
      strategy: "native",
      stride: 1,
      renderedCellCount: cells.length,
      coverageRatio: 1,
      surfaceContribution: surfaceCells.length,
      baseContribution: 0,
      sampledContribution: cells.length,
    };
  }

  const effectiveSurfaceCells =
    surfaceCells.length > 0 ? surfaceCells : deriveSurfaceCells(cells);
  const baseCells = deriveBaseCells(cells);
  let stride = Math.max(
    1,
    suggestedStride,
    Math.ceil(Math.cbrt(cells.length / safeThreshold)),
  );

  let plan = buildAdaptiveSet(
    effectiveSurfaceCells,
    baseCells,
    sampleCellsByStride(cells, stride),
  );

  while (plan.cells.length > safeThreshold * 1.1 && stride < 12) {
    stride += 1;
    plan = buildAdaptiveSet(
      effectiveSurfaceCells,
      baseCells,
      sampleCellsByStride(cells, stride),
    );
  }

  return {
    cells: plan.cells,
    strategy: "adaptive",
    stride,
    renderedCellCount: plan.cells.length,
    coverageRatio: plan.cells.length / cells.length,
    surfaceContribution: plan.surfaceContribution,
    baseContribution: plan.baseContribution,
    sampledContribution: plan.sampledContribution,
  };
}
