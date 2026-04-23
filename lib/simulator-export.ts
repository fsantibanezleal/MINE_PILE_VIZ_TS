import { escapeHtml, slugifyFileSegment } from "@/lib/export-html";
import { formatMassTon, formatTimestamp } from "@/lib/format";
import {
  buildBeltEvidenceCard,
  buildHtmlReportDocument,
  buildMetricList,
  downloadHtmlExportArtifact,
  type HtmlExportArtifact,
} from "@/lib/operator-report-shared";
import { getQualityDisplayLabel } from "@/lib/quality-display";
import type {
  QualityDefinition,
  SimulatorObjectManifest,
  SimulatorStepSnapshot,
} from "@/types/app-data";

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
}: SimulatorExportContext): HtmlExportArtifact {
  const qualityLabel = getQualityDisplayLabel(selectedQuality, "Quality");
  const filename = [
    "simulator-report",
    slugifyFileSegment(manifest.objectId),
    slugifyFileSegment(step.snapshotId),
    slugifyFileSegment(selectedQuality?.id ?? "quality"),
  ].join("-") + ".html";

  const body = `
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
            buildBeltEvidenceCard({
              eyebrow: "Simulated feeder output",
              title: output.label,
              subtitle: output.parentBeltId
                ? `${output.relatedObjectId} -> ${output.parentBeltId}`
                : output.relatedObjectId,
              snapshot: step.outputSnapshots[output.id],
              quality: selectedQuality,
              metrics: [
                {
                  label: `Rate / ${output.stepMinutes} min`,
                  value: formatMassTon(output.tonsPerStep),
                },
                { label: "Rate / h", value: `${output.tonsPerHour.toFixed(1)} t/h` },
                {
                  label: "Simulated mass",
                  value: step.outputSnapshots[output.id]
                    ? formatMassTon(step.outputSnapshots[output.id]!.totalMassTon)
                    : "0 t",
                },
                {
                  label: "Blocks",
                  value: step.outputSnapshots[output.id]
                    ? String(step.outputSnapshots[output.id]!.blockCount)
                    : "0",
                },
              ],
              emptyMessage: "No simulated feeder snapshot was exported for this output.",
            }),
          )
          .join("")}
      </div>
    </section>
  `;

  return {
    filename,
    html: buildHtmlReportDocument({
      title: `${manifest.displayName} simulator report`,
      body,
    }),
  };
}

export function downloadSimulatorExportArtifact(artifact: HtmlExportArtifact) {
  downloadHtmlExportArtifact(artifact);
}
