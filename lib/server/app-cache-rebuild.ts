import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export type CacheRebuildCliOptions = {
  appCacheRoot?: string;
  rawDataRoot?: string;
};

export type PythonLaunchSpec = {
  command: string;
  argsPrefix: string[];
};

type ResolvePythonCommandOptions = {
  platform?: NodeJS.Platform;
  pathEntries?: string[];
  env?: NodeJS.ProcessEnv;
  exists?: (candidatePath: string) => boolean;
  commandLookup?: (command: string, platform: NodeJS.Platform) => boolean;
};

export function parseCacheRebuildArgs(argv: string[]): CacheRebuildCliOptions {
  const options: CacheRebuildCliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    switch (token) {
      case "--root": {
        const value = argv[index + 1];
        if (!value) {
          throw new Error('Missing value for "--root".');
        }
        options.appCacheRoot = value;
        index += 1;
        break;
      }
      case "--raw-root": {
        const value = argv[index + 1];
        if (!value) {
          throw new Error('Missing value for "--raw-root".');
        }
        options.rawDataRoot = value;
        index += 1;
        break;
      }
      default:
        throw new Error(
          `Unknown cache rebuild argument "${token}". Use --root <path> and/or --raw-root <path>.`,
        );
    }
  }

  return options;
}

export function resolvePythonLaunchSpec(
  options: ResolvePythonCommandOptions = {},
): PythonLaunchSpec | null {
  const platform = options.platform ?? process.platform;
  const pathEntries = options.pathEntries ?? getPathEntries(options.env ?? process.env);
  const exists = options.exists ?? fs.existsSync;
  const hasCustomPathResolution =
    options.pathEntries !== undefined || options.exists !== undefined || options.commandLookup !== undefined;
  const pythonOverride = options.env?.PYTHON_BIN?.trim();

  if (pythonOverride) {
    return {
      command: pythonOverride,
      argsPrefix: [],
    };
  }

  const candidates =
    platform === "win32"
      ? [
          { command: "python", argsPrefix: [] },
          { command: "py", argsPrefix: ["-3"] },
          { command: "python3", argsPrefix: [] },
        ]
      : [
          { command: "python3", argsPrefix: [] },
          { command: "python", argsPrefix: [] },
        ];

  for (const candidate of candidates) {
    if (commandExists(candidate.command, pathEntries, platform, exists, options.commandLookup, hasCustomPathResolution)) {
      return candidate;
    }
  }

  return null;
}

export function buildCacheRebuildEnvironment(
  options: CacheRebuildCliOptions,
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const nextEnv = { ...env };

  if (options.appCacheRoot) {
    nextEnv.APP_CACHE_ROOT = path.resolve(options.appCacheRoot);
  }

  if (options.rawDataRoot) {
    nextEnv.RAW_DATA_ROOT = path.resolve(options.rawDataRoot);
  }

  return nextEnv;
}

function getPathEntries(env: NodeJS.ProcessEnv) {
  const rawPath = env.Path ?? env.PATH ?? "";
  return rawPath
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function commandExists(
  command: string,
  pathEntries: string[],
  platform: NodeJS.Platform,
  exists: (candidatePath: string) => boolean,
  commandLookup?: (command: string, platform: NodeJS.Platform) => boolean,
  hasCustomPathResolution = false,
) {
  if (commandLookup) {
    return commandLookup(command, platform);
  }

  if (!hasCustomPathResolution && isCommandResolvable(command, platform)) {
    return true;
  }

  if (path.isAbsolute(command) && exists(command)) {
    return true;
  }

  const extensions =
    platform === "win32" ? ["", ".exe", ".cmd", ".bat"] : [""];

  return pathEntries.some((entry) =>
    extensions.some((extension) => exists(path.join(entry, `${command}${extension}`))),
  );
}

function isCommandResolvable(command: string, platform: NodeJS.Platform) {
  const lookup = platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(lookup, [command], {
    stdio: "ignore",
    shell: false,
  });

  return result.status === 0;
}
