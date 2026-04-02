import { AppShell } from "@/components/shell/app-shell";
import { CircuitFlow } from "@/components/circuit/circuit-flow";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { InlineNotice } from "@/components/ui/inline-notice";
import { MetricGrid } from "@/components/ui/metric-grid";
import {
  appDataExists,
  assertManifestCapability,
  getAppManifest,
  getCircuitGraph,
  getConfiguredAppDataRoot,
  getLiveObjectSummaries,
} from "@/lib/server/app-data";
import { describeAppDataError } from "@/lib/server/app-data-errors";
import { formatTimestamp } from "@/lib/format";
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
        title="Modeled process topology"
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
        title="Modeled process topology"
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
      title="Modeled process topology"
      description="The circuit page renders the configured object sequence, lets you isolate individual nodes, and exposes current object summaries without reading the original source artifacts."
      actions={
        <MetricGrid
          metrics={[
            { label: "Dataset", value: state.manifest.datasetLabel },
            { label: "Stages", value: String(state.graph.stages.length) },
            {
              label: "Latest UTC",
              value: formatTimestamp(state.manifest.latestTimestamp),
            },
          ]}
        />
      }
    >
      {state.summariesIssue ? (
        <InlineNotice tone="warning" title={state.summariesIssue.title}>
          {state.summariesIssue.description}
        </InlineNotice>
      ) : null}
      <CircuitFlow graph={state.graph} summaries={state.summaries} />
    </AppShell>
  );
}
