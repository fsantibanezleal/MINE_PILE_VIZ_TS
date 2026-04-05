import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { ProfilerWorkspace } from "@/components/profiler/profiler-workspace";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { MetricGrid } from "@/components/ui/metric-grid";
import { RouteIntentPanel } from "@/components/ui/route-intent-panel";
import {
  appDataExists,
  assertManifestCapability,
  getAppManifest,
  getCircuitGraph,
  getConfiguredAppDataRoot,
  getProfilerIndex,
  getQualityDefinitions,
} from "@/lib/server/app-data";
import { describeAppDataError } from "@/lib/server/app-data-errors";

async function loadProfilerPageState() {
  try {
    const [manifest, graph, index, qualities] = await Promise.all([
      getAppManifest(),
      getCircuitGraph(),
      getProfilerIndex(),
      getQualityDefinitions(),
    ]);
    assertManifestCapability(manifest, "profiler", "Profiler view");

    return {
      kind: "ready" as const,
      manifest,
      graph,
      index,
      qualities,
    };
  } catch (error) {
    return {
      kind: "error" as const,
      issue: describeAppDataError(error, {
        fallbackTitle: "Profiler view unavailable",
        fallbackDescription:
          "The profiler route could not load the required app-ready history files.",
      }),
    };
  }
}

export default async function ProfilerPage() {
  if (!(await appDataExists())) {
    return (
      <AppShell
        eyebrow="Profiler"
        title="Historical object explorer"
        description="Replay summarized profiler snapshots through time for one selected object."
      >
        <DataUnavailable cacheRoot={getConfiguredAppDataRoot()} />
      </AppShell>
    );
  }

  const state = await loadProfilerPageState();

  if (state.kind === "error") {
    return (
      <AppShell
        eyebrow="Profiler"
        title="Historical object explorer"
        description="Replay summarized profiler snapshots through time for one selected object."
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

  return (
    <AppShell
      eyebrow="Profiler"
      title="Historical object explorer"
      description="The profiler route is object-and-time first. It reads only summarized history from 08_reporting so one selected MTO can be inspected through its stored snapshots, its summarized content view, and its selected-quality series."
      actions={
        <MetricGrid
          metrics={[
            { label: "Dataset", value: state.manifest.datasetLabel },
            { label: "Profiled objects", value: String(state.index.objects.length) },
            {
              label: "Source",
              value: "08_reporting",
            },
            {
              label: "Reading basis",
              value: "Historical summaries",
            },
          ]}
        />
      }
    >
      <RouteIntentPanel
        primaryQuestion="How does one profiled object's summarized content change through time?"
        uniqueEvidence="Historical profiler snapshots from 08_reporting, shown as one selected summarized object view plus a time series for the selected quality and explicit snapshot-to-snapshot deltas."
        useWhen="You need historical playback, snapshot comparison, or trend reading for one profiled belt or pile."
        switchWhen="Use Live for current dense belt content, Stockpiles for current dense pile structure, Circuit for topology, or Simulator for pile-centric discharge organization."
      />
      <Suspense fallback={<div className="panel">Loading route context...</div>}>
        <ProfilerWorkspace
          graph={state.graph}
          index={state.index}
          qualities={state.qualities}
        />
      </Suspense>
    </AppShell>
  );
}
