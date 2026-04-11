import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { detectPortOwner } from "./dev-server-port-owner";
import { runAppCacheCheck } from "@/lib/server/app-cache-check";
import { AppDataContractError } from "@/lib/server/app-data-errors";

type Command = "start" | "status" | "stop" | "restart";

type DevServerState = {
  pid: number;
  port: number;
  cwd: string;
  startedAt: string;
};

const repoRoot = process.cwd();
const localDir = path.join(repoRoot, ".local");
const statePath = path.join(localDir, "dev-server.state.json");
const defaultPort = parsePort(process.env.PORT);
const command = (process.argv[2] as Command | undefined) ?? "start";

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});

async function main() {
  switch (command) {
    case "start":
      await startServer();
      break;
    case "status":
      await printStatus();
      break;
    case "stop":
      await stopServer();
      break;
    case "restart":
      await stopServer();
      await startServer();
      break;
    default:
      throw new Error(
        `Unknown dev-server command "${command}". Use start, status, stop, or restart.`,
      );
  }
}

async function startServer() {
  const currentState = loadState();
  if (currentState && isProcessAlive(currentState.pid)) {
    console.log(
      [
        "A repo-managed Next dev server is already running.",
        "",
        `- Local:        http://127.0.0.1:${currentState.port}`,
        `- PID:          ${currentState.pid}`,
        `- Dir:          ${currentState.cwd}`,
        `- Started:      ${currentState.startedAt}`,
        "",
        "Run `pnpm dev:stop` to stop it or `pnpm dev:restart` to replace it.",
      ].join("\n"),
    );
    return;
  }

  if (currentState) {
    removeState();
  }

  if (!shouldSkipAppCacheCheck()) {
    await runDevCachePreflight();
  }

  const portAvailable = await isPortAvailable(defaultPort);
  if (!portAvailable) {
    const portOwner = detectPortOwner(defaultPort);
    console.error(
      [
        `Port ${defaultPort} is already in use.`,
        portOwner
          ? `- Occupied by:  PID ${portOwner.pid}${portOwner.processName ? ` (${portOwner.processName})` : ""}`
          : "- Occupied by:  unknown local process",
        "",
        "This repo now keeps `pnpm dev` pinned to one explicit port to avoid the ambiguous",
        "double-server state that Next reports when it silently shifts to another port.",
        "",
        `- Expected local URL: http://127.0.0.1:${defaultPort}`,
        "",
        "Use one of these commands:",
        "- `pnpm dev:status` to inspect the repo-managed dev server state",
        "- `pnpm dev:stop` to stop the repo-managed dev server if it is the one holding the port",
        "- `PORT=3001 pnpm dev` (PowerShell: `$env:PORT=3001; pnpm dev`) if you intentionally want another port",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(localDir, { recursive: true });

  const nextBin = require.resolve("next/dist/bin/next");
  const child = spawn(process.execPath, [nextBin, "dev", "--port", String(defaultPort)], {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
  });

  const state: DevServerState = {
    pid: child.pid ?? 0,
    port: defaultPort,
    cwd: repoRoot,
    startedAt: new Date().toISOString(),
  };

  if (!state.pid) {
    throw new Error("Failed to start the Next dev server process.");
  }

  saveState(state);

  const forwardSignal = () => {
    terminateProcessTree(state.pid);
  };

  process.on("SIGINT", forwardSignal);
  process.on("SIGTERM", forwardSignal);

  await new Promise<void>((resolve) => {
    child.on("exit", () => {
      removeStateIfOwnedBy(state.pid);
      resolve();
    });
  });
}

async function runDevCachePreflight() {
  try {
    const result = await runAppCacheCheck();

    if (result.warnings.length > 0) {
      console.log(
        [
          "App-ready cache preflight passed with warnings.",
          ...result.warnings.map((warning) => `- ${warning}`),
          "",
        ].join("\n"),
      );
    }
  } catch (error) {
    if (error instanceof AppDataContractError) {
      console.error(
        [
          "App-ready cache preflight failed.",
          error.title,
          error.message,
          ...(error.relativePath ? [`Affected path: ${error.relativePath}`] : []),
          ...error.details.map((detail) => `- ${detail}`),
          "",
          "Run `pnpm cache:check` for a repo-owned contract check before starting the app again.",
          "Use `SKIP_APP_CACHE_CHECK=1 pnpm dev` only if you intentionally need to bypass the preflight.",
        ].join("\n"),
      );
      process.exitCode = 1;
      process.exit();
    }

    throw error;
  }
}

async function printStatus() {
  const currentState = loadState();
  const portAvailable = await isPortAvailable(defaultPort);

  if (currentState && isProcessAlive(currentState.pid)) {
    console.log(
      [
        "Repo-managed Next dev server is running.",
        "",
        `- Local:        http://127.0.0.1:${currentState.port}`,
        `- PID:          ${currentState.pid}`,
        `- Dir:          ${currentState.cwd}`,
        `- Started:      ${currentState.startedAt}`,
      ].join("\n"),
    );
    return;
  }

  if (currentState) {
    removeState();
    console.log("Removed stale repo-managed dev server state.");
  }

  if (!portAvailable) {
    console.log(
      [
        `Port ${defaultPort} is currently occupied, but there is no repo-managed state file for this workspace.`,
        describePortOwner(defaultPort),
        "Another local process is likely using the port.",
      ].join("\n"),
    );
    return;
  }

  console.log(`No repo-managed Next dev server is running on port ${defaultPort}.`);
}

async function stopServer() {
  const currentState = loadState();
  if (!currentState) {
    console.log("No repo-managed Next dev server state was found.");
    return;
  }

  if (!isProcessAlive(currentState.pid)) {
    removeState();
    console.log("Removed stale repo-managed dev server state.");
    return;
  }

  console.log(`Stopping repo-managed Next dev server ${currentState.pid}...`);
  terminateProcessTree(currentState.pid);
  await waitForProcessExit(currentState.pid, 5_000);
  removeStateIfOwnedBy(currentState.pid);
  console.log("Repo-managed Next dev server stopped.");
}

function loadState(): DevServerState | null {
  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(statePath, "utf8")) as DevServerState;
  } catch {
    removeState();
    return null;
  }
}

function saveState(state: DevServerState) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function removeState() {
  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
  }
}

function removeStateIfOwnedBy(pid: number) {
  const currentState = loadState();
  if (currentState?.pid === pid) {
    removeState();
  }
}

function isProcessAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function terminateProcessTree(pid: number) {
  if (!isProcessAlive(pid)) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    process.kill(pid, "SIGTERM");
  }
}

async function waitForProcessExit(pid: number, timeoutMs: number) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (!isProcessAlive(pid)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

function parsePort(rawPort: string | undefined) {
  const parsed = Number(rawPort ?? "3000");
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return 3000;
  }

  return parsed;
}

function shouldSkipAppCacheCheck() {
  return process.env.SKIP_APP_CACHE_CHECK === "1";
}

function isPortAvailable(port: number) {
  return new Promise<boolean>((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, "127.0.0.1");
  });
}

function describePortOwner(port: number) {
  const portOwner = detectPortOwner(port);
  if (!portOwner) {
    return "- Occupied by:  unknown local process";
  }

  return `- Occupied by:  PID ${portOwner.pid}${portOwner.processName ? ` (${portOwner.processName})` : ""}`;
}
