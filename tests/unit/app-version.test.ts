import { describe, expect, it } from "vitest";
import packageJson from "@/package.json";
import { APP_VERSION } from "@/lib/app-config";

const VERSION_PATTERN = /^\d\.\d{2}\.\d{3}$/;

describe("app versioning", () => {
  it("uses the fixed-width x.xx.xxx format", () => {
    expect(APP_VERSION).toMatch(VERSION_PATTERN);
    expect(packageJson.version).toMatch(VERSION_PATTERN);
  });

  it("keeps the runtime version aligned with package metadata", () => {
    expect(APP_VERSION).toBe(packageJson.version);
  });
});
