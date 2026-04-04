"use client";

import { formatMassTon, formatPercent, formatNumber } from "@/lib/format";
import { MetricGrid } from "@/components/ui/metric-grid";
import { buildPileStructureSummary } from "@/lib/pile-structure";
import type { PileDataset } from "@/types/app-data";

interface PileStructurePanelProps {
  dataset: Pick<PileDataset, "cells" | "dimension" | "extents" | "occupiedCellCount">;
}

function formatRatioAsPercent(value: number) {
  return formatPercent(value * 100);
}

function formatAxisCenter(
  centers: Array<{
    axis: "x" | "y" | "z";
    ratio: number;
  }>,
) {
  return centers
    .map((center) => `${center.axis.toUpperCase()} ${formatPercent(center.ratio * 100)}`)
    .join(" / ");
}

function getPanelSummary(dimension: PileDataset["dimension"]) {
  if (dimension === 3) {
    return "Read how the current dense voxels occupy the footprint and active elevation bands of the selected pile.";
  }

  if (dimension === 2) {
    return "Read how the current dense cells occupy the pile plane and which rows carry the present mass profile.";
  }

  return "Read how the current dense cells occupy the active pile axis and where the present mass is concentrated.";
}

export function PileStructurePanel({ dataset }: PileStructurePanelProps) {
  const summary = buildPileStructureSummary(dataset);
  const peakBinMass = Math.max(...summary.profileBins.map((bin) => bin.massTon), 0);

  return (
    <div className="pile-structure">
      <div className="section-label">Structure profile</div>
      <p className="muted-text">{getPanelSummary(summary.dimension)}</p>
      <MetricGrid
        metrics={[
          {
            label: "Fill ratio",
            value: formatRatioAsPercent(summary.occupiedRatio),
          },
          {
            label: "Footprint use",
            value: formatRatioAsPercent(summary.footprintCoverageRatio),
          },
          {
            label: summary.primaryAxisLabel,
            value: `${summary.activePrimaryCount}/${summary.primaryAxisSize} active`,
          },
          {
            label: "Mass center",
            value: formatAxisCenter(summary.massCenter),
          },
        ]}
      />
      <div className="pile-structure__axes">
        {summary.axisCoverage.map((axis) => (
          <div key={axis.axis} className="pile-structure__axis-card">
            <span>{axis.axis.toUpperCase()} coverage</span>
            <strong>
              {axis.activeCount}/{axis.size}
            </strong>
            <small>{formatRatioAsPercent(axis.coverageRatio)}</small>
          </div>
        ))}
        <div className="pile-structure__axis-card">
          <span>Primary span</span>
          <strong>{formatNumber(summary.activePrimarySpan)}</strong>
          <small>
            {summary.topActivePrimaryIndex !== null
              ? `Top ${summary.primaryAxis.toUpperCase()} ${summary.topActivePrimaryIndex}`
              : "No active cells"}
          </small>
        </div>
      </div>
      <div className="pile-structure__profile">
        <div className="section-label">Mass by {summary.primaryAxisLabel.toLowerCase()}</div>
        <div className="pile-structure__profile-bars" role="list">
          {summary.profileBins.map((bin) => {
            const widthRatio = peakBinMass > 0 ? bin.massTon / peakBinMass : 0;

            return (
              <div
                key={`${bin.startIndex}-${bin.endIndex}`}
                className="pile-structure__profile-row"
                role="listitem"
              >
                <div className="pile-structure__profile-meta">
                  <strong>{bin.label}</strong>
                  <span>{bin.occupiedCells} cells</span>
                </div>
                <div className="pile-structure__profile-bar-frame">
                  <div
                    className="pile-structure__profile-bar"
                    style={{
                      width: `${Math.max(widthRatio * 100, bin.massTon > 0 ? 4 : 0)}%`,
                    }}
                  />
                </div>
                <div className="pile-structure__profile-values">
                  <strong>{formatMassTon(bin.massTon)}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
