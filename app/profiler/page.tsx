import { AppShell } from "@/components/shell/app-shell";
import { ProfilerWorkspace } from "@/components/profiler/profiler-workspace";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { MetricGrid } from "@/components/ui/metric-grid";
import {
  appDataExists,
  getAppManifest,
  getCircuitGraph,
  getProfilerIndex,
  getProfilerSummary,
  getQualityDefinitions,
} from "@/lib/server/app-data";
import { formatTimestamp } from "@/lib/format";

export default async function ProfilerPage() {
  if (!(await appDataExists())) {
    return (
      <AppShell
        eyebrow="Profiler"
        title="History explorer"
        description="Replay aggregated profiler snapshots through time for circuit and object-level inspection."
      >
        <DataUnavailable />
      </AppShell>
    );
  }

  const [manifest, graph, index, summaryRows, qualities] = await Promise.all([
    getAppManifest(),
    getCircuitGraph(),
    getProfilerIndex(),
    getProfilerSummary(),
    getQualityDefinitions(),
  ]);

  return (
    <AppShell
      eyebrow="Profiler"
      title="History explorer"
      description="Use circuit mode to compare profiled objects at a selected timestamp, then switch to detail mode to inspect the aggregated content of a single object through time."
      actions={
        <MetricGrid
          metrics={[
            { label: "Dataset", value: manifest.datasetLabel },
            { label: "Profiled objects", value: String(index.objects.length) },
            { label: "Latest UTC", value: formatTimestamp(manifest.latestTimestamp) },
          ]}
        />
      }
    >
      <ProfilerWorkspace
        graph={graph}
        index={index}
        summaryRows={summaryRows}
        qualities={qualities}
      />
    </AppShell>
  );
}
