import { AppShell } from "@/components/shell/app-shell";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { MetricGrid } from "@/components/ui/metric-grid";
import { RuntimeStatusPanel } from "@/components/ui/runtime-status-panel";
import {
  appDataExists,
  getAppManifest,
  getConfiguredAppDataRoot,
} from "@/lib/server/app-data";
import { runAppCacheCheck } from "@/lib/server/app-cache-check";
import { describeAppDataError } from "@/lib/server/app-data-errors";
import { APP_VERSION } from "@/lib/app-config";
import { formatTimestamp } from "@/lib/format";

async function loadDiagnosticsState() {
  try {
    const [manifest, status] = await Promise.all([
      getAppManifest(),
      runAppCacheCheck({ includeAllProfilerSnapshots: false }),
    ]);

    return {
      kind: "ready" as const,
      manifest,
      status,
    };
  } catch (error) {
    return {
      kind: "error" as const,
      issue: describeAppDataError(error, {
        fallbackTitle: "Diagnostics unavailable",
        fallbackDescription:
          "The diagnostic surface could not load the current runtime metadata and cache status.",
      }),
    };
  }
}

export default async function DiagnosticsPage() {
  if (!(await appDataExists())) {
    return (
      <AppShell
        eyebrow="Diagnostics"
        title="Runtime and dataset status"
        description="Inspect runtime identity, dataset versioning, and cache contract health outside the operator workflows."
      >
        <DataUnavailable cacheRoot={getConfiguredAppDataRoot()} />
      </AppShell>
    );
  }

  const state = await loadDiagnosticsState();

  if (state.kind === "error") {
    return (
      <AppShell
        eyebrow="Diagnostics"
        title="Runtime and dataset status"
        description="Inspect runtime identity, dataset versioning, and cache contract health outside the operator workflows."
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
      eyebrow="Diagnostics"
      title="Runtime and dataset status"
      description="This page is diagnostic by design. It exposes the active cache identity, route capabilities, and loader-based contract health without adding operational noise to Circuit, Live, Profiler, or Simulator."
      actions={
        <MetricGrid
          metrics={[
            { label: "Dataset", value: state.manifest.datasetLabel },
            { label: "Repo version", value: APP_VERSION },
            { label: "Cache version", value: state.status.manifest.appVersion },
            { label: "Latest UTC", value: formatTimestamp(state.manifest.latestTimestamp) },
          ]}
        />
      }
    >
      <RuntimeStatusPanel
        manifest={state.manifest}
        status={state.status}
        repositoryVersion={APP_VERSION}
      />
    </AppShell>
  );
}
