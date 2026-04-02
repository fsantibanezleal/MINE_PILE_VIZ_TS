import { expect, test } from "@playwright/test";

test("loads the primary pages with the synthetic contract cache", async ({ page }) => {
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
});
