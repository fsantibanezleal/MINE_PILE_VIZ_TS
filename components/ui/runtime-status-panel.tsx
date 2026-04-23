import type { AppManifest } from "@/types/app-data";
import type { AppCacheCheckResult } from "@/lib/server/app-cache-check";
import { formatTimestamp } from "@/lib/format";
import { InlineNotice } from "@/components/ui/inline-notice";
import { MetricGrid } from "@/components/ui/metric-grid";

interface RuntimeStatusPanelProps {
  manifest: AppManifest;
  status: AppCacheCheckResult;
  repositoryVersion: string;
}

const capabilityLabels: Array<{
  key: keyof AppManifest["capabilities"];
  label: string;
}> = [
  { key: "circuit", label: "Circuit" },
  { key: "live", label: "Live State" },
  { key: "stockpiles", label: "Legacy stockpiles alias" },
  { key: "profiler", label: "Profiler" },
  { key: "simulator", label: "Simulator" },
];

export function RuntimeStatusPanel({
  manifest,
  status,
  repositoryVersion,
}: RuntimeStatusPanelProps) {
  const hasWarnings = status.warnings.length > 0;

  return (
    <div className="runtime-status">
      <section className="panel panel--stack">
        <h3>Contract health</h3>
        <p className="muted-text">
          This surface runs the same server-side loaders the app depends on. It is a
          runtime identity and contract check, not a separate metadata registry.
        </p>
        <InlineNotice
          tone={hasWarnings ? "warning" : "info"}
          title={hasWarnings ? "Runtime check passed with warnings" : "Runtime check passed"}
        >
          {hasWarnings
            ? "The cache is readable, but there are consistency warnings that should be reviewed below."
            : "The current cache passed the latest-only runtime verification path without warnings."}
        </InlineNotice>
        {hasWarnings ? (
          <div className="runtime-status__warning-list">
            {status.warnings.map((warning) => (
              <div key={warning} className="runtime-status__warning-item">
                {warning}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <div className="runtime-status__grid">
        <section className="panel panel--stack">
          <h3>Runtime identity</h3>
          <MetricGrid
            metrics={[
              { label: "Dataset", value: manifest.datasetLabel },
              { label: "Repo version", value: repositoryVersion },
              { label: "Cache version", value: status.manifest.appVersion },
              { label: "Schema", value: status.manifest.schemaVersion },
              { label: "Generated UTC", value: formatTimestamp(manifest.generatedAt) },
              { label: "Latest UTC", value: formatTimestamp(status.manifest.latestTimestamp) },
            ]}
          />
          <div className="runtime-status__path-block">
            <span>Cache root</span>
            <code>{status.root}</code>
          </div>
        </section>

        <section className="panel panel--stack">
          <h3>Route capabilities</h3>
          <div className="runtime-status__chip-grid">
            {capabilityLabels.map((capability) => {
              const enabled = Boolean(manifest.capabilities[capability.key]);
              return (
                <div
                  key={capability.key}
                  className={`runtime-capability-chip ${
                    enabled ? "runtime-capability-chip--enabled" : "runtime-capability-chip--disabled"
                  }`}
                >
                  <span>{capability.label}</span>
                  <strong>{enabled ? "Enabled" : "Disabled"}</strong>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="runtime-status__grid">
        <section className="panel panel--stack">
          <h3>Object registry and graph</h3>
          <MetricGrid
            metrics={[
              { label: "Total objects", value: String(status.registry.total) },
              { label: "Belts", value: String(status.registry.belts) },
              { label: "Piles", value: String(status.registry.piles) },
              { label: "Profiled", value: String(status.registry.profiled) },
              { label: "Stages", value: String(status.circuit.stages) },
              { label: "Edges", value: String(status.circuit.edges) },
            ]}
          />
        </section>

        <section className="panel panel--stack">
          <h3>Payload coverage checked</h3>
          <MetricGrid
            metrics={[
              { label: "Live summaries", value: String(status.live.summaries) },
              { label: "Live belts", value: String(status.live.beltsChecked) },
              { label: "Live piles", value: String(status.live.pilesChecked) },
              { label: "Profiler objects", value: String(status.profiler.objectsChecked) },
              { label: "Profiler snapshots", value: String(status.profiler.snapshotsChecked) },
              { label: "Profiler mode", value: status.profiler.mode },
              { label: "Simulator objects", value: String(status.simulator.objectsChecked) },
              { label: "Simulator steps", value: String(status.simulator.stepsChecked) },
              {
                label: "Simulator outputs",
                value: String(status.simulator.outputSnapshotsChecked),
              },
            ]}
          />
        </section>
      </div>
    </div>
  );
}
