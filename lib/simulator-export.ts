import { buildBeltMassHistogram } from "@/lib/live-histogram";
import { getQualityColor } from "@/lib/color";
import { downloadTextFile, escapeHtml, slugifyFileSegment } from "@/lib/export-html";
import { formatMassTon, formatNumber, formatTimestamp } from "@/lib/format";
import { getQualityDisplayLabel } from "@/lib/quality-display";
import type { MassDistribution } from "@/lib/mass-distribution";
import type {
  BeltSnapshot,
  QualityDefinition,
  SimulatorObjectManifest,
  SimulatorStepSnapshot,
} from "@/types/app-data";

const SVG_WIDTH = 760;
const SVG_HEIGHT = 296;
const SVG_MARGIN = {
  top: 16,
  right: 14,
  bottom: 64,
  left: 68,
};

interface SimulatorExportContext {
  manifest: SimulatorObjectManifest;
  step: SimulatorStepSnapshot;
  stepLabel: string;
  selectedQuality?: QualityDefinition;
  pileMassTon: number;
  visibleCellCount: number;
  viewMode: string;
  verticalCompressionFactor: number;
  surfaceColorMode?: string | null;
}

interface SimulatorExportArtifact {
  filename: string;
  html: string;
}

function buildMetricList(
  metrics: Array<{
    label: string;
    value: string;
  }>,
) {
  return `
    <dl class="report-metrics">
      ${metrics
        .map(
          (metric) => `
            <div class="report-metric">
              <dt>${escapeHtml(metric.label)}</dt>
              <dd>${escapeHtml(metric.value)}</dd>
            </div>`,
        )
        .join("")}
    </dl>
  `;
}

