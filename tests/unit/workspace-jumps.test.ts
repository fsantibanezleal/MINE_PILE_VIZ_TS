import { describe, expect, it } from "vitest";
import { getWorkspaceJumpTargets } from "@/lib/workspace-jumps";

describe("getWorkspaceJumpTargets", () => {
  it("returns object-aware cross-workspace targets for a profiled pile", () => {
    const targets = getWorkspaceJumpTargets({
      pathname: "/circuit",
      objectId: "pile_stockpile",
      objectType: "pile",
      isProfiled: true,
      searchParams: new URLSearchParams("quality=q_num_cut"),
    });

    expect(targets).toEqual([
      {
        route: "live",
        label: "Open Live State",
        href: "/live?quality=q_num_cut&object=pile_stockpile",
      },
      {
        route: "stockpiles",
        label: "Open Stockpiles",
        href: "/stockpiles?quality=q_num_cut&object=pile_stockpile",
      },
      {
        route: "profiler",
        label: "Open Profiler",
        href: "/profiler?quality=q_num_cut&object=pile_stockpile",
      },
      {
        route: "simulator",
        label: "Open Simulator",
        href: "/simulator?quality=q_num_cut&object=pile_stockpile",
      },
    ]);
  });

  it("filters pile-only and profiler-only routes when they do not apply", () => {
    const targets = getWorkspaceJumpTargets({
      pathname: "/live",
      objectId: "vbelt_feed_ch1",
      objectType: "belt",
      isProfiled: false,
      searchParams: new URLSearchParams("quality=q_num_fe"),
    });

    expect(targets).toEqual([
      {
        route: "circuit",
        label: "Open Circuit",
        href: "/circuit?quality=q_num_fe&object=vbelt_feed_ch1",
      },
    ]);
  });
});
