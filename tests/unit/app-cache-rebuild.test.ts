import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildCacheRebuildEnvironment,
  parseCacheRebuildArgs,
  resolvePythonLaunchSpec,
} from "@/lib/server/app-cache-rebuild";

describe("app-cache-rebuild", () => {
  it("parses supported CLI arguments", () => {
    expect(
      parseCacheRebuildArgs([
        "--root",
        ".local/app-data/v1-alt",
        "--raw-root",
        "D:/data/mine",
      ]),
    ).toEqual({
      appCacheRoot: ".local/app-data/v1-alt",
      rawDataRoot: "D:/data/mine",
    });
  });

  it("rejects unknown CLI arguments", () => {
    expect(() => parseCacheRebuildArgs(["--wat"])).toThrow(
      'Unknown cache rebuild argument "--wat". Use --root <path> and/or --raw-root <path>.',
    );
  });

  it("rejects missing values for CLI arguments", () => {
    expect(() => parseCacheRebuildArgs(["--root"])).toThrow('Missing value for "--root".');
    expect(() => parseCacheRebuildArgs(["--raw-root"])).toThrow(
      'Missing value for "--raw-root".',
    );
  });

  it("uses PYTHON_BIN when it is explicitly configured", () => {
    const launchSpec = resolvePythonLaunchSpec({
      env: { PYTHON_BIN: "C:/Python312/python.exe" },
      exists: () => false,
    });

    expect(launchSpec).toEqual({
      command: "C:/Python312/python.exe",
      argsPrefix: [],
    });
  });

  it("prefers python on Windows when available", () => {
    const launchSpec = resolvePythonLaunchSpec({
      platform: "win32",
      pathEntries: ["C:/Windows", "C:/Python312"],
      exists: (candidate) => candidate === path.join("C:/Python312", "python.exe"),
    });

    expect(launchSpec).toEqual({
      command: "python",
      argsPrefix: [],
    });
  });

  it("falls back to py -3 on Windows when python is not available", () => {
    const launchSpec = resolvePythonLaunchSpec({
      platform: "win32",
      pathEntries: ["C:/Windows", "C:/Python312"],
      exists: (candidate) => candidate === path.join("C:/Windows", "py.exe"),
    });

    expect(launchSpec).toEqual({
      command: "py",
      argsPrefix: ["-3"],
    });
  });

  it("prefers python3 on non-Windows platforms when available", () => {
    const launchSpec = resolvePythonLaunchSpec({
      platform: "linux",
      pathEntries: ["/usr/bin"],
      exists: (candidate) => candidate === path.join("/usr/bin", "python3"),
    });

    expect(launchSpec).toEqual({
      command: "python3",
      argsPrefix: [],
    });
  });

  it("builds cache rebuild environment overrides as absolute paths", () => {
    const env = buildCacheRebuildEnvironment(
      {
        appCacheRoot: ".local/app-data/v1-alt",
        rawDataRoot: "data",
      },
      {},
    );

    expect(env.APP_CACHE_ROOT).toBe(path.resolve(".local/app-data/v1-alt"));
    expect(env.RAW_DATA_ROOT).toBe(path.resolve("data"));
  });
});
