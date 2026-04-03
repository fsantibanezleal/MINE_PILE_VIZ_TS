import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { ProfilerWorkspace } from "@/components/profiler/profiler-workspace";
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
        title="History explorer"
        description="Replay aggregated profiler snapshots through time for circuit and object-level inspection."
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
        title="History explorer"
        description="Replay aggregated profiler snapshots through time for circuit and object-level inspection."
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
      title="History explorer"
      description="Use circuit mode to compare reduced historical summary rows at a selected timestamp, then switch to detail mode to inspect one object's summarized rows, bands, or cells through time. This route is historical summary, not dense live state."
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
        <ProfilerWorkspace
          graph={state.graph}
          index={state.index}
          qualities={state.qualities}
        />
      </Suspense>
    </AppShell>
  );
}
