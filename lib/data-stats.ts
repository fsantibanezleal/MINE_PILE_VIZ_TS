interface IndexedCellLike {
  ix: number;
  iy: number;
  iz: number;
}

export function deriveCellExtents(rows: Iterable<IndexedCellLike>) {
  let maxX = 0;
  let maxY = 0;
  let maxZ = 0;
  let hasRows = false;

  for (const row of rows) {
    hasRows = true;
    maxX = Math.max(maxX, row.ix);
    maxY = Math.max(maxY, row.iy);
    maxZ = Math.max(maxZ, row.iz);
  }

  if (!hasRows) {
    return { x: 1, y: 1, z: 1 };
  }

  return {
    x: maxX + 1,
    y: maxY + 1,
    z: maxZ + 1,
  };
}

export function deriveNumericExtrema<T>(
  items: Iterable<T>,
  selector: (item: T) => number,
) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let hasValue = false;

  for (const item of items) {
    const value = selector(item);

    if (!Number.isFinite(value)) {
      continue;
    }

    hasValue = true;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  return hasValue ? { min, max } : null;
}
