import { spawnSync } from "node:child_process";

export type PortOwner = {
  pid: number;
  processName?: string;
};

export function detectPortOwner(port: number): PortOwner | null {
  if (process.platform === "win32") {
    const pid = findWindowsListeningPid(port);
    if (!pid) {
      return null;
    }

    return {
      pid,
      processName: findWindowsProcessName(pid),
    };
  }

  const pid = findUnixListeningPid(port);
  if (!pid) {
    return null;
  }

  return {
    pid,
    processName: findUnixProcessName(pid),
  };
}

export function parseWindowsNetstatPid(output: string, port: number): number | null {
  const portPattern = new RegExp(`^\\s*TCP\\s+[^\\s]+:${port}\\s+[^\\s]+\\s+LISTENING\\s+(\\d+)\\s*$`, "im");
  const match = output.match(portPattern);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

export function parseWindowsTasklistProcessName(output: string): string | undefined {
  const firstRow = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith('"'));

  if (!firstRow) {
    return undefined;
  }

  const match = firstRow.match(/^"([^"]+)"/);
  return match?.[1];
}

export function parseUnixPid(output: string): number | null {
  const match = output.match(/^\s*(\d+)\s*$/m);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

export function parseUnixProcessName(output: string): string | undefined {
  const value = output.trim();
  return value.length > 0 ? value : undefined;
}

function findWindowsListeningPid(port: number) {
  const result = spawnSync("netstat", ["-ano", "-p", "tcp"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  return parseWindowsNetstatPid(result.stdout ?? "", port);
}

function findWindowsProcessName(pid: number) {
  const result = spawnSync("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  return parseWindowsTasklistProcessName(result.stdout ?? "");
}

function findUnixListeningPid(port: number) {
  const lsofResult = spawnSync("lsof", ["-ti", `TCP:${port}`, "-sTCP:LISTEN"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  const lsofPid = parseUnixPid(lsofResult.stdout ?? "");
  if (lsofPid) {
    return lsofPid;
  }

  const ssResult = spawnSync("sh", ["-lc", `ss -lptn 'sport = :${port}' | tail -n +2 | sed -E 's/.*pid=([0-9]+).*/\\1/' | head -n 1`], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  return parseUnixPid(ssResult.stdout ?? "");
}

function findUnixProcessName(pid: number) {
  const result = spawnSync("ps", ["-p", String(pid), "-o", "comm="], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  return parseUnixProcessName(result.stdout ?? "");
}
