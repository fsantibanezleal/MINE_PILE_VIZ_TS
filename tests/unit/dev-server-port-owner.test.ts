import { describe, expect, it } from "vitest";

import {
  parseUnixPid,
  parseUnixProcessName,
  parseWindowsNetstatPid,
  parseWindowsTasklistProcessName,
} from "../../scripts/dev-server-port-owner";

describe("dev-server-port-owner", () => {
  it("parses a Windows netstat PID for the requested port", () => {
    const output = [
      "  TCP    127.0.0.1:3000         0.0.0.0:0              LISTENING       65228",
      "  TCP    127.0.0.1:3001         0.0.0.0:0              LISTENING       12345",
    ].join("\n");

    expect(parseWindowsNetstatPid(output, 3000)).toBe(65228);
    expect(parseWindowsNetstatPid(output, 3001)).toBe(12345);
    expect(parseWindowsNetstatPid(output, 4000)).toBeNull();
  });

  it("parses a Windows tasklist process name", () => {
    const output = '"node.exe","65228","Console","1","98,432 K"';

    expect(parseWindowsTasklistProcessName(output)).toBe("node.exe");
  });

  it("parses a Unix PID", () => {
    expect(parseUnixPid("39920\n")).toBe(39920);
    expect(parseUnixPid("")).toBeNull();
  });

  it("parses a Unix process name", () => {
    expect(parseUnixProcessName("node\n")).toBe("node");
    expect(parseUnixProcessName(" \n")).toBeUndefined();
  });
});
