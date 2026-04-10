import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Pile3DViewpoint } from "@/lib/pile-viewpoint";
import { getDefaultPile3DViewpoint } from "@/lib/pile-viewpoint";
import {
  getPileViewpointStorageKey,
  usePersistentPileViewpoint,
} from "@/lib/use-persistent-pile-viewpoint";

describe("usePersistentPileViewpoint", () => {
  it("restores a stored viewpoint for the requested scope", () => {
    window.localStorage.clear();
    const storedViewpoint: Pile3DViewpoint = {
      position: [18, 9, 27],
      target: [1, 0, -2],
    };
    window.localStorage.setItem(
      getPileViewpointStorageKey("profiler"),
      JSON.stringify(storedViewpoint),
    );

    const fallbackViewpoint = getDefaultPile3DViewpoint({ x: 12, y: 8, z: 5 }, 1);
    const { result } = renderHook(() =>
      usePersistentPileViewpoint("profiler", fallbackViewpoint),
    );

    expect(result.current[0]).toEqual(storedViewpoint);
  });

  it("persists viewpoint updates to localStorage", () => {
    window.localStorage.clear();
    const fallbackViewpoint = getDefaultPile3DViewpoint({ x: 20, y: 14, z: 9 }, 4);
    const { result } = renderHook(() =>
      usePersistentPileViewpoint("simulator", fallbackViewpoint),
    );

    const nextViewpoint: Pile3DViewpoint = {
      position: [12, 7, 21],
      target: [0, 1, 0],
    };

    act(() => {
      result.current[1](nextViewpoint);
    });

    expect(result.current[0]).toEqual(nextViewpoint);
    expect(
      window.localStorage.getItem(getPileViewpointStorageKey("simulator")),
    ).toBe(JSON.stringify(nextViewpoint));
  });
});
