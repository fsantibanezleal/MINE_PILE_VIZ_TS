// @vitest-environment node

import path from "node:path";
import os from "node:os";
import { mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getAppManifest,
  getLiveBeltSnapshot,
  getObjectRegistry,
  getProfilerSnapshot,
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

  it("derives optional stockpile acceleration layers when the optional files are missing", async () => {
    await unlink(
      path.join(tempDir, ".local", "app-data", "v1", "live", "piles", "pile_stockpile", "surface.arrow"),
    );
    await unlink(
      path.join(tempDir, ".local", "app-data", "v1", "live", "piles", "pile_stockpile", "shell.arrow"),
    );

    const stockpile = await getStockpileDataset("pile_stockpile");

    expect(stockpile.surfaceCells.length).toBeGreaterThan(0);
    expect(stockpile.shellCells.length).toBeGreaterThan(stockpile.surfaceCells.length);
  });

  it("rejects manifest references that escape the app-ready cache root", async () => {
    const manifestPath = path.join(tempDir, ".local", "app-data", "v1", "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      paths: Record<string, string>;
    };
    manifest.paths.registry = "../registry.json";
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

    await expect(getObjectRegistry()).rejects.toMatchObject({
      code: "invalid_reference",
    });
  });

  it("returns a typed contract error for unknown profiler snapshot ids", async () => {
    await expect(getProfilerSnapshot("pile_stockpile", "missing")).rejects.toMatchObject({
      code: "missing_object",
      status: 404,
    });
  });

  it("returns a typed contract error for unknown live belt registrations", async () => {
    await expect(getLiveBeltSnapshot("missing_belt")).rejects.toMatchObject({
      code: "missing_object",
      status: 404,
    });
  });
});
