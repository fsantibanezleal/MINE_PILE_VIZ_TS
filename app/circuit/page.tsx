import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { CircuitWorkspace } from "@/components/circuit/circuit-workspace";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { InlineNotice } from "@/components/ui/inline-notice";
import { MetricGrid } from "@/components/ui/metric-grid";
import { RouteIntentPanel } from "@/components/ui/route-intent-panel";
import {
  appDataExists,
  assertManifestCapability,
  getAppManifest,
  getCircuitGraph,
  getConfiguredAppDataRoot,
  getLiveObjectSummaries,
} from "@/lib/server/app-data";
import { describeAppDataError } from "@/lib/server/app-data-errors";
import type { ObjectSummary } from "@/types/app-data";

async function loadCircuitPageState() {
  try {
    const [manifest, graph] = await Promise.all([getAppManifest(), getCircuitGraph()]);
    assertManifestCapability(manifest, "circuit", "Circuit view");

    let summariesIssue: ReturnType<typeof describeAppDataError> | null = null;
    let summaries: ObjectSummary[] = [];

    if (manifest.capabilities.live) {
      try {
        summaries = await getLiveObjectSummaries();
      } catch (error) {
        summariesIssue = describeAppDataError(error, {
          fallbackTitle: "Current summaries unavailable",
          fallbackDescription:
            "The topology graph is available, but the live summary files could not be read.",
        });
      }
    }

    return {
      kind: "ready" as const,
      manifest,
      graph,
      summaries,
      summariesIssue,
    };
  } catch (error) {
    return {
      kind: "error" as const,
      issue: describeAppDataError(error, {
        fallbackTitle: "Circuit view unavailable",
        fallbackDescription:
          "The circuit route could not load the required app-ready cache files.",
      }),
    };
  }
}

export default async function CircuitPage() {
  if (!(await appDataExists())) {
    return (
      <AppShell
        eyebrow="Circuit"
        title="Illustrated process overview"
        description="Inspect the staged flow of transport and accumulation objects from the local app-ready cache."
      >
        <DataUnavailable cacheRoot={getConfiguredAppDataRoot()} />
      </AppShell>
    );
  }

  const state = await loadCircuitPageState();

  if (state.kind === "error") {
    return (
      <AppShell
        eyebrow="Circuit"
        title="Illustrated process overview"
        description="Inspect the staged flow of transport and accumulation objects from the local app-ready cache."
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
      eyebrow="Circuit"
      title="Illustrated process overview"
      description="The landing circuit page is the structural reading of the modeled area. It prioritizes illustrative 2D or 3D process context, stage structure, and object relationships while leaving detailed material content to the live, profiler, and simulator routes."
      actions={
        <MetricGrid
          metrics={[
            { label: "Dataset", value: state.manifest.datasetLabel },
            { label: "Stages", value: String(state.graph.stages.length) },
            {
              label: "Modeled objects",
              value: String(state.graph.nodes.length),
            },
            {
              label: "Profiled objects",
              value: String(state.graph.nodes.filter((node) => node.isProfiled).length),
            },
          ]}
        />
      }
    >
      <RouteIntentPanel
        primaryQuestion="How is the modeled circuit organized from stage to stage before looking at material content?"
        uniqueEvidence="Illustrated 2D and 3D circuit placement, stage grouping, object relationships, and configured pile anchor structure."
        useWhen="You need spatial and structural process context, or you want to understand how objects connect through the staged sequence."
        switchWhen="Change to Live for current belt or pile content, Profiler for historical summaries, or Simulator for pile-centric discharge reading."
      />
      {state.summariesIssue ? (
        <InlineNotice tone="warning" title={state.summariesIssue.title}>
          {state.summariesIssue.description}
        </InlineNotice>
      ) : null}
      <Suspense fallback={<div className="panel">Loading route context...</div>}>
        <CircuitWorkspace graph={state.graph} summaries={state.summaries} />
      </Suspense>
    </AppShell>
  );
}
