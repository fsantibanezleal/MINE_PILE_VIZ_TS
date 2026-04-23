import { getQualityColor } from "@/lib/color";
import { downloadTextFile, escapeHtml } from "@/lib/export-html";
import { formatMassTon, formatNumber } from "@/lib/format";
import { buildBeltMassHistogram } from "@/lib/live-histogram";
import type { MassDistribution } from "@/lib/mass-distribution";
import { getQualityDisplayLabel } from "@/lib/quality-display";
import type {
  BeltSnapshot,
  QualityDefinition,
} from "@/types/app-data";

const SVG_WIDTH = 760;
const SVG_HEIGHT = 296;
const SVG_MARGIN = {
  top: 16,
  right: 14,
  bottom: 64,
  left: 68,
};

export interface HtmlExportArtifact {
  filename: string;
  html: string;
}

export interface ReportMetric {
  label: string;
  value: string;
}

export function buildMetricList(metrics: ReportMetric[]) {
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

export function buildBeltStripHtml(
  snapshot: BeltSnapshot,
  quality: QualityDefinition | undefined,
  emptyMessage = "No represented belt blocks were available for this export.",
) {
  if (snapshot.blocks.length === 0) {
    return `<p class="report-note">${escapeHtml(emptyMessage)}</p>`;
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

export function buildMassDistributionHtml(
  distribution: MassDistribution,
  quality: QualityDefinition | undefined,
  summaryPrefix?: string,
) {
  const qualityLabel = getQualityDisplayLabel(quality, "Quality");

  if (distribution.kind === "empty") {
    return `<p class="report-note">${escapeHtml(distribution.reason)}</p>`;
  }

  if (distribution.kind === "categorical") {
    const prefix = summaryPrefix
      ? `${escapeHtml(summaryPrefix)} `
      : "";

    return `
      <section class="report-chart">
        <p class="report-chart__summary">
          ${prefix}Dominant category: <strong>${escapeHtml(distribution.dominantLabel)}</strong>,
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

  const prefix = summaryPrefix ? `${escapeHtml(summaryPrefix)} ` : "";

  return `
    <section class="report-chart">
      <p class="report-chart__summary">
        ${prefix}Numerical histogram for <strong>${escapeHtml(qualityLabel)}</strong>,
        represented mass ${escapeHtml(formatMassTon(distribution.representedMassTon))},
        mass-weighted mean ${escapeHtml(formatNumber(distribution.weightedMean))}.
      </p>
      ${buildNumericalHistogramSvg(distribution, quality)}
    </section>
  `;
}

export function buildBeltEvidenceCard({
  eyebrow,
  title,
  subtitle,
  snapshot,
  quality,
  metrics,
  emptyMessage,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  snapshot?: BeltSnapshot;
  quality?: QualityDefinition;
  metrics: ReportMetric[];
  emptyMessage?: string;
}) {
  const histogram = snapshot ? buildBeltMassHistogram(snapshot, quality) : null;

  return `
    <article class="output-card">
      <header class="output-card__header">
        <div>
          <p class="output-card__eyebrow">${escapeHtml(eyebrow)}</p>
          <h3>${escapeHtml(title)}</h3>
          ${subtitle ? `<p class="output-card__subtitle">${escapeHtml(subtitle)}</p>` : ""}
        </div>
      </header>
      ${buildMetricList(metrics)}
      ${
        snapshot
          ? buildBeltStripHtml(snapshot, quality)
          : `<p class="report-note">${escapeHtml(
              emptyMessage ?? "No belt snapshot was available for this export.",
            )}</p>`
      }
      ${snapshot && histogram ? buildMassDistributionHtml(histogram, quality) : ""}
    </article>
  `;
}

export function buildHtmlReportDocument({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
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
    .output-card__subtitle, .report-note, .report-chart__summary, .report-series__summary { color: #486377; }
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
    .report-histogram__svg,
    .report-series__svg {
      width: 100%;
      height: auto;
      border-radius: 14px;
      background: #f8fbfd;
      border: 1px solid #d7e1ea;
    }
    .report-category-list { display: grid; gap: 10px; }
    .report-category { display: grid; gap: 8px; }
    .report-category__meta,
    .report-series__metrics {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
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
    .report-series__metric {
      padding: 12px 14px;
      border-radius: 14px;
      background: #eef4f8;
      border: 1px solid #d7e1ea;
      min-width: 160px;
    }
    .report-series__metric span {
      display: block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #587286;
      margin-bottom: 6px;
      font-weight: 700;
    }
    .report-series__metric strong {
      font-size: 16px;
      color: #12263a;
    }
    @media print {
      body { padding: 0; background: #fff; }
      .report-hero, .report-section, .output-card { box-shadow: none; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main>
    ${body}
  </main>
</body>
</html>`;
}

export function downloadHtmlExportArtifact(artifact: HtmlExportArtifact) {
  downloadTextFile(artifact.filename, artifact.html);
}
