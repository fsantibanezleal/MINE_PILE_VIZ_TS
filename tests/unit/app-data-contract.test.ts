// @vitest-environment node

import path from "node:path";
import os from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getAppManifest,
  getLiveBeltSnapshot,
  getProfilerSummary,
  getStockpileDataset,
} from "@/lib/server/app-data";
import { createSampleAppData } from "@/tests/helpers/app-data-fixture";

let originalCwd = process.cwd();
let tempDir = "";

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "mine-pile-viz-"));
  originalCwd = process.cwd();
  process.chdir(tempDir);
  await createSampleAppData(path.join(tempDir, ".local", "app-data", "v1"));
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

describe("app data contract loaders", () => {
  it("loads manifest and typed datasets from the local cache", async () => {
    const manifest = await getAppManifest();
    const beltSnapshot = await getLiveBeltSnapshot("belt_cv200");
    const stockpile = await getStockpileDataset("pile_stockpile");
    const profilerSummary = await getProfilerSummary();

    expect(manifest.datasetLabel).toBe("Synthetic contract fixture");
    expect(beltSnapshot.blocks).toHaveLength(6);
    expect(stockpile.dimension).toBe(3);
    expect(stockpile.surfaceCells).toHaveLength(3);
    expect(profilerSummary).toHaveLength(4);
  });
});
