import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { LiveRouteWorkspace } from "@/components/live/live-route-workspace";
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
    const pileEntries = registry.filter(
      (entry) =>
        entry.objectType === "pile" && (entry.livePileRef ?? entry.stockpileRef),
    );

    if (!firstLiveBelt && pileEntries.length === 0) {
      return {
        kind: "empty" as const,
        title: "No dense live objects registered",
        description:
          "The live route is enabled, but the object registry does not expose any dense current belt or pile dataset.",
      };
    }

    const initialBelt = firstLiveBelt
      ? await getLiveBeltSnapshot(firstLiveBelt.objectId)
      : null;

    return {
      kind: "ready" as const,
      manifest,
      graph,
      summaries,
      registry,
      qualities,
      initialBelt,
      pileEntries,
      initialPileId: pileEntries[0]?.objectId ?? null,
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
        title="Current dense state"
        description="Inspect dense current belt and pile snapshots without redrawing the circuit."
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
        title="Current dense state"
        description="Inspect dense current belt and pile snapshots without redrawing the circuit."
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
        title="Current dense state"
        description="No current dense belt or pile snapshots are registered in the app-ready cache."
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
      title="Current dense state"
      description="The live route is dense and instantaneous. It reads current belt and pile snapshots from 06_models and keeps the focus on current material content instead of redrawing topology."
      actions={
        <MetricGrid
          metrics={[
            { label: "Dataset", value: state.manifest.datasetLabel },
            {
              label: "Dense belts",
              value: String(
                state.registry.filter(
                  (entry) => entry.objectType === "belt" && entry.liveRef,
                ).length,
              ),
            },
            {
              label: "Dense piles",
              value: String(state.pileEntries.length),
            },
            {
              label: "Latest UTC",
              value: formatTimestamp(state.manifest.latestTimestamp),
            },
          ]}
        />
      }
    >
      <RouteIntentPanel
        primaryQuestion="What is physically present right now inside the current dense transport and accumulation objects?"
        uniqueEvidence="Current dense state from 06_models, split into belt/vbelt and pile/vpile subviews so the operator can inspect either ordered transport content or internal pile structure without opening another circuit view."
        useWhen="You need the latest dense runtime content, not profiler history and not topology-first reading."
        switchWhen="Use Circuit for topology and modeled dependencies, Profiler for summarized history through time, Stockpiles for the pile-only structural route, or Simulator for profiler-based discharge playback."
      />
      <Suspense fallback={<div className="panel">Loading route context...</div>}>
        <LiveRouteWorkspace
          graph={state.graph}
          summaries={state.summaries}
          registry={state.registry}
          qualities={state.qualities}
          initialBelt={state.initialBelt}
          pileEntries={state.pileEntries}
          initialPileId={state.initialPileId}
        />
      </Suspense>
    </AppShell>
  );
}
