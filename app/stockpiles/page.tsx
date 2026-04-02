import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { StockpileWorkspace } from "@/components/stockpiles/stockpile-workspace";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { MetricGrid } from "@/components/ui/metric-grid";
import {
  appDataExists,
  assertManifestCapability,
  getAppManifest,
  getConfiguredAppDataRoot,
  getObjectRegistry,
  getQualityDefinitions,
} from "@/lib/server/app-data";
import { describeAppDataError } from "@/lib/server/app-data-errors";
import { formatTimestamp } from "@/lib/format";

async function loadStockpilePageState() {
  try {
    const [manifest, registry, qualities] = await Promise.all([
      getAppManifest(),
      getObjectRegistry(),
      getQualityDefinitions(),
    ]);
    assertManifestCapability(manifest, "stockpiles", "Stockpile view");

    const pileEntries = registry.filter(
      (entry) => entry.objectType === "pile" && entry.stockpileRef,
    );

    if (pileEntries.length === 0) {
      return {
        kind: "empty" as const,
        title: "No stockpile datasets registered",
        description:
          "The stockpile route is enabled, but the object registry does not expose any pile with a stockpile reference.",
      };
    }

    return {
      kind: "ready" as const,
      manifest,
      pileEntries,
      qualities,
      initialPileId: pileEntries[0]!.objectId,
    };
  } catch (error) {
    return {
      kind: "error" as const,
      issue: describeAppDataError(error, {
        fallbackTitle: "Stockpile view unavailable",
        fallbackDescription:
          "The stockpile route could not load the required app-ready files.",
      }),
    };
  }
}

export default async function StockpilesPage() {
  if (!(await appDataExists())) {
    return (
      <AppShell
        eyebrow="Stockpiles"
        title="Internal stockpile views"
        description="Inspect 1D, 2D, and 3D pile representations from the app-ready cache."
      >
        <DataUnavailable cacheRoot={getConfiguredAppDataRoot()} />
      </AppShell>
    );
  }

  const state = await loadStockpilePageState();

  if (state.kind === "error") {
    return (
      <AppShell
        eyebrow="Stockpiles"
        title="Internal stockpile views"
        description="Inspect 1D, 2D, and 3D pile representations from the app-ready cache."
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
        eyebrow="Stockpiles"
        title="Internal stockpile views"
        description="No stockpile datasets are registered in the app-ready cache."
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
      eyebrow="Stockpiles"
      title="Internal stockpile views"
      description="Choose a pile and property, then move between column, heatmap, surface, shell, full voxel, and slice representations depending on dimensionality."
      actions={
        <MetricGrid
          metrics={[
            { label: "Dataset", value: state.manifest.datasetLabel },
            { label: "Pile objects", value: String(state.pileEntries.length) },
            {
              label: "Latest UTC",
              value: formatTimestamp(state.manifest.latestTimestamp),
            },
          ]}
        />
      }
    >
      <Suspense fallback={<div className="panel">Loading route context...</div>}>
        <StockpileWorkspace
          pileEntries={state.pileEntries}
          qualities={state.qualities}
          initialPileId={state.initialPileId}
        />
      </Suspense>
    </AppShell>
  );
}
