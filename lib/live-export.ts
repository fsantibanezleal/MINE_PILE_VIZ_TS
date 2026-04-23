import { escapeHtml, slugifyFileSegment } from "@/lib/export-html";
import { formatDuration, formatMassTon, formatTimestamp } from "@/lib/format";
import { buildMassDistribution } from "@/lib/mass-distribution";
import type { MaterialTimeSummary } from "@/lib/material-time";
import type { MaterialTimeMode } from "@/lib/material-time-view";
import type { LiveBeltRouteContext } from "@/lib/live-belt-context";
import {
  buildBeltEvidenceCard,
  buildBeltStripHtml,
  buildHtmlReportDocument,
  buildMassDistributionHtml,
  buildMetricList,
  downloadHtmlExportArtifact,
  type HtmlExportArtifact,
} from "@/lib/operator-report-shared";
import { getQualityDisplayLabel } from "@/lib/quality-display";
import type {
  BeltBlockRecord,
  BeltSnapshot,
  PileCellRecord,
  PileDataset,
  QualityDefinition,
  QualityValue,
} from "@/types/app-data";

interface LiveBeltExportContext {
  snapshot: BeltSnapshot;
  selectedQuality?: QualityDefinition;
  inspectionQuality?: QualityDefinition;
  selectedTimeMode: MaterialTimeMode;
  routeContext: LiveBeltRouteContext | null;
  materialTimeSummary: MaterialTimeSummary | null;
  valueAccessor?: (record: BeltBlockRecord) => QualityValue;
}

