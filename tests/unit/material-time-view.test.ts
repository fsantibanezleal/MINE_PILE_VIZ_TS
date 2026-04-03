import { describe, expect, it } from "vitest";
import {
  getMaterialTimeDefinition,
  getMaterialTimeValue,
} from "@/lib/material-time-view";

describe("material-time-view", () => {
  const record = {
    timestampOldestMs: 1_000,
    timestampNewestMs: 3_000,
  };

  it("derives age-oriented material time values from record bounds", () => {
    expect(getMaterialTimeValue(record, "oldest-age", 5_000)).toBe(4_000);
    expect(getMaterialTimeValue(record, "newest-age", 5_000)).toBe(2_000);
    expect(getMaterialTimeValue(record, "material-span", 5_000)).toBe(2_000);
  });

  it("returns stable synthetic numerical definitions for material time modes", () => {
    const definition = getMaterialTimeDefinition("oldest-age");

    expect(definition.kind).toBe("numerical");
    expect(definition.label).toBe("Oldest material age");
    expect(definition.palette.length).toBeGreaterThan(1);
  });
});
