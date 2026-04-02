import { describe, expect, it } from "vitest";
import {
  buildHrefWithQuery,
  getQueryValue,
  resolveQuerySelection,
} from "@/lib/workspace-route-state";

describe("workspace route state helpers", () => {
  it("picks the first item from repeated query values", () => {
    expect(getQueryValue(["pile_a", "pile_b"])).toBe("pile_a");
  });

  it("falls back when the query selection is not valid", () => {
    expect(resolveQuerySelection("pile_z", ["pile_a", "pile_b"], "pile_a")).toBe(
      "pile_a",
    );
  });

  it("merges route query params without dropping the existing context", () => {
    const href = buildHrefWithQuery(
      "/profiler",
      new URLSearchParams("object=pile_stockpile&quality=q_num_fe"),
      {
        quality: "q_num_cut",
      },
    );

    expect(href).toBe("/profiler?object=pile_stockpile&quality=q_num_cut");
  });
});
