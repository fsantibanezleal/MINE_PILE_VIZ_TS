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

const NUMERICAL_HISTOGRAM_WIDTH = 760;
const NUMERICAL_HISTOGRAM_HEIGHT = 296;
const NUMERICAL_HISTOGRAM_MARGIN = {
  top: 16,
  right: 14,
  bottom: 64,
  left: 68,
};

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

function buildNumericalBinLabel(
  start: number,
  end: number,
  center: number,
  isSingleBin: boolean,
) {
  if (isSingleBin) {
    return formatNumber(center);
  }

  return `${formatNumber(start)}-${formatNumber(end)}`;
}

export function MassDistributionChart({
  distribution,
  quality,
  subjectLabel,
  recordLabel,
}: MassDistributionChartProps) {
  const qualityLabel = getQualityDisplayLabel(
    quality,
    quality ? undefined : humanizeQualityId("quality"),
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

  const plotWidth =
    NUMERICAL_HISTOGRAM_WIDTH -
    NUMERICAL_HISTOGRAM_MARGIN.left -
    NUMERICAL_HISTOGRAM_MARGIN.right;
  const plotHeight =
    NUMERICAL_HISTOGRAM_HEIGHT -
    NUMERICAL_HISTOGRAM_MARGIN.top -
    NUMERICAL_HISTOGRAM_MARGIN.bottom;
  const barSlotWidth = plotWidth / Math.max(distribution.bins.length, 1);
  const barWidth = Math.max(barSlotWidth * 0.72, 14);
  const labelStep = Math.max(1, Math.ceil(distribution.bins.length / 6));
  const yTickRatios = [0, 0.25, 0.5, 0.75, 1];

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
        whose quality value falls inside that interval.
      </p>
      <div className="belt-histogram__svg-frame">
        <svg
          className="belt-histogram__svg"
          viewBox={`0 0 ${NUMERICAL_HISTOGRAM_WIDTH} ${NUMERICAL_HISTOGRAM_HEIGHT}`}
          aria-hidden="true"
        >
          {yTickRatios.map((ratio) => {
            const y =
              NUMERICAL_HISTOGRAM_MARGIN.top + plotHeight - plotHeight * ratio;
            const tickMassTon = distribution.maxBinMassTon * ratio;

            return (
              <g key={`tick-${ratio}`}>
                <line
                  className="belt-histogram__grid-line"
                  x1={NUMERICAL_HISTOGRAM_MARGIN.left}
                  x2={NUMERICAL_HISTOGRAM_MARGIN.left + plotWidth}
                  y1={y}
                  y2={y}
                />
                <text
                  className="belt-histogram__tick"
                  x={NUMERICAL_HISTOGRAM_MARGIN.left - 12}
                  y={y + 4}
                  textAnchor="end"
                >
                  {formatMassTon(tickMassTon)}
                </text>
              </g>
            );
          })}
          <line
            className="belt-histogram__axis-line"
            x1={NUMERICAL_HISTOGRAM_MARGIN.left}
            x2={NUMERICAL_HISTOGRAM_MARGIN.left}
            y1={NUMERICAL_HISTOGRAM_MARGIN.top}
            y2={NUMERICAL_HISTOGRAM_MARGIN.top + plotHeight}
          />
          <line
            className="belt-histogram__axis-line"
            x1={NUMERICAL_HISTOGRAM_MARGIN.left}
            x2={NUMERICAL_HISTOGRAM_MARGIN.left + plotWidth}
            y1={NUMERICAL_HISTOGRAM_MARGIN.top + plotHeight}
            y2={NUMERICAL_HISTOGRAM_MARGIN.top + plotHeight}
          />
          {distribution.bins.map((bin, index) => {
            const barHeight =
              distribution.maxBinMassTon > 0
                ? (bin.massTon / distribution.maxBinMassTon) * plotHeight
                : 0;
            const x =
              NUMERICAL_HISTOGRAM_MARGIN.left +
              index * barSlotWidth +
              (barSlotWidth - barWidth) / 2;
            const y =
              NUMERICAL_HISTOGRAM_MARGIN.top + plotHeight - barHeight;
            const label = buildNumericalBinLabel(
              bin.start,
              bin.end,
              bin.center,
              distribution.bins.length === 1,
            );

            return (
              <g key={`${quality?.id ?? "quality"}-${index}`}>
                <rect
                  className="belt-histogram__svg-bar"
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeight, 2)}
                  rx={6}
                  ry={6}
                  fill={getQualityColor(quality, bin.center)}
                >
                  <title>
                    {`${label}: ${formatMassTon(bin.massTon)} across ${bin.recordCount} ${recordLabel}`}
                  </title>
                </rect>
                {index % labelStep === 0 || index === distribution.bins.length - 1 ? (
                  <text
                    className="belt-histogram__tick belt-histogram__tick--x"
                    x={x + barWidth / 2}
                    y={NUMERICAL_HISTOGRAM_MARGIN.top + plotHeight + 22}
                    textAnchor="middle"
                  >
                    {label}
                  </text>
                ) : null}
              </g>
            );
          })}
          <text
            className="belt-histogram__axis-title"
            x={NUMERICAL_HISTOGRAM_MARGIN.left + plotWidth / 2}
            y={NUMERICAL_HISTOGRAM_HEIGHT - 14}
            textAnchor="middle"
          >
            {qualityLabel} value bins
          </text>
          <text
            className="belt-histogram__axis-title"
            x={22}
            y={NUMERICAL_HISTOGRAM_MARGIN.top + plotHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 22 ${NUMERICAL_HISTOGRAM_MARGIN.top + plotHeight / 2})`}
          >
            Represented mass per bin
          </text>
        </svg>
      </div>
      <div className="belt-histogram__axis">
        <span>{formatNumber(distribution.domain.min)}</span>
        <span>{formatNumber(distribution.domain.max)}</span>
      </div>
    </div>
  );
}
