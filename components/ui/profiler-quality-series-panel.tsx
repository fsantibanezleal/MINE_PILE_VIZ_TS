"use client";

import type { KeyboardEvent } from "react";
import { formatNumber, formatTimestamp } from "@/lib/format";
import { buildProfilerQualitySeries } from "@/lib/profiler-quality-series";
import type { ProfilerSummaryRow, QualityDefinition } from "@/types/app-data";

interface ProfilerQualitySeriesPanelProps {
  rows: ProfilerSummaryRow[];
  selectedSnapshotId: string;
  quality?: QualityDefinition;
  onSelectSnapshot?: (snapshotId: string) => void;
}

const CHART_WIDTH = 760;
const CHART_HEIGHT = 240;
const CHART_MARGIN = {
  top: 18,
  right: 18,
  bottom: 54,
  left: 58,
};

function buildPointPath(
  points: Array<{ x: number; y: number }>,
) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function handleSeriesPointKeyDown(
  event: KeyboardEvent<SVGRectElement>,
  snapshotId: string,
  onSelectSnapshot?: (snapshotId: string) => void,
) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  onSelectSnapshot?.(snapshotId);
}

export function ProfilerQualitySeriesPanel({
  rows,
  selectedSnapshotId,
  quality,
  onSelectSnapshot,
}: ProfilerQualitySeriesPanelProps) {
  const series = buildProfilerQualitySeries(rows, quality);

  if (series.kind === "empty") {
    return (
      <div className="profiler-series profiler-series--empty">
        <div className="section-label">Quality series</div>
        <p className="muted-text">{series.reason}</p>
      </div>
    );
  }

  if (series.kind === "categorical") {
    return (
      <div className="profiler-series">
        <div className="section-label">Quality series</div>
        <p className="muted-text">
          Historical mapped categories for {series.label}. Each stored profiler
          snapshot keeps the dominant summarized category for the selected object.
        </p>
        <div className="profiler-series__metrics">
          <div className="profiler-series__metric">
            <span>Snapshots</span>
            <strong>{String(series.points.length)}</strong>
          </div>
          <div className="profiler-series__metric">
            <span>First category</span>
            <strong>{series.firstLabel}</strong>
          </div>
          <div className="profiler-series__metric">
            <span>Latest category</span>
            <strong>{series.latestLabel}</strong>
          </div>
          <div className="profiler-series__metric">
            <span>Category changes</span>
            <strong>{String(series.changeCount)}</strong>
          </div>
        </div>
        <div className="profiler-series__categorical">
          {series.points.map((point, index) => {
            const isSelected = point.snapshotId === selectedSnapshotId;

            return (
              <button
                key={`${point.snapshotId}:${index}`}
                type="button"
                className={`profiler-series__category-point ${isSelected ? "profiler-series__category-point--selected" : ""}`}
                onClick={() => onSelectSnapshot?.(point.snapshotId)}
                title={`${formatTimestamp(point.timestamp)} • ${point.label}`}
              >
                <span
                  className="profiler-series__category-swatch"
                  style={{ backgroundColor: point.color }}
                />
                <strong>{point.label}</strong>
                <small>{formatTimestamp(point.timestamp)}</small>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const plotWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const plotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const rawRange = series.domain.max - series.domain.min;
  const yMin = rawRange === 0 ? series.domain.min - 1 : series.domain.min;
  const yMax = rawRange === 0 ? series.domain.max + 1 : series.domain.max;
  const yRange = Math.max(yMax - yMin, 1);
  const xStep =
    series.points.length > 1 ? plotWidth / (series.points.length - 1) : plotWidth / 2;
  const chartPoints = series.points.map((point, index) => {
    const x =
      series.points.length > 1
        ? CHART_MARGIN.left + index * xStep
        : CHART_MARGIN.left + plotWidth / 2;
    const ratio = (point.value - yMin) / yRange;
    const y = CHART_MARGIN.top + plotHeight - ratio * plotHeight;

    return {
      ...point,
      x,
      y,
    };
  });
  const selectedPoint =
    chartPoints.find((point) => point.snapshotId === selectedSnapshotId) ??
    chartPoints[chartPoints.length - 1]!;
  const labelStep = Math.max(1, Math.ceil(chartPoints.length / 5));
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="profiler-series">
      <div className="section-label">Quality series</div>
      <p className="muted-text">
        Historical summarized values for {series.label}. The curve follows the
        selected object across stored profiler snapshots.
      </p>
      <div className="profiler-series__metrics">
        <div className="profiler-series__metric">
          <span>Snapshots</span>
          <strong>{String(series.points.length)}</strong>
        </div>
        <div className="profiler-series__metric">
          <span>First value</span>
          <strong>{formatNumber(series.firstValue)}</strong>
        </div>
        <div className="profiler-series__metric">
          <span>Latest value</span>
          <strong>{formatNumber(series.latestValue)}</strong>
        </div>
        <div className="profiler-series__metric">
          <span>Net change</span>
          <strong>
            {series.delta > 0 ? "+" : ""}
            {formatNumber(series.delta)}
          </strong>
        </div>
      </div>
      <div className="profiler-series__svg-frame">
        <svg
          className="profiler-series__svg"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label={`${series.label} time series`}
        >
          {yTicks.map((tick) => {
            const y = CHART_MARGIN.top + plotHeight - tick * plotHeight;
            const tickValue = yMin + yRange * tick;

            return (
              <g key={`tick-${tick}`}>
                <line
                  className="profiler-series__grid-line"
                  x1={CHART_MARGIN.left}
                  x2={CHART_MARGIN.left + plotWidth}
                  y1={y}
                  y2={y}
                />
                <text
                  className="profiler-series__tick"
                  x={CHART_MARGIN.left - 10}
                  y={y + 4}
                  textAnchor="end"
                >
                  {formatNumber(tickValue)}
                </text>
              </g>
            );
          })}
          <line
            className="profiler-series__axis-line"
            x1={CHART_MARGIN.left}
            x2={CHART_MARGIN.left}
            y1={CHART_MARGIN.top}
            y2={CHART_MARGIN.top + plotHeight}
          />
          <line
            className="profiler-series__axis-line"
            x1={CHART_MARGIN.left}
            x2={CHART_MARGIN.left + plotWidth}
            y1={CHART_MARGIN.top + plotHeight}
            y2={CHART_MARGIN.top + plotHeight}
          />
          <path
            className="profiler-series__line"
            d={buildPointPath(chartPoints)}
          />
          {chartPoints.map((point, index) => {
            const isSelected = point.snapshotId === selectedPoint.snapshotId;

            return (
              <g key={`${point.snapshotId}:${index}`}>
                <circle
                  className={`profiler-series__point ${isSelected ? "profiler-series__point--selected" : ""}`}
                  cx={point.x}
                  cy={point.y}
                  r={isSelected ? 6.5 : 4.5}
                >
                  <title>{`${formatTimestamp(point.timestamp)} • ${formatNumber(point.value)}`}</title>
                </circle>
                <rect
                  className="profiler-series__point-hitbox"
                  x={point.x - 10}
                  y={CHART_MARGIN.top}
                  width={20}
                  height={plotHeight}
                  rx={8}
                  ry={8}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select quality series snapshot ${index + 1} at ${point.timestamp}`}
                  onClick={() => onSelectSnapshot?.(point.snapshotId)}
                  onKeyDown={(event) =>
                    handleSeriesPointKeyDown(event, point.snapshotId, onSelectSnapshot)
                  }
                />
                {index % labelStep === 0 || index === chartPoints.length - 1 ? (
                  <text
                    className="profiler-series__tick profiler-series__tick--x"
                    x={point.x}
                    y={CHART_MARGIN.top + plotHeight + 18}
                    textAnchor="middle"
                  >
                    {index + 1}
                  </text>
                ) : null}
              </g>
            );
          })}
          <text
            className="profiler-series__axis-title"
            x={CHART_MARGIN.left + plotWidth / 2}
            y={CHART_HEIGHT - 12}
            textAnchor="middle"
          >
            Stored profiler snapshot sequence
          </text>
          <text
            className="profiler-series__axis-title"
            x={20}
            y={CHART_MARGIN.top + plotHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 20 ${CHART_MARGIN.top + plotHeight / 2})`}
          >
            {series.label}
          </text>
        </svg>
      </div>
      <div className="profiler-series__selection">
        <span>Selected snapshot</span>
        <strong>{formatTimestamp(selectedPoint.timestamp)}</strong>
        <small>{`${series.label}: ${formatNumber(selectedPoint.value)}`}</small>
      </div>
    </div>
  );
}
