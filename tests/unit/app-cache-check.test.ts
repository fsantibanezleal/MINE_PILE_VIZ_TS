// @vitest-environment node

import path from "node:path";
import os from "node:os";
import { mkdtemp, rm, unlink } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runAppCacheCheck } from "@/lib/server/app-cache-check";
import { createSampleAppData } from "@/tests/helpers/app-data-fixture";

let originalCwd = process.cwd();
let tempDir = "";

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "mine-pile-viz-cache-check-"));
  originalCwd = process.cwd();
  process.chdir(tempDir);
  await createSampleAppData(path.join(tempDir, ".local", "app-data", "v1"));
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

describe("app cache check", () => {
  it("validates the synthetic fixture with latest profiler snapshots", async () => {
    const result = await runAppCacheCheck();

    expect(result.manifest.datasetLabel).toBe("Synthetic contract fixture");
    expect(result.live.beltsChecked).toBe(2);
    expect(result.live.pilesChecked).toBe(3);
    expect(result.profiler.objectsChecked).toBe(2);
    expect(result.profiler.snapshotsChecked).toBe(2);
    expect(result.profiler.mode).toBe("latest-only");
    expect(result.simulator.objectsChecked).toBe(1);
    expect(result.simulator.stepsChecked).toBe(2);
    expect(result.simulator.outputSnapshotsChecked).toBe(4);
    expect(result.warnings).toHaveLength(0);
  });

  it("can validate all registered profiler snapshots in deep mode", async () => {
    const result = await runAppCacheCheck({ includeAllProfilerSnapshots: true });

    expect(result.profiler.snapshotsChecked).toBe(4);
    expect(result.profiler.mode).toBe("all-snapshots");
  });

  it("fails when a required dense pile file is missing", async () => {
    await unlink(
      path.join(
        tempDir,
        ".local",
        "app-data",
        "v1",
        "live",
        "piles",
        "pile_stockpile",
        "cells.arrow",
      ),
    );

    await expect(runAppCacheCheck()).rejects.toMatchObject({
      code: "missing_file",
      relativePath: "live/piles/pile_stockpile/cells.arrow",
    });
  });
});
