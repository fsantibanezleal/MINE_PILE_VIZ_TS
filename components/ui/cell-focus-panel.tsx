"use client";

import { formatMassTon } from "@/lib/format";
import {
  formatQualityValueDisplay,
  getQualityDisplayLabel,
} from "@/lib/quality-display";
import type { PileCellRecord, QualityDefinition } from "@/types/app-data";
import { MetricGrid } from "@/components/ui/metric-grid";
import { QualityValueList } from "@/components/ui/quality-value-list";

interface CellFocusPanelProps {
  hoveredCell: PileCellRecord | null;
  qualities: QualityDefinition[];
  selectedQuality?: QualityDefinition | null;
  title?: string;
  inactiveMessage?: string;
  emptyMessage: string;
  valueListLimit?: number;
}

/**
 * Shared hovered-cell inspector used by pile-centric workspaces so coordinates,
 * mass, and property formatting stay consistent across stockpile, profiler, and
 * simulator views.
 */
export function CellFocusPanel({
  hoveredCell,
  qualities,
  selectedQuality,
  title = "Cell Focus",
  inactiveMessage,
  emptyMessage,
  valueListLimit,
}: CellFocusPanelProps) {
  const visibleQualityCount =
    valueListLimit === undefined ? Math.min(qualities.length, 6) : valueListLimit;

  return (
    <div className="inspector-stack">
      <div className="section-label">{title}</div>
      {inactiveMessage ? (
        <p className="muted-text">{inactiveMessage}</p>
      ) : hoveredCell ? (
        <>
          <MetricGrid
            metrics={[
              {
                label: "Indices",
                value: `${hoveredCell.ix}, ${hoveredCell.iy}, ${hoveredCell.iz}`,
              },
              {
                label: "Mass",
                value: formatMassTon(hoveredCell.massTon),
              },
              {
                label: getQualityDisplayLabel(selectedQuality ?? undefined),
                value: formatQualityValueDisplay(
                  selectedQuality ?? undefined,
                  selectedQuality
                    ? hoveredCell.qualityValues[selectedQuality.id]
                    : undefined,
                ),
              },
            ]}
          />
          <QualityValueList
            qualities={qualities}
            values={hoveredCell.qualityValues}
            limit={visibleQualityCount}
          />
        </>
      ) : (
        <p className="muted-text">{emptyMessage}</p>
      )}
    </div>
  );
}
