"use client";

import { getQualityColor } from "@/lib/color";
import type { PileCellRecord, QualityDefinition } from "@/types/app-data";

interface PileColumnViewProps {
  cells: PileCellRecord[];
  quality: QualityDefinition | undefined;
}

export function PileColumnView({ cells, quality }: PileColumnViewProps) {
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
  columns: number;
  rows: number;
  xAccessor: (cell: PileCellRecord) => number;
  yAccessor: (cell: PileCellRecord) => number;
}

export function PileHeatmapView({
  cells,
  quality,
  columns,
  rows,
  xAccessor,
  yAccessor,
}: PileHeatmapViewProps) {
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
            ? getQualityColor(quality, quality ? cell.qualityValues[quality.id] : null)
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
