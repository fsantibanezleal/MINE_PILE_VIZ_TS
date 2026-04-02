import { AppShell } from "@/components/shell/app-shell";
import { CircuitFlow } from "@/components/circuit/circuit-flow";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { MetricGrid } from "@/components/ui/metric-grid";
import {
  appDataExists,
  getAppManifest,
  getCircuitGraph,
  getLiveObjectSummaries,
} from "@/lib/server/app-data";
import { formatTimestamp } from "@/lib/format";

export default async function CircuitPage() {
  if (!(await appDataExists())) {
    return (
      <AppShell
        eyebrow="Circuit"
        title="Modeled process topology"
        description="Inspect the staged flow of transport and accumulation objects from the local app-ready cache."
      >
        <DataUnavailable />
      </AppShell>
    );
  }

  const [manifest, graph, summaries] = await Promise.all([
    getAppManifest(),
    getCircuitGraph(),
    getLiveObjectSummaries(),
  ]);

  return (
    <AppShell
      eyebrow="Circuit"
      title="Modeled process topology"
      description="The circuit page renders the configured object sequence, lets you isolate individual nodes, and exposes current object summaries without reading the original source artifacts."
      actions={
        <MetricGrid
          metrics={[
            { label: "Dataset", value: manifest.datasetLabel },
            { label: "Stages", value: String(graph.stages.length) },
            { label: "Latest UTC", value: formatTimestamp(manifest.latestTimestamp) },
          ]}
        />
      }
    >
      <CircuitFlow graph={graph} summaries={summaries} />
    </AppShell>
  );
}
