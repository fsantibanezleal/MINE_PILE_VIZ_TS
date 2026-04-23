import crypto from "node:crypto";
import { expect, test } from "@playwright/test";

test("loads the primary pages with the synthetic contract cache", async ({ page }) => {
  const reactFlowContainerWarnings: string[] = [];

  page.on("console", (message) => {
    const text = message.text();

    if (
      text.includes("reactflow.dev/error#004") ||
      text.includes("React Flow parent container needs a width and a height")
    ) {
      reactFlowContainerWarnings.push(text);
    }
  });

  await page.goto("/circuit");
  await expect(
    page.getByRole("heading", { name: "Illustrated process overview" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Illustration 2D" })).toBeVisible();
  await expect(
    page.getByLabel("Illustrated circuit overview").getByText("Plant Stockpile"),
  ).toBeVisible();

  await page.getByRole("link", { name: "Live State", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Current belt and pile state" }),
  ).toBeVisible();
  await expect(page.getByText("Current belt content", { exact: true })).toBeVisible();
  await expect(page.getByText("Mass-weighted histogram")).toBeVisible();

  await page.getByRole("link", { name: "Profiler", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Historical object explorer" }),
  ).toBeVisible();
  await expect(page.getByText("Profiled object and time", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Diagnostics" }).click();
  await expect(
    page.getByRole("heading", { name: "Runtime and dataset status" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Runtime identity" })).toBeVisible();
  await expect(page.getByText("Synthetic contract fixture").first()).toBeVisible();
  expect(reactFlowContainerWarnings).toEqual([]);
});

test("persists the selected application theme across route navigation", async ({ page }) => {
  await page.goto("/circuit");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: "Toggle application theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByRole("link", { name: "Live State", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("updates stockpile 3D colors when the selected property changes", async ({
  page,
}) => {
  const deprecatedThreeClockWarnings: string[] = [];

  page.on("console", (message) => {
    const text = message.text();

    if (text.includes("THREE.Clock: This module has been deprecated")) {
      deprecatedThreeClockWarnings.push(text);
    }
  });

  await page.goto("/live?view=piles");
  await expect(
    page.getByRole("heading", { name: "Current belt and pile state" }),
  ).toBeVisible();

  const pileSelect = page.locator('label:has-text("Pile") select').first();
  const propertySelect = page.locator('label:has-text("Quality") select').first();
  const canvas = page.locator(".pile-canvas canvas").first();

  await pileSelect.selectOption("pile_stockpile");
  await canvas.waitFor({ state: "visible" });
  await page.waitForTimeout(800);

  const before = await canvas.screenshot();
  const beforeHash = crypto.createHash("sha256").update(before).digest("hex");

  await propertySelect.selectOption("q_cat_materialtype_main");
  await page.waitForTimeout(800);

  const after = await canvas.screenshot();
  const afterHash = crypto.createHash("sha256").update(after).digest("hex");

  expect(afterHash).not.toBe(beforeHash);
  expect(deprecatedThreeClockWarnings).toEqual([]);
});

test("compresses the vertical scale of 3D pile views", async ({ page }) => {
  await page.goto("/live?view=piles");
  await expect(
    page.getByRole("heading", { name: "Current belt and pile state" }),
  ).toBeVisible();

  const pileSelect = page.locator('label:has-text("Pile") select').first();
  const factorInput = page.getByLabel("Vertical compression factor");
  const canvas = page.locator(".pile-canvas canvas").first();

  await pileSelect.selectOption("pile_stockpile");
  await canvas.waitFor({ state: "visible" });
  await page.waitForTimeout(800);

  const before = await canvas.screenshot();
  const beforeHash = crypto.createHash("sha256").update(before).digest("hex");

  await factorInput.fill("25");
  await factorInput.blur();
  await page.waitForTimeout(800);

  const after = await canvas.screenshot();
  const afterHash = crypto.createHash("sha256").update(after).digest("hex");

  expect(afterHash).not.toBe(beforeHash);
  await expect(page.getByText("Effective vertical scale: 1 / 25")).toBeVisible();
});

test("preserves object and property context when moving between routed workspaces", async ({
  page,
}) => {
  await page.goto("/live?view=piles&object=pile_stockpile&quality=q_num_cut");
  await expect(
    page.locator('label:has-text("Pile") select').first(),
  ).toHaveValue("pile_stockpile");
  await expect(
    page.locator('label:has-text("Quality") select').first(),
  ).toHaveValue("q_num_cut");

  await page.getByRole("link", { name: "Profiler", exact: true }).click();
  await expect(page).toHaveURL(/\/profiler\?view=piles&object=pile_stockpile&quality=q_num_cut$/);
  await expect(
    page.locator('label:has-text("Object") select').first(),
  ).toHaveValue("pile_stockpile");
  await expect(
    page.locator('label:has-text("Quality") select').first(),
  ).toHaveValue("q_num_cut");
});

test("opens related workspaces from inspection panels with preserved context", async ({
  page,
}) => {
  await page.goto("/circuit?object=pile_stockpile&quality=q_num_cut");
  await expect(page.getByRole("link", { name: "Open Live State" })).toBeVisible();

  await page.getByRole("link", { name: "Open Live State" }).click();
  await expect(page).toHaveURL(/\/live\?object=pile_stockpile&quality=q_num_cut&view=piles$/);
  await expect(
    page.locator('label:has-text("Pile") select').first(),
  ).toHaveValue("pile_stockpile");

  await page.getByRole("link", { name: "Open Profiler" }).click();
  await expect(page).toHaveURL(/\/profiler\?object=pile_stockpile&quality=q_num_cut&view=piles$|\/profiler\?view=piles&object=pile_stockpile&quality=q_num_cut$/);
  await expect(
    page.locator('label:has-text("Object") select').first(),
  ).toHaveValue("pile_stockpile");
  await expect(
    page.locator('label:has-text("Quality") select').first(),
  ).toHaveValue("q_num_cut");
});

test("shows every configured pile anchor in the 2D circuit illustration", async ({
  page,
}) => {
  await page.goto("/circuit?object=pile_stockpile");

  const selectedPile = page.locator(".circuit-illustration__object--selected");

  await expect(selectedPile.locator(".circuit-illustration__feed-marker")).toHaveCount(2);
  await expect(selectedPile.locator(".circuit-illustration__discharge-marker")).toHaveCount(2);
});

test("keeps the selected circuit object highlighted across illustration and diagram modes", async ({
  page,
}) => {
  await page.goto("/circuit?object=pile_stockpile");
  await expect(
    page.locator(".circuit-illustration__object--selected"),
  ).toContainText("Plant Stockpile");

  await page.getByRole("button", { name: "Diagram" }).click();
  await expect(page.getByTestId("circuit-stage-3")).toContainText("Accumulation");
  await expect(page.locator(".circuit-node--selected")).toContainText("Plant Stockpile");
});

test("shows configured anchor inventory details for the selected pile in the circuit inspector", async ({
  page,
}) => {
  await page.goto("/circuit?object=pile_stockpile");
  const inspector = page.locator(".panel--inspector");

  await expect(inspector.getByText("Feed anchors (2)")).toBeVisible();
  await expect(inspector.getByText("Feed point west")).toBeVisible();
  await expect(inspector.getByText("Feed point east")).toBeVisible();
  await expect(inspector.getByText("CV 200").first()).toBeVisible();
  await expect(inspector.getByText("Discharge anchors (2)")).toBeVisible();
  await expect(inspector.getByText("Reclaim west")).toBeVisible();
  await expect(inspector.getByText("Reclaim east")).toBeVisible();
  await expect(inspector.getByText("Virtual Outflow Mixer").first()).toBeVisible();
});

test("shows stockpile feed and discharge anchors on the pile view", async ({
  page,
}) => {
  await page.goto("/live?view=piles&object=pile_stockpile");

  await expect(page.getByText("Feeds (2)")).toBeVisible();
  await expect(page.getByText("Feed point west")).toBeVisible();
  await expect(page.getByText("Feed point east")).toBeVisible();
  await expect(page.getByText("Discharges (2)")).toBeVisible();
  await expect(page.getByText("Reclaim west")).toBeVisible();
  await expect(page.getByText("Reclaim east")).toBeVisible();
});

test("keeps simultaneous direct feeder evidence visible for multi-output live piles", async ({
  page,
}) => {
  await page.goto("/live?view=piles&object=pile_stockpile");

  const directOutputRow = page.locator(".direct-output-row");

  await expect(page.getByText("Direct discharge outputs")).toBeVisible();
  await expect(directOutputRow.locator(".direct-output-card")).toHaveCount(2);
  await expect(directOutputRow.getByRole("heading", { name: "Reclaim west" })).toBeVisible();
  await expect(directOutputRow.getByRole("heading", { name: "Reclaim east" })).toBeVisible();
});

test("shows simultaneous simulated feeder outputs under the pile in simulator", async ({
  page,
}) => {
  await page.goto("/simulator?object=pile_stockpile");

  const directOutputRow = page.locator(".direct-output-row");

  await expect(
    page.getByRole("heading", { name: "Pile discharge simulator" }),
  ).toBeVisible();
  await expect(page.getByText("Simulated feeder outputs")).toBeVisible();
  await expect(directOutputRow.locator(".direct-output-card")).toHaveCount(2);
  await expect(directOutputRow.getByRole("heading", { name: "Feeder West" })).toBeVisible();
  await expect(directOutputRow.getByRole("heading", { name: "Feeder East" })).toBeVisible();
  await expect(page.getByText("Output discharge rates")).toHaveCount(0);
});

test("shows hovered stockpile cell details in the workspace inspector", async ({
  page,
}) => {
  await page.goto("/live?view=piles&object=vpile_ch1&quality=q_num_fe");
  const cellFocusPanel = page.locator(".inspector-stack").filter({
    has: page.getByText("Cell Focus", { exact: true }),
  });

  await page.getByLabel("Pile cell 0,0,0").hover();
  await expect(page.getByText("Cell Focus")).toBeVisible();
  await expect(cellFocusPanel.getByText("0, 0, 0")).toBeVisible();
  await expect(cellFocusPanel.getByText("20 t", { exact: true })).toBeVisible();
});

test("redirects the legacy stockpiles route into the live pile subview", async ({
  page,
}) => {
  await page.goto("/stockpiles?object=pile_stockpile&quality=q_num_cut");
  await expect(page).toHaveURL(/\/live\?object=pile_stockpile&quality=q_num_cut&view=piles$|\/live\?quality=q_num_cut&object=pile_stockpile&view=piles$/);
  await expect(
    page.getByRole("heading", { name: "Current belt and pile state" }),
  ).toBeVisible();
  await expect(
    page.locator('label:has-text("Pile") select').first(),
  ).toHaveValue("pile_stockpile");
});
