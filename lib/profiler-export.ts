import { escapeHtml, slugifyFileSegment } from "@/lib/export-html";
import {
  formatDuration,
  formatMassTon,
  formatNumber,
  formatTimestamp,
} from "@/lib/format";
import { buildMassDistribution } from "@/lib/mass-distribution";
import type { MaterialTimeSummary } from "@/lib/material-time";
import type { MaterialTimeMode } from "@/lib/material-time-view";
import {
  buildProfilerDeltaFrame,
} from "@/lib/profiler-delta";
import {
  buildProfilerQualitySeries,
} from "@/lib/profiler-quality-series";
import type { ProfilerSemanticFrame } from "@/lib/profiler-semantics";
import {
  buildHtmlReportDocument,
  buildMassDistributionHtml,
  buildMetricList,
  downloadHtmlExportArtifact,
  type HtmlExportArtifact,
} from "@/lib/operator-report-shared";
import { getQualityDisplayLabel } from "@/lib/quality-display";
import type {
  PileCellRecord,
  ProfilerSnapshot,
  ProfilerSummaryRow,
  QualityDefinition,
  QualityValue,
} from "@/types/app-data";

const CHART_WIDTH = 760;
const CHART_HEIGHT = 240;
const CHART_MARGIN = {
  top: 18,
  right: 18,
  bottom: 54,
  left: 58,
};

interface ProfilerExportContext {
  rows: ProfilerSummaryRow[];
  selectedSummaryRow: ProfilerSummaryRow;
  detailSnapshot: ProfilerSnapshot;
  selectedStepLabel: string;
  selectedQuality?: QualityDefinition;
  inspectionQuality?: QualityDefinition;
  selectedTimeMode: MaterialTimeMode;
  verticalCompressionFactor: number;
  materialTimeSummary: MaterialTimeSummary | null;
  semanticFrame: ProfilerSemanticFrame;
  valueAccessor?: (record: PileCellRecord) => QualityValue;
}

function buildMaterialTimeMetrics(summary: MaterialTimeSummary | null) {
  if (!summary) {
    return `<p class="report-note">No valid represented material timestamps were available for this export.</p>`;
  }

  return buildMetricList([
    { label: "Oldest material", value: formatTimestamp(summary.oldestTimestampMs) },
    { label: "Newest material", value: formatTimestamp(summary.newestTimestampMs) },
    { label: "Material span", value: formatDuration(summary.representedSpanMs) },
    { label: "Oldest age", value: formatDuration(summary.oldestAgeMs) },
    { label: "Newest age", value: formatDuration(summary.newestAgeMs) },
  ]);
}

function buildActiveReadingLabel(
  inspectionQuality: QualityDefinition | undefined,
  selectedTimeMode: MaterialTimeMode,
) {
  const label = getQualityDisplayLabel(inspectionQuality, "Quality");

  if (selectedTimeMode === "property") {
    return label;
  }

  return `${label} (material time mode)`;
}

function buildPointPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function buildProfilerSeriesHtml(
  rows: ProfilerSummaryRow[],
  selectedSnapshotId: string,
  quality: QualityDefinition | undefined,
) {
  const series = buildProfilerQualitySeries(rows, quality);

  if (series.kind === "empty") {
    return `<p class="report-note">${escapeHtml(series.reason)}</p>`;
  }

  if (series.kind === "categorical") {
    return `
      <section class="report-chart">
        <p class="report-chart__summary">
          Historical mapped categories for <strong>${escapeHtml(series.label)}</strong>.
          The stored profiler history changed category ${escapeHtml(String(series.changeCount))} times.
        </p>
        ${buildMetricList([
          { label: "Snapshots", value: String(series.points.length) },
          { label: "First category", value: series.firstLabel },
          { label: "Latest category", value: series.latestLabel },
          { label: "Category changes", value: String(series.changeCount) },
        ])}
        <div class="report-output-grid">
          ${series.points
            .map(
              (point) => `
                <article class="output-card">
                  <header class="output-card__header">
                    <div>
                      <p class="output-card__eyebrow">${
                        point.snapshotId === selectedSnapshotId ? "Selected snapshot" : "Stored snapshot"
                      }</p>
                      <h3>${escapeHtml(point.label)}</h3>
                      <p class="output-card__subtitle">${escapeHtml(
                        formatTimestamp(point.timestamp),
                      )}</p>
                    </div>
                  </header>
                  ${buildMetricList([
                    { label: "Mass", value: formatMassTon(point.massTon) },
                    { label: "Snapshot", value: point.snapshotId },
                  ])}
                </article>`,
            )
            .join("")}
        </div>
      </section>
    `;
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

  return `
    <section class="report-chart">
      <p class="report-chart__summary">
        Historical summarized values for <strong>${escapeHtml(series.label)}</strong>.
        The selected snapshot remains highlighted inside the stored profiler history.
      </p>
      <div class="report-series__metrics">
        <div class="report-series__metric">
          <span>Snapshots</span>
          <strong>${escapeHtml(String(series.points.length))}</strong>
        </div>
        <div class="report-series__metric">
          <span>First value</span>
          <strong>${escapeHtml(formatNumber(series.firstValue))}</strong>
        </div>
        <div class="report-series__metric">
          <span>Latest value</span>
          <strong>${escapeHtml(formatNumber(series.latestValue))}</strong>
        </div>
        <div class="report-series__metric">
          <span>Net change</span>
          <strong>${escapeHtml(
            `${series.delta > 0 ? "+" : ""}${formatNumber(series.delta)}`,
          )}</strong>
        </div>
      </div>
      <svg class="report-series__svg" viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}" aria-label="${escapeHtml(
        `${series.label} time series`,
      )}">
        ${yTicks
          .map((tick) => {
            const y = CHART_MARGIN.top + plotHeight - tick * plotHeight;
            const tickValue = yMin + yRange * tick;

            return `
              <g>
                <line x1="${CHART_MARGIN.left}" x2="${CHART_MARGIN.left + plotWidth}" y1="${y}" y2="${y}" stroke="#d6e2ec" stroke-width="1" />
                <text x="${CHART_MARGIN.left - 10}" y="${y + 4}" text-anchor="end" font-size="12" fill="#486377">${escapeHtml(
                  formatNumber(tickValue),
                )}</text>
              </g>`;
          })
          .join("")}
        <line x1="${CHART_MARGIN.left}" x2="${CHART_MARGIN.left}" y1="${CHART_MARGIN.top}" y2="${CHART_MARGIN.top + plotHeight}" stroke="#7f99ae" stroke-width="1.2" />
        <line x1="${CHART_MARGIN.left}" x2="${CHART_MARGIN.left + plotWidth}" y1="${CHART_MARGIN.top + plotHeight}" y2="${CHART_MARGIN.top + plotHeight}" stroke="#7f99ae" stroke-width="1.2" />
        <path d="${buildPointPath(chartPoints)}" fill="none" stroke="#1f6fb2" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        ${chartPoints
          .map(
            (point, index) => `
              <g>
                <circle cx="${point.x}" cy="${point.y}" r="${
                  point.snapshotId === selectedPoint.snapshotId ? 6.5 : 4.5
                }" fill="${
                  point.snapshotId === selectedPoint.snapshotId ? "#0d1b2a" : "#1f6fb2"
                }">
                  <title>${escapeHtml(
                    `${formatTimestamp(point.timestamp)} • ${formatNumber(point.value)}`,
                  )}</title>
                </circle>
                ${
                  index % labelStep === 0 || index === chartPoints.length - 1
                    ? `<text x="${point.x}" y="${CHART_MARGIN.top + plotHeight + 18}" text-anchor="middle" font-size="11" fill="#486377">${
                        index + 1
                      }</text>`
                    : ""
                }
              </g>`,
          )
          .join("")}
      </svg>
    </section>
  `;
}

