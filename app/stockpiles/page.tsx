import { AppShell } from "@/components/shell/app-shell";
import { StockpileWorkspace } from "@/components/stockpiles/stockpile-workspace";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { MetricGrid } from "@/components/ui/metric-grid";
import {
  appDataExists,
  getAppManifest,
  getObjectRegistry,
  getQualityDefinitions,
  getStockpileDataset,
} from "@/lib/server/app-data";
import { formatTimestamp } from "@/lib/format";

export default async function StockpilesPage() {
  if (!(await appDataExists())) {
    return (
      <AppShell
        eyebrow="Stockpiles"
        title="Internal stockpile views"
        description="Inspect 1D, 2D, and 3D pile representations from the app-ready cache."
      >
        <DataUnavailable />
      </AppShell>
    );
  }

  const [manifest, registry, qualities] = await Promise.all([
    getAppManifest(),
    getObjectRegistry(),
    getQualityDefinitions(),
  ]);

  const pileEntries = registry.filter((entry) => entry.objectType === "pile" && entry.stockpileRef);

  if (pileEntries.length === 0) {
    return (
      <AppShell
        eyebrow="Stockpiles"
        title="Internal stockpile views"
        description="No stockpile datasets are registered in the app-ready cache."
      >
        <DataUnavailable />
      </AppShell>
    );
  }

  const initialDataset = await getStockpileDataset(pileEntries[0]!.objectId);

  return (
    <AppShell
      eyebrow="Stockpiles"
      title="Internal stockpile views"
      description="Choose a pile and property, then move between column, heatmap, surface, shell, full voxel, and slice representations depending on dimensionality."
      actions={
        <MetricGrid
          metrics={[
            { label: "Dataset", value: manifest.datasetLabel },
            { label: "Pile objects", value: String(pileEntries.length) },
            { label: "Latest UTC", value: formatTimestamp(manifest.latestTimestamp) },
          ]}
        />
      }
    >
      <StockpileWorkspace
        pileEntries={pileEntries}
        qualities={qualities}
        initialDataset={initialDataset}
      />
    </AppShell>
  );
}
