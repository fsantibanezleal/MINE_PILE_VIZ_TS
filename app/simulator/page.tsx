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
        title="Pile discharge simulator"
        description="Inspect pile-centric scenario states from the local app-ready cache and follow configured discharge routes toward downstream transport objects."
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
        description="Inspect pile-centric scenario states from the local app-ready cache and follow configured discharge routes toward downstream transport objects."
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
      description="The simulator route keeps a selected pile or virtual pile at the center, follows a profiled timestep when one exists, and organizes downstream route content by configured discharge output. Today the central pile can be historical while downstream conveyors still come from current live belt snapshots."
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
              label: "Latest UTC",
              value: formatTimestamp(state.manifest.latestTimestamp),
            },
            { label: "Source", value: "Pile snapshot + live routes" },
            { label: "Resolution", value: "Mixed pile detail / live belts" },
            { label: "Time basis", value: "Selected pile step" },
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
