import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { LiveWorkspace } from "@/components/live/live-workspace";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { MetricGrid } from "@/components/ui/metric-grid";
import { RouteIntentPanel } from "@/components/ui/route-intent-panel";
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
        title="Current belt content"
        description="Inspect dense current belt snapshots without redrawing the circuit."
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
        title="Current belt content"
        description="Inspect dense current belt snapshots without redrawing the circuit."
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
        title="Current belt content"
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
      title="Current belt content"
      description="The live route is dense and instantaneous. It reads current belt snapshots from 06_models and stays focused on the selected transport object instead of redrawing circuit topology."
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
              label: "Current snapshot",
              value: formatTimestamp(state.manifest.latestTimestamp),
            },
          ]}
        />
      }
    >
      <RouteIntentPanel
        primaryQuestion="What is physically present on the selected transport belt right now?"
        uniqueEvidence="Current dense belt blocks from 06_models, shown as an ordered strip plus a mass-weighted histogram for the selected quality or material-time mode."
        useWhen="You need current transport evidence at high resolution and do not want historical playback or another circuit view."
        switchWhen="Use Stockpiles for current dense pile structure, Profiler for summarized history through time, Circuit for topology, or Simulator for pile-centric discharge organization."
      />
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
