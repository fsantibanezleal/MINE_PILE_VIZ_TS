import { describe, expect, it } from "vitest";
import {
  buildMaterialTimeSummary,
  getMaterialTimeSpanMs,
} from "@/lib/material-time";

describe("material time helpers", () => {
  it("derives oldest and newest represented material timestamps and ages", () => {
    const summary = buildMaterialTimeSummary(
      [
        {
          massTon: 20,
          timestampOldestMs: 1_000,
          timestampNewestMs: 4_000,
        },
        {
          massTon: 10,
          timestampOldestMs: 2_000,
          timestampNewestMs: 5_000,
        },
      ],
      7_000,
    );

    expect(summary).toEqual({
      recordCount: 2,
      totalMassTon: 30,
      oldestTimestampMs: 1_000,
      newestTimestampMs: 5_000,
      representedSpanMs: 4_000,
      oldestAgeMs: 6_000,
      newestAgeMs: 2_000,
    });
  });

  it("ignores invalid timestamp rows and normalizes reversed bounds", () => {
    const summary = buildMaterialTimeSummary(
      [
        {
          massTon: 20,
          timestampOldestMs: 0,
          timestampNewestMs: 0,
        },
        {
          massTon: 15,
          timestampOldestMs: 9_000,
          timestampNewestMs: 3_000,
        },
      ],
      null,
    );

    expect(summary).toEqual({
      recordCount: 1,
      totalMassTon: 15,
      oldestTimestampMs: 3_000,
      newestTimestampMs: 9_000,
      representedSpanMs: 6_000,
      oldestAgeMs: null,
      newestAgeMs: null,
    });
    expect(
      getMaterialTimeSpanMs({
        massTon: 15,
        timestampOldestMs: 9_000,
        timestampNewestMs: 3_000,
      }),
    ).toBe(6_000);
  });
});
