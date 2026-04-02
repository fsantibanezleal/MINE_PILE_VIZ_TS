import { AppShell } from "@/components/shell/app-shell";
import { LiveWorkspace } from "@/components/live/live-workspace";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { MetricGrid } from "@/components/ui/metric-grid";
import {
  appDataExists,
  getAppManifest,
  getCircuitGraph,
  getLiveBeltSnapshot,
  getLiveObjectSummaries,
  getObjectRegistry,
  getQualityDefinitions,
} from "@/lib/server/app-data";
import { formatTimestamp } from "@/lib/format";

export default async function LivePage() {
  if (!(await appDataExists())) {
    return (
      <AppShell
        eyebrow="Live State"
        title="Current belt and pile state"
        description="Inspect the current runtime snapshot for belts, virtual belts, and accumulation objects from the app-ready cache."
      >
        <DataUnavailable />
      </AppShell>
    );
  }

  const [manifest, graph, summaries, registry, qualities] = await Promise.all([
    getAppManifest(),
    getCircuitGraph(),
    getLiveObjectSummaries(),
    getObjectRegistry(),
    getQualityDefinitions(),
  ]);

  const firstLiveBelt = registry.find((entry) => entry.objectType === "belt" && entry.liveRef);

  if (!firstLiveBelt) {
    return (
      <AppShell
        eyebrow="Live State"
        title="Current belt and pile state"
        description="No live belt snapshots are registered in the app-ready cache."
      >
        <DataUnavailable />
      </AppShell>
    );
  }

  const initialBelt = await getLiveBeltSnapshot(firstLiveBelt.objectId);

  return (
    <AppShell
      eyebrow="Live State"
      title="Current belt and pile state"
      description="The live state page overlays current mass and block content on the process map, then lets you inspect belt arrays block-by-block."
      actions={
        <MetricGrid
          metrics={[
            { label: "Dataset", value: manifest.datasetLabel },
            { label: "Tracked belts", value: String(registry.filter((entry) => entry.objectType === "belt").length) },
            { label: "Latest UTC", value: formatTimestamp(manifest.latestTimestamp) },
          ]}
        />
      }
    >
      <LiveWorkspace
        graph={graph}
        summaries={summaries}
        registry={registry}
        qualities={qualities}
        initialBelt={initialBelt}
      />
    </AppShell>
  );
}
