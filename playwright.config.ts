import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const pnpmCommand =
  process.platform === "win32"
    ? `"${path.join(process.env.APPDATA ?? "", "npm", "pnpm.cmd")}"`
    : "pnpm";
const testAppDataRoot = path.join(process.cwd(), ".local", "test-app-data", "v1");

const windowsPathPrefix =
  process.platform === "win32"
    ? `C:\\Program Files\\nodejs;${path.join(process.env.APPDATA ?? "", "npm")};`
    : "";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `${pnpmCommand} dev`,
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    env: {
      ...process.env,
      APP_DATA_ROOT: testAppDataRoot,
      PATH: `${windowsPathPrefix}${process.env.PATH ?? ""}`,
    },
  },
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
