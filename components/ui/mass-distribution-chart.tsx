"use client";

import { getQualityColor } from "@/lib/color";
import { formatMassTon, formatNumber, formatPercent } from "@/lib/format";
import {
  getQualityDisplayLabel,
  humanizeQualityId,
} from "@/lib/quality-display";
import type { MassDistribution } from "@/lib/mass-distribution";
import type { QualityDefinition } from "@/types/app-data";

interface MassDistributionChartProps {
  distribution: MassDistribution;
  quality: QualityDefinition | undefined;
  subjectLabel: string;
  recordLabel: string;
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="belt-histogram__summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildConicGradient(
  stops: Array<{
    color: string;
    ratio: number;
  }>,
) {
  let cursor = 0;

  return stops
    .map((stop) => {
      const start = cursor * 100;
      cursor += stop.ratio;
      const end = cursor * 100;
      return `${stop.color} ${start}% ${end}%`;
    })
    .join(", ");
}

export function MassDistributionChart({
  distribution,
  quality,
  subjectLabel,
  recordLabel,
}: MassDistributionChartProps) {
  const qualityLabel = getQualityDisplayLabel(
    quality,
    quality ? undefined : humanizeQualityId("property"),
  );

  if (distribution.kind === "empty") {
    return (
      <div className="belt-histogram belt-histogram--empty">
        <p>{distribution.reason}</p>
      </div>
    );
  }

  if (distribution.kind === "categorical") {
    const gradient = buildConicGradient(
      distribution.bins.map((bin) => ({
        color: bin.color,
        ratio: bin.ratio,
      })),
    );

    return (
      <div
        className="belt-histogram"
        role="img"
        aria-label={`${subjectLabel} qualitative mass distribution for ${qualityLabel}`}
      >
        <div className="belt-histogram__summary">
          <SummaryItem label="Mode" value="Qualitative" />
          <SummaryItem
            label="Represented mass"
            value={formatMassTon(distribution.representedMassTon)}
          />
          <SummaryItem label="Dominant" value={distribution.dominantLabel} />
          <SummaryItem
            label="Top share"
            value={formatPercent(distribution.dominantRatio * 100)}
          />
        </div>
        <p className="quality-list__subtext">
          Mass proportions by category for {qualityLabel}. Each slice aggregates the
          represented mass assigned to one mapped category.
        </p>
        <div className="belt-histogram__pie-layout">
          <div className="belt-histogram__pie-card">
            <div
              className="belt-histogram__pie"
              style={{
                background: `conic-gradient(${gradient})`,
              }}
            >
              <div className="belt-histogram__pie-center">
                <strong>{qualityLabel}</strong>
                <span>{formatMassTon(distribution.representedMassTon)}</span>
              </div>
            </div>
          </div>
          <div className="quality-list">
            {distribution.bins.map((bin) => (
              <div
                key={`${quality?.id ?? "quality"}-${bin.label}`}
                className="profiled-properties__distribution-row"
                title={`${bin.label}: ${formatMassTon(bin.massTon)} across ${bin.recordCount} ${recordLabel}`}
              >
                <div className="profiled-properties__distribution-meta">
                  <div className="quality-list__meta quality-list__meta--stacked">
                    <span className="quality-list__meta">
                      <i
                        className="quality-dot"
                        style={{ backgroundColor: bin.color }}
                      />
                      {bin.label}
                    </span>
                    <span className="quality-list__subtext">
                      {formatMassTon(bin.massTon)} across {bin.recordCount} {recordLabel}
                    </span>
                  </div>
                  <div className="profiled-properties__distribution-bar-frame">
                    <div
                      className="profiled-properties__distribution-bar"
                      style={{
                        width: `${Math.max(bin.ratio * 100, 1)}%`,
                        backgroundColor: bin.color,
                      }}
                    />
                  </div>
                </div>
                <div className="profiled-properties__distribution-values">
                  <strong>{formatPercent(bin.ratio * 100)}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="belt-histogram"
      role="img"
      aria-label={`${subjectLabel} numerical mass distribution for ${qualityLabel}`}
    >
      <div className="belt-histogram__summary">
        <SummaryItem label="Mode" value="Numerical" />
        <SummaryItem
          label="Represented mass"
          value={formatMassTon(distribution.representedMassTon)}
        />
        <SummaryItem
          label="Mass-weighted mean"
          value={formatNumber(distribution.weightedMean)}
        />
        <SummaryItem
          label="Observed range"
          value={`${formatNumber(distribution.domain.min)} to ${formatNumber(distribution.domain.max)}`}
        />
      </div>
      <p className="quality-list__subtext">
        Mass distribution of {qualityLabel}. Each bar accumulates the represented mass
        whose property value falls inside that interval.
      </p>
      <div className="belt-histogram__chart">
        {distribution.bins.map((bin, index) => {
          const height = distribution.maxBinMassTon
            ? (bin.massTon / distribution.maxBinMassTon) * 100
            : 0;
          const label =
            distribution.bins.length === 1
              ? formatNumber(bin.center)
              : `${formatNumber(bin.start)} to ${formatNumber(bin.end)}`;

          return (
            <div
              key={`${quality?.id ?? "quality"}-${index}`}
              className="belt-histogram__column"
              title={`${label}: ${formatMassTon(bin.massTon)} across ${bin.recordCount} ${recordLabel}`}
            >
              <div className="belt-histogram__bar-frame">
                <div
                  className="belt-histogram__bar"
                  style={{
                    height: `${height}%`,
                    backgroundColor: getQualityColor(quality, bin.center),
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="belt-histogram__axis">
        <span>{formatNumber(distribution.domain.min)}</span>
        <span>{formatNumber(distribution.domain.max)}</span>
      </div>
    </div>
  );
}