function buildOutputStrip(snapshot: BeltSnapshot, quality: QualityDefinition | undefined) {
  if (snapshot.blocks.length === 0) {
    return `<p class="report-note">No simulated feeder blocks were emitted for this step.</p>`;
  }

  return `
    <div class="report-strip" aria-label="${escapeHtml(snapshot.displayName)} block strip">
      ${snapshot.blocks
        .map((block) => {
          const value = quality ? block.qualityValues[quality.id] : null;
          return `<span class="report-strip__block" style="background:${escapeHtml(
            getQualityColor(quality, value),
          )}" title="${escapeHtml(`Block ${block.position + 1}`)}"></span>`;
        })
        .join("")}
    </div>
  `;
}

function buildNumericalHistogramSvg(
  distribution: Extract<MassDistribution, { kind: "numerical" }>,
  quality: QualityDefinition | undefined,
) {
  const plotWidth = SVG_WIDTH - SVG_MARGIN.left - SVG_MARGIN.right;
  const plotHeight = SVG_HEIGHT - SVG_MARGIN.top - SVG_MARGIN.bottom;
  const barSlotWidth = plotWidth / Math.max(distribution.bins.length, 1);
  const barWidth = Math.max(barSlotWidth * 0.72, 14);
  const labelStep = Math.max(1, Math.ceil(distribution.bins.length / 6));
  const yTickRatios = [0, 0.25, 0.5, 0.75, 1];
  const qualityLabel = getQualityDisplayLabel(quality, "Quality");

  const grid = yTickRatios
    .map((ratio) => {
      const y = SVG_MARGIN.top + plotHeight - plotHeight * ratio;
      const tickMassTon = distribution.maxBinMassTon * ratio;
      return `
        <g>
          <line x1="${SVG_MARGIN.left}" x2="${SVG_MARGIN.left + plotWidth}" y1="${y}" y2="${y}" stroke="#d6e2ec" stroke-width="1" />
          <text x="${SVG_MARGIN.left - 12}" y="${y + 4}" text-anchor="end" font-size="12" fill="#486377">${escapeHtml(
            formatMassTon(tickMassTon),
          )}</text>
        </g>`;
    })
    .join("");

  const bars = distribution.bins
    .map((bin, index) => {
      const barHeight =
        distribution.maxBinMassTon > 0
          ? (bin.massTon / distribution.maxBinMassTon) * plotHeight
          : 0;
      const x = SVG_MARGIN.left + index * barSlotWidth + (barSlotWidth - barWidth) / 2;
      const y = SVG_MARGIN.top + plotHeight - barHeight;
      const label =
        distribution.bins.length === 1
          ? formatNumber(bin.center)
          : `${formatNumber(bin.start)}-${formatNumber(bin.end)}`;
      const labelNode =
        index % labelStep === 0 || index === distribution.bins.length - 1
          ? `<text x="${x + barWidth / 2}" y="${SVG_MARGIN.top + plotHeight + 22}" text-anchor="middle" font-size="11" fill="#486377">${escapeHtml(
              label,
            )}</text>`
          : "";

      return `
        <g>
          <rect x="${x}" y="${y}" width="${barWidth}" height="${Math.max(
            barHeight,
            2,
          )}" rx="6" ry="6" fill="${escapeHtml(
            getQualityColor(quality, bin.center),
          )}" />
          ${labelNode}
        </g>`;
    })
    .join("");

  return `
    <svg viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" class="report-histogram__svg" aria-label="${escapeHtml(
      `${qualityLabel} histogram`,
    )}">
      ${grid}
      <line x1="${SVG_MARGIN.left}" x2="${SVG_MARGIN.left}" y1="${SVG_MARGIN.top}" y2="${SVG_MARGIN.top + plotHeight}" stroke="#7f99ae" stroke-width="1.2" />
      <line x1="${SVG_MARGIN.left}" x2="${SVG_MARGIN.left + plotWidth}" y1="${SVG_MARGIN.top + plotHeight}" y2="${SVG_MARGIN.top + plotHeight}" stroke="#7f99ae" stroke-width="1.2" />
      ${bars}
      <text x="${SVG_MARGIN.left + plotWidth / 2}" y="${SVG_HEIGHT - 14}" text-anchor="middle" font-size="12" fill="#334a5d">${escapeHtml(
        `${qualityLabel} value bins`,
      )}</text>
      <text x="22" y="${SVG_MARGIN.top + plotHeight / 2}" text-anchor="middle" font-size="12" fill="#334a5d" transform="rotate(-90 22 ${
        SVG_MARGIN.top + plotHeight / 2
      })">Represented mass per bin</text>
    </svg>
  `;
}

function buildMassDistributionHtml(
  distribution: MassDistribution,
  quality: QualityDefinition | undefined,
) {
  const qualityLabel = getQualityDisplayLabel(quality, "Quality");

  if (distribution.kind === "empty") {
    return `<p class="report-note">${escapeHtml(distribution.reason)}</p>`;
  }

  if (distribution.kind === "categorical") {
    return `
      <section class="report-chart">
        <p class="report-chart__summary">
          Dominant category: <strong>${escapeHtml(distribution.dominantLabel)}</strong>,
          represented mass ${escapeHtml(formatMassTon(distribution.representedMassTon))}.
        </p>
        <div class="report-category-list">
          ${distribution.bins
            .map(
              (bin) => `
                <div class="report-category">
                  <div class="report-category__meta">
                    <span class="report-category__label">
                      <i style="background:${escapeHtml(bin.color)}"></i>
                      ${escapeHtml(bin.label)}
                    </span>
                    <strong>${escapeHtml(formatMassTon(bin.massTon))}</strong>
                  </div>
                  <div class="report-category__bar-frame">
                    <div class="report-category__bar" style="width:${Math.max(
                      bin.ratio * 100,
                      1,
                    )}%;background:${escapeHtml(bin.color)}"></div>
                  </div>
                </div>`,
            )
            .join("")}
        </div>
      </section>
    `;
  }

  return `
    <section class="report-chart">
      <p class="report-chart__summary">
        Numerical histogram for <strong>${escapeHtml(qualityLabel)}</strong>,
        represented mass ${escapeHtml(formatMassTon(distribution.representedMassTon))},
        mass-weighted mean ${escapeHtml(formatNumber(distribution.weightedMean))}.
      </p>
      ${buildNumericalHistogramSvg(distribution, quality)}
    </section>
  `;
}

function buildOutputCardHtml(
  output: SimulatorObjectManifest["outputs"][number],
  snapshot: BeltSnapshot | undefined,
  quality: QualityDefinition | undefined,
) {
  const histogram = snapshot ? buildBeltMassHistogram(snapshot, quality) : null;

  return `
    <article class="output-card">
      <header class="output-card__header">
        <div>
          <p class="output-card__eyebrow">Simulated feeder output</p>
          <h3>${escapeHtml(output.label)}</h3>
          <p class="output-card__subtitle">${escapeHtml(
            output.parentBeltId
              ? `${output.relatedObjectId} -> ${output.parentBeltId}`
              : output.relatedObjectId,
          )}</p>
        </div>
      </header>
      ${buildMetricList([
        { label: `Rate / ${output.stepMinutes} min`, value: formatMassTon(output.tonsPerStep) },
        { label: "Rate / h", value: `${output.tonsPerHour.toFixed(1)} t/h` },
        { label: "Simulated mass", value: snapshot ? formatMassTon(snapshot.totalMassTon) : "0 t" },
        { label: "Blocks", value: snapshot ? String(snapshot.blockCount) : "0" },
      ])}
      ${snapshot ? buildOutputStrip(snapshot, quality) : `<p class="report-note">No simulated feeder snapshot was exported for this output.</p>`}
      ${snapshot && histogram ? buildMassDistributionHtml(histogram, quality) : ""}
    </article>
  `;
}

export function buildSimulatorExportArtifact({
  manifest,
  step,
  stepLabel,
  selectedQuality,
  pileMassTon,
  visibleCellCount,
  viewMode,
  verticalCompressionFactor,
  surfaceColorMode,
}: SimulatorExportContext): SimulatorExportArtifact {
  const qualityLabel = getQualityDisplayLabel(selectedQuality, "Quality");
  const filename = [
    "simulator-report",
    slugifyFileSegment(manifest.objectId),
    slugifyFileSegment(step.snapshotId),
    slugifyFileSegment(selectedQuality?.id ?? "quality"),
  ].join("-") + ".html";

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(manifest.displayName)} simulator report</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", ui-sans-serif, system-ui, sans-serif;
      background: #f3f7fb;
      color: #0d1b2a;
      line-height: 1.45;
      padding: 32px;
    }
    main { max-width: 1280px; margin: 0 auto; display: grid; gap: 24px; }
    .report-hero, .report-section, .output-card {
      background: #ffffff;
      border: 1px solid #d7e1ea;
      border-radius: 18px;
      box-shadow: 0 16px 40px rgba(13, 27, 42, 0.08);
    }
    .report-hero, .report-section { padding: 24px; }
    .report-eyebrow { margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.08em; font-size: 12px; color: #587286; font-weight: 700; }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 32px; }
    h2 { font-size: 22px; margin-bottom: 12px; }
    h3 { font-size: 18px; }
    .report-subtitle { margin-top: 10px; color: #486377; max-width: 80ch; }
    .report-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      margin-top: 18px;
    }
    .report-metric {
      padding: 12px 14px;
      border-radius: 14px;
      background: #eef4f8;
      border: 1px solid #d7e1ea;
    }
    .report-metric dt {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #587286;
      margin-bottom: 6px;
      font-weight: 700;
    }
    .report-metric dd {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: #12263a;
    }
    .report-section__text { color: #486377; max-width: 90ch; }
    .report-output-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 18px;
    }
    .output-card { padding: 18px; display: grid; gap: 16px; }
    .output-card__eyebrow {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #587286;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .output-card__subtitle, .report-note, .report-chart__summary { color: #486377; }
    .report-strip {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(8px, 1fr);
      gap: 2px;
      min-height: 34px;
      align-items: stretch;
      border-radius: 12px;
      padding: 6px;
      background: #0f1c2b;
    }
    .report-strip__block { border-radius: 6px; min-height: 22px; }
    .report-chart { display: grid; gap: 10px; }
    .report-histogram__svg {
      width: 100%;
      height: auto;
      border-radius: 14px;
      background: #f8fbfd;
      border: 1px solid #d7e1ea;
    }
    .report-category-list { display: grid; gap: 10px; }
    .report-category { display: grid; gap: 8px; }
    .report-category__meta {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
    }
    .report-category__label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
    }
    .report-category__label i {
      width: 12px;
      height: 12px;
      border-radius: 999px;
      display: inline-block;
    }
    .report-category__bar-frame {
      height: 12px;
      border-radius: 999px;
      background: #e5edf3;
      overflow: hidden;
    }
    .report-category__bar { height: 100%; border-radius: inherit; }
    @media print {
      body { padding: 0; background: #fff; }
      .report-hero, .report-section, .output-card { box-shadow: none; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main>
    <section class="report-hero">
      <p class="report-eyebrow">Simulator export</p>
      <h1>${escapeHtml(manifest.displayName)}</h1>
      <p class="report-subtitle">
        Pile-centered simulated discharge report. This export preserves the active simulation step,
        selected quality, pile view context, and every direct feeder output visible in the simulator.
      </p>
      ${buildMetricList([
        { label: "Object", value: manifest.displayName },
        { label: "Snapshot", value: step.snapshotId },
        { label: "Timestamp", value: formatTimestamp(step.timestamp) },
        { label: "Active step", value: stepLabel },
        { label: "Selected quality", value: qualityLabel },
        { label: "Pile mass", value: formatMassTon(pileMassTon) },
        { label: "Visible cells", value: String(visibleCellCount) },
        { label: "3D view mode", value: viewMode },
        {
          label: "Vertical compression",
          value: `1 / ${verticalCompressionFactor}`,
        },
        {
          label: "Top-surface coloring",
          value: surfaceColorMode ? surfaceColorMode : "N/A",
        },
      ])}
    </section>

    <section class="report-section">
      <p class="report-eyebrow">Reading basis</p>
      <h2>Scenario semantics</h2>
      <p class="report-section__text">
        The exported step starts from the latest real profiler pile state and advances through the
        generated simulator sequence. Direct output rates are read-only scenario assumptions already
        encoded in the simulator manifest, not values edited interactively in the browser.
      </p>
    </section>

    <section class="report-section">
      <p class="report-eyebrow">Direct outputs</p>
      <h2>Simultaneous feeder evidence</h2>
      <div class="report-output-grid">
        ${manifest.outputs
          .map((output) =>
            buildOutputCardHtml(output, step.outputSnapshots[output.id], selectedQuality),
          )
          .join("")}
      </div>
    </section>
  </main>
</body>
</html>`;

  return { filename, html };
}

export function downloadSimulatorExportArtifact(artifact: SimulatorExportArtifact) {
  downloadTextFile(artifact.filename, artifact.html);
}
