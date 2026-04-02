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
    page.getByRole("heading", { name: "Modeled process topology" }),
  ).toBeVisible();
  await expect(page.getByText("Plant Stockpile")).toBeVisible();

  await page.getByRole("link", { name: "Live State" }).click();
  await expect(
    page.getByRole("heading", { name: "Current belt and pile state" }),
  ).toBeVisible();
  await expect(page.getByText("Block strip")).toBeVisible();

  await page.getByRole("link", { name: "Stockpiles" }).click();
  await expect(
    page.getByRole("heading", { name: "Internal stockpile views" }),
  ).toBeVisible();
  await expect(page.getByText("Selection")).toBeVisible();
  await expect(page.getByText("Occupied cells", { exact: true }).first()).toBeVisible();

  await page.getByRole("link", { name: "Profiler" }).click();
  await expect(page.getByRole("heading", { name: "History explorer" })).toBeVisible();
  await expect(page.getByText("Playback")).toBeVisible();
  expect(reactFlowContainerWarnings).toEqual([]);
});

test("updates stockpile 3D colors when the selected property changes", async ({
  page,
}) => {
  await page.goto("/stockpiles");
  await expect(
    page.getByRole("heading", { name: "Internal stockpile views" }),
  ).toBeVisible();

  const pileSelect = page.locator('label:has-text("Pile") select').first();
  const propertySelect = page.locator('label:has-text("Property") select').first();
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
});
