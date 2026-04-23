import { AppDataContractError } from "@/lib/server/app-data-errors";
import { runAppCacheCheck } from "@/lib/server/app-cache-check";

const includeAllProfilerSnapshots = process.argv.includes("--deep");
const outputJson = process.argv.includes("--json");

void main().catch((error: unknown) => {
  if (error instanceof AppDataContractError) {
    const payload = {
      code: error.code,
      title: error.title,
      message: error.message,
      relativePath: error.relativePath ?? null,
      details: error.details ?? [],
    };

    if (outputJson) {
      console.error(JSON.stringify(payload, null, 2));
    } else {
      console.error(`${error.title}\n${error.message}`);
      if (error.relativePath) {
        console.error(`Affected path: ${error.relativePath}`);
      }

      for (const detail of error.details ?? []) {
        console.error(`- ${detail}`);
      }
    }

    process.exitCode = 1;
    return;
  }

  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});

async function main() {
  const result = await runAppCacheCheck({ includeAllProfilerSnapshots });

  if (outputJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log("App-ready cache check passed.");
  console.log("");
  console.log(`- Root:                 ${result.root}`);
  console.log(`- Dataset:              ${result.manifest.datasetLabel}`);
  console.log(`- App version:          ${result.manifest.appVersion}`);
  console.log(`- Schema version:       ${result.manifest.schemaVersion}`);
  console.log(`- Latest timestamp:     ${result.manifest.latestTimestamp}`);
  console.log(`- Qualities:            ${result.qualitiesCount}`);
  console.log(
    `- Registry:             ${result.registry.total} total (${result.registry.belts} belts, ${result.registry.piles} piles, ${result.registry.profiled} profiled)`,
  );
  console.log(
    `- Live payloads:        ${result.live.summaries} summaries, ${result.live.beltsChecked} belts, ${result.live.pilesChecked} piles`,
  );
  console.log(
    `- Circuit graph:        ${result.circuit.stages} stages, ${result.circuit.nodes} nodes, ${result.circuit.edges} edges`,
  );
  console.log(
    `- Profiler payloads:    ${result.profiler.objectsChecked} objects, ${result.profiler.summaryRows} summary rows, ${result.profiler.snapshotsChecked} snapshots (${result.profiler.mode})`,
  );
  console.log(
    `- Simulator payloads:   ${result.simulator.objectsChecked} objects, ${result.simulator.stepsChecked} steps, ${result.simulator.outputSnapshotsChecked} output snapshots`,
  );

  if (result.warnings.length > 0) {
    console.log("");
    console.log("Warnings:");
    for (const warning of result.warnings) {
      console.log(`- ${warning}`);
    }
  }
}