export function buildProfilerExportArtifact({
  rows,
  selectedSummaryRow,
  detailSnapshot,
  selectedStepLabel,
  selectedQuality,
  inspectionQuality,
  selectedTimeMode,
  verticalCompressionFactor,
  materialTimeSummary,
  semanticFrame,
  valueAccessor,
}: ProfilerExportContext): HtmlExportArtifact {
  const trackedQualityLabel = getQualityDisplayLabel(selectedQuality, "Quality");
  const activeReadingLabel = buildActiveReadingLabel(inspectionQuality, selectedTimeMode);
  const distribution = buildMassDistribution(detailSnapshot.rows, inspectionQuality, {
    valueAccessor,
  });
  const deltaFrame = buildProfilerDeltaFrame(
    rows,
    selectedSummaryRow.snapshotId,
    selectedQuality,
  );
  const filename = [
    "profiler-report",
    slugifyFileSegment(selectedSummaryRow.objectId),
    slugifyFileSegment(selectedSummaryRow.snapshotId),
    slugifyFileSegment(selectedQuality?.id ?? "quality"),
  ].join("-") + ".html";

  const deltaSection = deltaFrame
    ? buildMetricList([
        {
          label: "Mass vs previous",
          value: deltaFrame.previous
            ? `${deltaFrame.deltaMassTon > 0 ? "+" : ""}${formatMassTon(deltaFrame.deltaMassTon)}`
            : "N/A",
        },
        {
          label: "Mass vs first",
          value: `${deltaFrame.deltaMassSinceStartTon > 0 ? "+" : ""}${formatMassTon(
            deltaFrame.deltaMassSinceStartTon,
          )}`,
        },
        {
          label: "Step interval",
          value: formatDuration(deltaFrame.intervalMs),
        },
        {
          label: `${deltaFrame.qualityLabel} change`,
          value: deltaFrame.qualityDeltaText,
        },
        {
          label: "Current quality",
          value: deltaFrame.currentQualityValue,
        },
        {
          label: "Previous quality",
          value: deltaFrame.previousQualityValue,
        },
      ])
    : `<p class="report-note">No historical delta frame was available for this export.</p>`;

  const body = `
    <section class="report-hero">
      <p class="report-eyebrow">Profiler export</p>
      <h1>${escapeHtml(selectedSummaryRow.displayName)}</h1>
      <p class="report-subtitle">
        Historical object report from Profiler. This export preserves the selected summarized
        snapshot, the tracked quality series for the same object, and the evidence used to compare
        the snapshot against the stored history.
      </p>
      ${buildMetricList([
        { label: "Object", value: selectedSummaryRow.displayName },
        { label: "Snapshot", value: selectedSummaryRow.snapshotId },
        { label: "Timestamp", value: formatTimestamp(selectedSummaryRow.timestamp) },
        { label: "Selected step", value: selectedStepLabel },
        { label: "Tracked quality", value: trackedQualityLabel },
        { label: "Active reading", value: activeReadingLabel },
        { label: "Current mass", value: formatMassTon(selectedSummaryRow.massTon) },
        { label: "Dimension", value: `${detailSnapshot.dimension}D` },
        {
          label: "Vertical compression",
          value: detailSnapshot.dimension === 3 ? `1 / ${verticalCompressionFactor}` : "N/A",
        },
      ])}
    </section>

    <section class="report-section">
      <p class="report-eyebrow">Reading basis</p>
      <h2>Historical snapshot semantics</h2>
      <p class="report-section__text">
        ${escapeHtml(semanticFrame.note)}
      </p>
      ${buildMetricList([
        { label: "Source", value: semanticFrame.source },
        { label: "Resolution", value: semanticFrame.resolution },
        { label: "Object basis", value: semanticFrame.aggregationLabel },
        { label: "Density", value: semanticFrame.densityLabel },
        { label: "Record grammar", value: semanticFrame.recordLabel },
        { label: "Snapshots", value: String(rows.length) },
      ])}
    </section>

    <section class="report-section">
      <p class="report-eyebrow">Historical series</p>
      <h2>Tracked quality through time</h2>
      ${buildProfilerSeriesHtml(rows, selectedSummaryRow.snapshotId, selectedQuality)}
    </section>

    <section class="report-section">
      <p class="report-eyebrow">Historical delta</p>
      <h2>Selected snapshot comparison</h2>
      <p class="report-section__text">
        Compare the selected snapshot against the previous stored step and against the beginning of
        the available history for this same profiled object.
      </p>
      ${deltaSection}
    </section>

    <section class="report-section">
      <p class="report-eyebrow">Selected snapshot evidence</p>
      <h2>Mass distribution</h2>
      ${buildMassDistributionHtml(distribution, inspectionQuality)}
    </section>

    <section class="report-section">
      <p class="report-eyebrow">Material time</p>
      <h2>Represented material window</h2>
      ${buildMaterialTimeMetrics(materialTimeSummary)}
    </section>
  `;

  return {
    filename,
    html: buildHtmlReportDocument({
      title: `${selectedSummaryRow.displayName} profiler report`,
      body,
    }),
  };
}

export function downloadProfilerExportArtifact(artifact: HtmlExportArtifact) {
  downloadHtmlExportArtifact(artifact);
}