interface LivePileExportContext {
  dataset: PileDataset;
  selectedQuality?: QualityDefinition;
  inspectionQuality?: QualityDefinition;
  selectedTimeMode: MaterialTimeMode;
  materialTimeSummary: MaterialTimeSummary | null;
  visibleCellCount: number;
  viewMode: string;
  verticalCompressionFactor: number;
  surfaceColorMode?: string | null;
  outputSnapshots: Record<string, BeltSnapshot>;
  outputErrors: Record<string, string>;
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

export function buildLiveBeltExportArtifact({
  snapshot,
  selectedQuality,
  inspectionQuality,
  selectedTimeMode,
  routeContext,
  materialTimeSummary,
  valueAccessor,
}: LiveBeltExportContext): HtmlExportArtifact {
  const trackedQualityLabel = getQualityDisplayLabel(selectedQuality, "Quality");
  const activeReadingLabel = buildActiveReadingLabel(inspectionQuality, selectedTimeMode);
  const histogram = buildMassDistribution(snapshot.blocks, inspectionQuality, {
    valueAccessor,
  });
  const filename = [
    "live-belt-report",
    slugifyFileSegment(snapshot.objectId),
    slugifyFileSegment(snapshot.timestamp),
    slugifyFileSegment(selectedQuality?.id ?? "quality"),
  ].join("-") + ".html";

  const routeMetrics = routeContext
    ? buildMetricList([
        {
          label: "Stage",
          value: `${routeContext.stageIndex + 1}: ${routeContext.stageLabel}`,
        },
        { label: "Receives from", value: String(routeContext.upstreamNodes.length) },
        { label: "Feeds into", value: String(routeContext.downstreamNodes.length) },
        { label: "Stage peers", value: String(routeContext.stagePeers.length) },
      ])
    : `<p class="report-note">No circuit route context was available for the selected belt.</p>`;
  const routeGroups = routeContext
    ? `
      <div class="report-output-grid">
        <article class="output-card">
          <header class="output-card__header">
            <div>
              <p class="output-card__eyebrow">Upstream objects</p>
              <h3>Receives from</h3>
              <p class="output-card__subtitle">${escapeHtml(
                routeContext.upstreamNodes.map((node) => node.label).join(", ") || "None",
              )}</p>
            </div>
          </header>
        </article>
        <article class="output-card">
          <header class="output-card__header">
            <div>
              <p class="output-card__eyebrow">Downstream objects</p>
              <h3>Feeds into</h3>
              <p class="output-card__subtitle">${escapeHtml(
                routeContext.downstreamNodes.map((node) => node.label).join(", ") || "None",
              )}</p>
            </div>
          </header>
        </article>
      </div>`
    : "";

  const body = `
    <section class="report-hero">
      <p class="report-eyebrow">Live export</p>
      <h1>${escapeHtml(snapshot.displayName)}</h1>
      <p class="report-subtitle">
        Current dense belt report from Live State. This export preserves the active current-state
        selection, tracked quality, and minimal structural context used to read the ordered belt content.
      </p>
      ${buildMetricList([
        { label: "Object", value: snapshot.displayName },
        { label: "Timestamp", value: formatTimestamp(snapshot.timestamp) },
        { label: "Tracked quality", value: trackedQualityLabel },
        { label: "Active reading", value: activeReadingLabel },
        { label: "Current mass", value: formatMassTon(snapshot.totalMassTon) },
        { label: "Blocks", value: String(snapshot.blockCount) },
      ])}
    </section>

    <section class="report-section">
      <p class="report-eyebrow">Reading basis</p>
      <h2>Dense current belt context</h2>
      <p class="report-section__text">
        This export stays on one current belt. It does not redraw the full circuit; it records the
        ordered dense belt blocks that exist right now plus the immediate route context needed to
        interpret that transport object inside the modeled circuit.
      </p>
      ${routeMetrics}
      ${routeGroups}
    </section>

    <section class="report-section">
      <p class="report-eyebrow">Dense-state evidence</p>
      <h2>Current belt content</h2>
      ${buildBeltStripHtml(snapshot, inspectionQuality)}
      ${buildMassDistributionHtml(histogram, inspectionQuality)}
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
      title: `${snapshot.displayName} live belt report`,
      body,
    }),
  };
}

export function buildLivePileExportArtifact({
  dataset,
  selectedQuality,
  inspectionQuality,
  selectedTimeMode,
  materialTimeSummary,
  visibleCellCount,
  viewMode,
  verticalCompressionFactor,
  surfaceColorMode,
  outputSnapshots,
  outputErrors,
  valueAccessor,
}: LivePileExportContext): HtmlExportArtifact {
  const trackedQualityLabel = getQualityDisplayLabel(selectedQuality, "Quality");
  const activeReadingLabel = buildActiveReadingLabel(inspectionQuality, selectedTimeMode);
  const pileDistribution = buildMassDistribution(dataset.cells, inspectionQuality, {
    valueAccessor,
  });
  const totalMassTon = dataset.cells.reduce((sum, cell) => sum + cell.massTon, 0);
  const filename = [
    "live-pile-report",
    slugifyFileSegment(dataset.objectId),
    slugifyFileSegment(dataset.timestamp),
    slugifyFileSegment(selectedQuality?.id ?? "quality"),
  ].join("-") + ".html";

  const outputGrid =
    dataset.outputs.length > 0
      ? `
        <div class="report-output-grid">
          ${dataset.outputs
            .map((output) =>
              buildBeltEvidenceCard({
                eyebrow: "Current direct output",
                title: output.label,
                subtitle: output.relatedObjectId,
                snapshot: outputSnapshots[output.relatedObjectId],
                quality: inspectionQuality,
                metrics: [
                  {
                    label: "Current mass",
                    value: outputSnapshots[output.relatedObjectId]
                      ? formatMassTon(outputSnapshots[output.relatedObjectId]!.totalMassTon)
                      : "0 t",
                  },
                  {
                    label: "Blocks",
                    value: outputSnapshots[output.relatedObjectId]
                      ? String(outputSnapshots[output.relatedObjectId]!.blockCount)
                      : "0",
                  },
                ],
                emptyMessage:
                  outputErrors[output.relatedObjectId] ??
                  "No direct output snapshot was available for this current export.",
              }),
            )
            .join("")}
        </div>`
      : `<p class="report-note">This pile does not expose configured direct outputs.</p>`;

  const body = `
    <section class="report-hero">
      <p class="report-eyebrow">Live export</p>
      <h1>${escapeHtml(dataset.displayName)}</h1>
      <p class="report-subtitle">
        Current dense pile report from Live State. This export preserves the active pile selection,
        tracked quality, current pile view context, and simultaneous direct-output evidence.
      </p>
      ${buildMetricList([
        { label: "Object", value: dataset.displayName },
        { label: "Timestamp", value: formatTimestamp(dataset.timestamp) },
        { label: "Tracked quality", value: trackedQualityLabel },
        { label: "Active reading", value: activeReadingLabel },
        { label: "Pile mass", value: formatMassTon(totalMassTon) },
        { label: "Dimension", value: `${dataset.dimension}D` },
        { label: "Occupied cells", value: String(dataset.occupiedCellCount) },
        { label: "Visible cells", value: String(visibleCellCount) },
        { label: "View mode", value: viewMode },
        {
          label: "Vertical compression",
          value: dataset.dimension === 3 ? `1 / ${verticalCompressionFactor}` : "N/A",
        },
        {
          label: "Top-surface coloring",
          value: viewMode === "top-surface" && surfaceColorMode ? surfaceColorMode : "N/A",
        },
      ])}
    </section>

    <section class="report-section">
      <p class="report-eyebrow">Reading basis</p>
      <h2>Dense current pile context</h2>
      <p class="report-section__text">
        This export stays on one current dense pile snapshot inside Live State. It records the active
        pile evidence and any configured direct outputs that are available at the same runtime timestamp.
      </p>
      ${buildMetricList([
        { label: "Inputs", value: String(dataset.inputs.length) },
        { label: "Direct outputs", value: String(dataset.outputs.length) },
        { label: "Surface cells", value: String(dataset.surfaceCellCount) },
      ])}
    </section>

    <section class="report-section">
      <p class="report-eyebrow">Pile evidence</p>
      <h2>Current pile mass distribution</h2>
      ${buildMassDistributionHtml(pileDistribution, inspectionQuality)}
    </section>

    <section class="report-section">
      <p class="report-eyebrow">Material time</p>
      <h2>Represented material window</h2>
      ${buildMaterialTimeMetrics(materialTimeSummary)}
    </section>

    <section class="report-section">
      <p class="report-eyebrow">Direct outputs</p>
      <h2>Simultaneous feeder evidence</h2>
      ${outputGrid}
    </section>
  `;

  return {
    filename,
    html: buildHtmlReportDocument({
      title: `${dataset.displayName} live pile report`,
      body,
    }),
  };
}

export function downloadLiveExportArtifact(artifact: HtmlExportArtifact) {
  downloadHtmlExportArtifact(artifact);
}
