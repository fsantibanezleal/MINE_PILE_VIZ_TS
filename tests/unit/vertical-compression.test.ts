import { describe, expect, it } from "vitest";
import {
  clampVerticalCompressionFactor,
  getVerticalCompressionScale,
  MAX_VERTICAL_COMPRESSION_FACTOR,
  MIN_VERTICAL_COMPRESSION_FACTOR,
} from "@/lib/vertical-compression";

describe("vertical compression helpers", () => {
  it("clamps the factor to the supported integer range", () => {
    expect(clampVerticalCompressionFactor(undefined)).toBe(
      MIN_VERTICAL_COMPRESSION_FACTOR,
    );
    expect(clampVerticalCompressionFactor(0)).toBe(
      MIN_VERTICAL_COMPRESSION_FACTOR,
    );
    expect(clampVerticalCompressionFactor(12.6)).toBe(13);
    expect(clampVerticalCompressionFactor(4000)).toBe(
      MAX_VERTICAL_COMPRESSION_FACTOR,
    );
  });

  it("derives the vertical scale as the inverse of the clamped factor", () => {
    expect(getVerticalCompressionScale(1)).toBe(1);
    expect(getVerticalCompressionScale(4)).toBeCloseTo(0.25);
    expect(getVerticalCompressionScale(1000)).toBeCloseTo(0.001);
  });
});
