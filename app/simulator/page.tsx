import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { SimulatorWorkspace } from "@/components/simulator/simulator-workspace";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { MetricGrid } from "@/components/ui/metric-grid";
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
import { formatTimestamp } from "@/lib/format";

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
        title="Scenario explorer"
        description="Inspect timestep-oriented scenario states for the modeled circuit from the local app-ready cache."
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
        title="Scenario explorer"
        description="Inspect timestep-oriented scenario states for the modeled circuit from the local app-ready cache."
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
      title="Scenario explorer"
      description="The simulator route turns profiled timestep history into a dedicated scenario workspace so the operator can scrub time, inspect circuit-wide state, and keep object focus anchored while the scenario evolves."
      actions={
        <MetricGrid
          metrics={[
            { label: "Dataset", value: state.manifest.datasetLabel },
            { label: "Profiled objects", value: String(state.index.objects.length) },
            {
              label: "Latest UTC",
              value: formatTimestamp(state.manifest.latestTimestamp),
            },
          ]}
        />
      }
    >
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
