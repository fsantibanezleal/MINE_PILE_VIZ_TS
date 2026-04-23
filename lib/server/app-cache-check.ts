import { APP_VERSION } from "@/lib/app-config";
import {
  getAppManifest,
  getCircuitGraph,
  getConfiguredAppDataRoot,
  getLiveBeltSnapshot,
  getLiveObjectSummaries,
  getLivePileDataset,
  getObjectRegistry,
  getProfilerIndex,
  getProfilerObjectManifest,
  getProfilerSnapshot,
  getProfilerSummary,
  getQualityDefinitions,
  getSimulatorIndex,
  getSimulatorObjectManifest,
  getSimulatorStep,
} from "@/lib/server/app-data";

type CacheCheckOptions = {
  includeAllProfilerSnapshots?: boolean;
};

export type AppCacheCheckResult = {
  root: string;
  manifest: {
    schemaVersion: string;
    appVersion: string;
    datasetLabel: string;
    latestTimestamp: string;
  };
  qualitiesCount: number;
  registry: {
    total: number;
    belts: number;
    piles: number;
    profiled: number;
  };
  live: {
    summaries: number;
    beltsChecked: number;
    pilesChecked: number;
  };
  circuit: {
    stages: number;
    nodes: number;
    edges: number;
  };
  profiler: {
    objectsChecked: number;
    summaryRows: number;
    snapshotsChecked: number;
    mode: "latest-only" | "all-snapshots";
  };
  simulator: {
    objectsChecked: number;
    stepsChecked: number;
    outputSnapshotsChecked: number;
  };
  warnings: string[];
};

export async function runAppCacheCheck(
  options: CacheCheckOptions = {},
): Promise<AppCacheCheckResult> {
  const includeAllProfilerSnapshots = options.includeAllProfilerSnapshots ?? false;

  const [
    manifest,
    qualities,
    registry,
    graph,
    liveSummaries,
    profilerIndex,
    profilerSummary,
    simulatorIndex,
  ] =
    await Promise.all([
      getAppManifest(),
      getQualityDefinitions(),
      getObjectRegistry(),
      getCircuitGraph(),
      getLiveObjectSummaries(),
      getProfilerIndex(),
      getProfilerSummary(),
      getSimulatorIndex(),
    ]);

  const liveBeltEntries = registry.filter((entry) => Boolean(entry.liveRef));
  const livePileEntries = registry.filter((entry) =>
    Boolean(entry.livePileRef ?? entry.stockpileRef),
  );

  for (const entry of liveBeltEntries) {
    await getLiveBeltSnapshot(entry.objectId);
  }

  for (const entry of livePileEntries) {
    await getLivePileDataset(entry.objectId);
  }

  let snapshotsChecked = 0;
  for (const entry of profilerIndex.objects) {
    const manifest = await getProfilerObjectManifest(entry.objectId);
    const snapshotIds = includeAllProfilerSnapshots
      ? manifest.snapshotIds
      : [manifest.latestSnapshotId];

    for (const snapshotId of snapshotIds) {
      await getProfilerSnapshot(entry.objectId, snapshotId);
      snapshotsChecked += 1;
    }
  }

  let simulatorStepsChecked = 0;
  let simulatorOutputSnapshotsChecked = 0;
  for (const entry of simulatorIndex.objects) {
    const simulatorManifest = await getSimulatorObjectManifest(entry.objectId);

    for (const step of simulatorManifest.steps) {
      const simulatorStep = await getSimulatorStep(entry.objectId, step.snapshotId);
      simulatorStepsChecked += 1;
      simulatorOutputSnapshotsChecked += Object.keys(simulatorStep.outputSnapshots).length;
    }
  }

  const warnings: string[] = [];
  if (manifest.objectCounts.total !== registry.length) {
    warnings.push(
      `Manifest total object count (${manifest.objectCounts.total}) does not match registry length (${registry.length}).`,
    );
  }

  if (graph.nodes.length !== registry.length) {
    warnings.push(
      `Circuit node count (${graph.nodes.length}) does not match registry length (${registry.length}).`,
    );
  }

  const profiledRegistryCount = registry.filter((entry) => entry.isProfiled).length;
  if (manifest.objectCounts.profiled !== profiledRegistryCount) {
    warnings.push(
      `Manifest profiled count (${manifest.objectCounts.profiled}) does not match profiled registry count (${profiledRegistryCount}).`,
    );
  }

  if (manifest.appVersion !== APP_VERSION) {
    warnings.push(
      `Cache appVersion (${manifest.appVersion}) does not match the current repository version (${APP_VERSION}).`,
    );
  }

  return {
    root: getConfiguredAppDataRoot(),
    manifest: {
      schemaVersion: manifest.schemaVersion,
      appVersion: manifest.appVersion,
      datasetLabel: manifest.datasetLabel,
      latestTimestamp: manifest.latestTimestamp,
    },
    qualitiesCount: qualities.length,
    registry: {
      total: registry.length,
      belts: registry.filter((entry) => entry.objectType === "belt").length,
      piles: registry.filter((entry) => entry.objectType === "pile").length,
      profiled: profiledRegistryCount,
    },
    live: {
      summaries: liveSummaries.length,
      beltsChecked: liveBeltEntries.length,
      pilesChecked: livePileEntries.length,
    },
    circuit: {
      stages: graph.stages.length,
      nodes: graph.nodes.length,
      edges: graph.edges.length,
    },
    profiler: {
      objectsChecked: profilerIndex.objects.length,
      summaryRows: profilerSummary.length,
      snapshotsChecked,
      mode: includeAllProfilerSnapshots ? "all-snapshots" : "latest-only",
    },
    simulator: {
      objectsChecked: simulatorIndex.objects.length,
      stepsChecked: simulatorStepsChecked,
      outputSnapshotsChecked: simulatorOutputSnapshotsChecked,
    },
    warnings,
  };
}
