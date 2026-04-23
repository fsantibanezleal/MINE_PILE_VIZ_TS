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
  getQualityDefinitions,
  getSimulatorIndex,
} from "@/lib/server/app-data";
import { describeAppDataError } from "@/lib/server/app-data-errors";

async function loadSimulatorPageState() {
  try {
    const [manifest, graph, index, qualities] = await Promise.all([
      getAppManifest(),
      getCircuitGraph(),
      getSimulatorIndex(),
      getQualityDefinitions(),
    ]);
    assertManifestCapability(manifest, "simulator", "Simulator view");

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
        description="Project future discharge from the latest profiled pile state, keep one pile at the center, and inspect every configured reclaim output simultaneously."
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
        description="Project future discharge from the latest profiled pile state, keep one pile at the center, and inspect every configured reclaim output simultaneously."
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
      description="The simulator route is pile-centered and profiler-based. It starts from the latest real pile state, advances through stored future simulation steps, and keeps every configured feeder/output visible together under the pile."
      actions={
        <MetricGrid
          metrics={[
            { label: "Dataset", value: state.manifest.datasetLabel },
            {
              label: "Pile nodes",
              value: String(state.index.objects.length),
            },
            {
              label: "View focus",
              value: "Pile + all direct outputs",
            },
            {
              label: "Time basis",
              value: "Latest real state + sims",
            },
          ]}
        />
      }
    >
      <RouteIntentPanel
        primaryQuestion="If one pile keeps discharging at the latest measured reclaim rates, what material would leave each configured output over the next simulated steps?"
        uniqueEvidence="A pile-centered simulation view that starts from the latest real profiler state, projects future discharge by configured output, and keeps all reclaim outputs visible together under the pile."
        useWhen="You want to inspect the current profiled pile, compare every feeder/output side by side, and play projected future discharge without leaving the pile view."
        switchWhen="Use Live for dense current state, Profiler for stored history, or Circuit for topology-first reading."
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
