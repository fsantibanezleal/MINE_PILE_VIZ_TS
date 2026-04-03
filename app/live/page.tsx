import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { LiveWorkspace } from "@/components/live/live-workspace";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { MetricGrid } from "@/components/ui/metric-grid";
import {
  appDataExists,
  assertManifestCapability,
  getAppManifest,
  getCircuitGraph,
  getConfiguredAppDataRoot,
  getLiveBeltSnapshot,
  getLiveObjectSummaries,
  getObjectRegistry,
  getQualityDefinitions,
} from "@/lib/server/app-data";
import { describeAppDataError } from "@/lib/server/app-data-errors";
import { formatTimestamp } from "@/lib/format";

async function loadLivePageState() {
  try {
    const [manifest, graph, summaries, registry, qualities] = await Promise.all([
      getAppManifest(),
      getCircuitGraph(),
      getLiveObjectSummaries(),
      getObjectRegistry(),
      getQualityDefinitions(),
    ]);
    assertManifestCapability(manifest, "live", "Live state view");

    const firstLiveBelt = registry.find(
      (entry) => entry.objectType === "belt" && entry.liveRef,
    );

    if (!firstLiveBelt) {
      return {
        kind: "empty" as const,
        title: "No live belt snapshots registered",
        description:
          "The live route is enabled, but the object registry does not expose any belt with a live snapshot reference.",
      };
    }

    const initialBelt = await getLiveBeltSnapshot(firstLiveBelt.objectId);

    return {
      kind: "ready" as const,
      manifest,
      graph,
      summaries,
      registry,
      qualities,
      initialBelt,
    };
  } catch (error) {
    return {
      kind: "error" as const,
      issue: describeAppDataError(error, {
        fallbackTitle: "Live state unavailable",
        fallbackDescription:
          "The live route could not load the required app-ready runtime files.",
      }),
    };
  }
}

export default async function LivePage() {
  if (!(await appDataExists())) {
    return (
      <AppShell
        eyebrow="Live State"
        title="Current belt and pile state"
        description="Inspect the current runtime snapshot for belts, virtual belts, and accumulation objects from the app-ready cache."
      >
        <DataUnavailable cacheRoot={getConfiguredAppDataRoot()} />
      </AppShell>
    );
  }

  const state = await loadLivePageState();

  if (state.kind === "error") {
    return (
      <AppShell
        eyebrow="Live State"
        title="Current belt and pile state"
        description="Inspect the current runtime snapshot for belts, virtual belts, and accumulation objects from the app-ready cache."
      >
        <DataUnavailable
          title={state.issue.title}
          description={state.issue.description}
          details={state.issue.details}
          cacheRoot={getConfiguredAppDataRoot()}
        />
      </AppShell>
    );
  }

  if (state.kind === "empty") {
    return (
      <AppShell
        eyebrow="Live State"
        title="Current belt and pile state"
        description="No live belt snapshots are registered in the app-ready cache."
      >
        <DataUnavailable
          title={state.title}
          description={state.description}
          cacheRoot={getConfiguredAppDataRoot()}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      eyebrow="Live State"
      title="Current belt and pile state"
      description="The live state page reads current runtime belt snapshots and current object summaries. It is the dense transport-state view for what is on belts now, not a historical replay surface."
      actions={
        <MetricGrid
          metrics={[
            { label: "Dataset", value: state.manifest.datasetLabel },
            {
              label: "Tracked belts",
              value: String(
                state.registry.filter((entry) => entry.objectType === "belt").length,
              ),
            },
            {
              label: "Latest UTC",
              value: formatTimestamp(state.manifest.latestTimestamp),
            },
          ]}
        />
      }
    >
      <Suspense fallback={<div className="panel">Loading route context...</div>}>
        <LiveWorkspace
          graph={state.graph}
          summaries={state.summaries}
          registry={state.registry}
          qualities={state.qualities}
          initialBelt={state.initialBelt}
        />
      </Suspense>
    </AppShell>
  );
}
