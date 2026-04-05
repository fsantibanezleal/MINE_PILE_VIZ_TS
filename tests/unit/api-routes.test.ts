import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAppManifest: vi.fn(),
  getStockpileDataset: vi.fn(),
  normalizeAppDataError: vi.fn(),
  toAppDataErrorPayload: vi.fn(),
}));

vi.mock("@/lib/server/app-data", () => ({
  getAppManifest: mocks.getAppManifest,
  getStockpileDataset: mocks.getStockpileDataset,
}));

vi.mock("@/lib/server/app-data-errors", () => ({
  normalizeAppDataError: mocks.normalizeAppDataError,
  toAppDataErrorPayload: mocks.toAppDataErrorPayload,
}));

import { GET as getManifestRoute } from "@/app/api/manifest/route";
import { GET as getStockpileRoute } from "@/app/api/stockpiles/[pileId]/route";

describe("API route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the manifest payload from the manifest route", async () => {
    mocks.getAppManifest.mockResolvedValueOnce({
      schemaVersion: "1.0.0",
      appVersion: "0.01.012",
      datasetLabel: "Fixture",
    });

    const response = await getManifestRoute();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      schemaVersion: "1.0.0",
      appVersion: "0.01.012",
      datasetLabel: "Fixture",
    });
  });

  it("returns the selected stockpile payload from the dynamic stockpile route", async () => {
    mocks.getStockpileDataset.mockResolvedValueOnce({
      objectId: "pile_a",
      displayName: "Pile A",
    });

    const response = await getStockpileRoute(new Request("http://localhost"), {
      params: Promise.resolve({ pileId: "pile_a" }),
    });

    expect(mocks.getStockpileDataset).toHaveBeenCalledWith("pile_a");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      objectId: "pile_a",
      displayName: "Pile A",
    });
  });

  it("returns a typed error payload when the stockpile route loader fails", async () => {
    const failure = new Error("Broken stockpile dataset.");
    const normalizedError = {
      status: 422,
      code: "invalid_schema",
      title: "Invalid stockpile schema",
      message: "The stockpile cache metadata is invalid.",
      relativePath: "live/piles/pile_a/meta.json",
      details: ["Missing extents.x"],
    };
    const payload = {
      code: "invalid_schema",
      title: "Invalid stockpile schema",
      message: "The stockpile cache metadata is invalid.",
      relativePath: "live/piles/pile_a/meta.json",
      details: ["Missing extents.x"],
    };

    mocks.getStockpileDataset.mockRejectedValueOnce(failure);
    mocks.normalizeAppDataError.mockReturnValueOnce(normalizedError);
    mocks.toAppDataErrorPayload.mockReturnValueOnce(payload);

    const response = await getStockpileRoute(new Request("http://localhost"), {
      params: Promise.resolve({ pileId: "pile_a" }),
    });

    expect(mocks.normalizeAppDataError).toHaveBeenCalledWith(failure);
    expect(mocks.toAppDataErrorPayload).toHaveBeenCalledWith(normalizedError);
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: payload,
    });
  });
});
