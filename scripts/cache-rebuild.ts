import path from "node:path";
import { spawn } from "node:child_process";

import {
  buildCacheRebuildEnvironment,
  parseCacheRebuildArgs,
  resolvePythonLaunchSpec,
} from "@/lib/server/app-cache-rebuild";

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});

async function main() {
  const options = parseCacheRebuildArgs(process.argv.slice(2));
  const launchSpec = resolvePythonLaunchSpec();

  if (!launchSpec) {
    throw new Error(
      [
        "No supported Python launcher was found in PATH.",
        "Install Python 3 or set PYTHON_BIN explicitly before running `pnpm cache:rebuild`.",
      ].join("\n"),
    );
  }

  const scriptPath = path.join(process.cwd(), "scripts", "generate_actual_cache.py");
  const child = spawn(
    launchSpec.command,
    [...launchSpec.argsPrefix, scriptPath],
    {
      cwd: process.cwd(),
      env: buildCacheRebuildEnvironment(options),
      stdio: "inherit",
    },
  );

  await new Promise<void>((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          signal
            ? `Cache rebuild was interrupted by signal ${signal}.`
            : `Cache rebuild failed with exit code ${code ?? "unknown"}.`,
        ),
      );
    });
  });
}
