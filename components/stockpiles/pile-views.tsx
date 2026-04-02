"use client";

import { getQualityColor, type NumericColorDomain } from "@/lib/color";
import type { PileCellRecord, QualityDefinition } from "@/types/app-data";

interface PileColumnViewProps {
  cells: PileCellRecord[];
  quality: QualityDefinition | undefined;
  numericDomain?: NumericColorDomain;
}

export function PileColumnView({
  cells,
  quality,
  numericDomain,
}: PileColumnViewProps) {
  if (cells.length === 0) {
    return (
      <div className="empty-visual">
        <p>No occupied cells are available for this object at the current snapshot.</p>
      </div>
    );
  }

  const ordered = [...cells].sort((left, right) => left.iz - right.iz);

  return (
    <div className="pile-column">
      {ordered.map((cell) => (
        <div
          key={`${cell.ix}-${cell.iy}-${cell.iz}`}
          className="pile-column__cell"
          style={{
            backgroundColor: getQualityColor(
              quality,
              quality ? cell.qualityValues[quality.id] : null,
              numericDomain,
            ),
          }}
        />
      ))}
    </div>
  );
}

interface PileHeatmapViewProps {
  cells: PileCellRecord[];
  quality: QualityDefinition | undefined;
  numericDomain?: NumericColorDomain;
  columns: number;
  rows: number;
  xAccessor: (cell: PileCellRecord) => number;
  yAccessor: (cell: PileCellRecord) => number;
}

export function PileHeatmapView({
  cells,
  quality,
  numericDomain,
  columns,
  rows,
  xAccessor,
  yAccessor,
}: PileHeatmapViewProps) {
  if (cells.length === 0 || columns <= 0 || rows <= 0) {
    return (
      <div className="empty-visual">
        <p>No occupied cells are available for this view.</p>
      </div>
    );
  }

  const cellMap = new Map<string, PileCellRecord>();

  cells.forEach((cell) => {
    const key = `${xAccessor(cell)}:${yAccessor(cell)}`;
    const existing = cellMap.get(key);

    if (!existing || existing.iz < cell.iz) {
      cellMap.set(key, cell);
    }
  });

  const gridCells = Array.from({ length: rows * columns }, (_, index) => {
    const x = index % columns;
    const y = rows - 1 - Math.floor(index / columns);
    const cell = cellMap.get(`${x}:${y}`);

    return (
      <div
        key={`${x}-${y}`}
        className="heatmap__cell"
        style={{
          backgroundColor: cell
            ? getQualityColor(
                quality,
                quality ? cell.qualityValues[quality.id] : null,
                numericDomain,
              )
            : "rgba(11, 22, 37, 0.85)",
          borderColor: cell ? "rgba(124, 164, 201, 0.14)" : "rgba(124, 164, 201, 0.08)",
        }}
      />
    );
  });

  return (
    <div
      className="heatmap"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(6px, 1fr))` }}
    >
      {gridCells}
    </div>
  );
}
