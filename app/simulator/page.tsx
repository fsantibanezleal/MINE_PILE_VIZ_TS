import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { SimulatorWorkspace } from "@/components/simulator/simulator-workspace";
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

async function loadSimulatorPageState() {
  try {
    const [manifest, graph, index, qualities] = await Promise.all([
      getAppManifest(),
      getCircuitGraph(),
      getProfilerIndex(),
      getQualityDefinitions(),
    ]);
    assertManifestCapability(manifest, "profiler", "Simulator view");

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
        fallbackTitle: "Simulator view unavailable",
        fallbackDescription:
          "The simulator route could not load the required app-ready scenario inputs.",
      }),
    };
  }
}

export default async function SimulatorPage() {
  if (!(await appDataExists())) {
    return (
      <AppShell
        eyebrow="Simulator"
        title="Pile discharge simulator"
        description="Inspect one pile-centric discharge scenario from the local app-ready cache and follow its profiled reclaim routes toward downstream transport objects."
      >
        <DataUnavailable cacheRoot={getConfiguredAppDataRoot()} />
      </AppShell>
    );
  }

  const state = await loadSimulatorPageState();

  if (state.kind === "error") {
    return (
      <AppShell
        eyebrow="Simulator"
        title="Pile discharge simulator"
        description="Inspect one pile-centric discharge scenario from the local app-ready cache and follow its profiled reclaim routes toward downstream transport objects."
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
      eyebrow="Simulator"
      title="Pile discharge simulator"
      description="The simulator route is profiler-only and route-first. It keeps one selected pile or virtual pile as the route anchor, follows one stored profiler timestep, and organizes downstream discharge content by configured reclaim output."
      actions={
        <MetricGrid
          metrics={[
            { label: "Dataset", value: state.manifest.datasetLabel },
            {
              label: "Pile nodes",
              value: String(
                state.graph.nodes.filter((node) => node.objectType === "pile").length,
              ),
            },
            {
              label: "Route focus",
              value: "Pile-centered discharge",
            },
            {
              label: "Time basis",
              value: "Selected profiler snapshot",
            },
          ]}
        />
      }
    >
      <RouteIntentPanel
        primaryQuestion="If one pile is the center of attention, how do its configured outputs organize downstream route content?"
        uniqueEvidence="Pile-centric discharge structure that keeps one pile as the route anchor, splits outputs by configured reclaim route, and keeps downstream profiled transport context aligned to the selected stored timestep."
        useWhen="You want to reason about pile discharge structure, grouped reclaim routes, and downstream transport context from the perspective of one selected profiled pile or virtual pile."
        switchWhen="Use Live for pure current belt or pile reading, Profiler for historical summaries, or Circuit for the full staged topology."
      />
      <Suspense fallback={<div className="panel">Loading route context...</div>}>
        <SimulatorWorkspace
          graph={state.graph}
          index={state.index}
          qualities={state.qualities}
        />
      </Suspense>
    </AppShell>
  );
}
