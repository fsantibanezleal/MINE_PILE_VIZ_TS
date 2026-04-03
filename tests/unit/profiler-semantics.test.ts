import { describe, expect, it } from "vitest";
import { getProfilerSemanticFrame } from "@/lib/profiler-semantics";

describe("profiler-semantics", () => {
  it("describes circuit mode as reduced summary rows", () => {
    const frame = getProfilerSemanticFrame("circuit", null);

    expect(frame.source).toBe("Profiler summary rows");
    expect(frame.recordLabel).toBe("summary rows");
    expect(frame.densityLabel).toBe("Not dense live state");
  });

  it("describes 1D pile detail mode as summary bands", () => {
    const frame = getProfilerSemanticFrame("detail", {
      objectType: "pile",
      dimension: 1,
    });

    expect(frame.resolution).toBe("Reduced pile summary bands");
    expect(frame.recordLabel).toBe("summary bands");
    expect(frame.basisLabel).toBe("Band basis");
  });

  it("describes 3D pile detail mode as summary cells", () => {
    const frame = getProfilerSemanticFrame("detail", {
      objectType: "pile",
      dimension: 3,
    });

    expect(frame.resolution).toBe("Reduced pile summary cells");
    expect(frame.recordLabel).toBe("summary cells");
    expect(frame.basisLabel).toBe("Cell basis");
  });
});
