import path from "node:path";

import { createSampleAppData } from "@/tests/helpers/app-data-fixture";

/**
 * Seeds the synthetic app-ready contract cache used by the Playwright e2e run.
 *
 * Playwright starts `webServer` (the managed `pnpm dev`, which runs the app-ready
 * cache preflight) BEFORE `globalSetup` runs, so relying on `globalSetup` to build
 * the fixture leaves a fresh checkout (e.g. CI) without a cache when the server
 * boots and the preflight fails. Building the fixture here, ahead of the server
 * (see `e2e:serve`), makes the preflight pass on a clean machine and in CI.
 */
async function main() {
  const root = path.join(process.cwd(), ".local", "test-app-data", "v1");
  await createSampleAppData(root);
  console.log(`Seeded synthetic e2e app-data fixture at ${root}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
