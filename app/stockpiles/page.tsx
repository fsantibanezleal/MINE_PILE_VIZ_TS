import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { StockpileWorkspace } from "@/components/stockpiles/stockpile-workspace";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { MetricGrid } from "@/components/ui/metric-grid";
import { RouteIntentPanel } from "@/components/ui/route-intent-panel";
import {
  appDataExists,
  assertManifestCapability,
  getAppManifest,
  getConfiguredAppDataRoot,
  getObjectRegistry,
  getQualityDefinitions,
} from "@/lib/server/app-data";
import { describeAppDataError } from "@/lib/server/app-data-errors";

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
      description="The stockpile route reads current dense pile inventories as internal structure. Choose a pile and property, then move between column, heatmap, surface, shell, full voxel, and slice representations while keeping the focus on current spatial occupancy and mass distribution."
      actions={
        <MetricGrid
          metrics={[
            { label: "Dataset", value: state.manifest.datasetLabel },
            { label: "Pile objects", value: String(state.pileEntries.length) },
            {
              label: "Structure forms",
              value: "1D, 2D, 3D",
            },
            {
              label: "View focus",
              value: "Current internal structure",
            },
          ]}
        />
      }
    >
      <RouteIntentPanel
        primaryQuestion="What does the inside of one current pile look like when it is read as cells, columns, heatmaps, or voxels?"
        uniqueEvidence="Current dense pile content with property-driven coloring, structure profile metrics, and pile-specific feed and reclaim context across 1D, 2D, and 3D views."
        useWhen="You need to inspect one pile internally and compare how the selected property is distributed through its current occupied structure."
        switchWhen="Use Live for belts, Profiler for historical summary snapshots, Circuit for overall topology, or Simulator for downstream discharge-route context."
      />
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
