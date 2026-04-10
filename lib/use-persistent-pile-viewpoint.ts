"use client";

import { useState } from "react";
import type { Pile3DViewpoint } from "@/lib/pile-viewpoint";

const STORAGE_KEY_PREFIX = "mine-pile-viz-pile-viewpoint:";

function isFiniteTriplet(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
  );
}

function normalizePileViewpoint(
  viewpoint: Pile3DViewpoint | null | undefined,
): Pile3DViewpoint | null {
  if (!viewpoint) {
    return null;
  }

  if (
    !isFiniteTriplet(viewpoint.position) ||
    !isFiniteTriplet(viewpoint.target)
  ) {
    return null;
  }

  return {
    position: [...viewpoint.position] as [number, number, number],
    target: [...viewpoint.target] as [number, number, number],
  };
}

function readStoredPileViewpoint(scope: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const storedValue = window.localStorage.getItem(
    getPileViewpointStorageKey(scope),
  );

  if (!storedValue) {
    return null;
  }

  try {
    return normalizePileViewpoint(
      JSON.parse(storedValue) as Pile3DViewpoint | null,
    );
  } catch {
    return null;
  }
}

export function getPileViewpointStorageKey(scope: string) {
  return `${STORAGE_KEY_PREFIX}${scope}`;
}

export function usePersistentPileViewpoint(
  scope: string,
  fallbackViewpoint: Pile3DViewpoint | null,
) {
  const [viewpoint, setViewpointState] = useState<Pile3DViewpoint | null>(() => {
    return readStoredPileViewpoint(scope);
  });

  function setViewpoint(nextViewpoint: Pile3DViewpoint) {
    const normalizedViewpoint = normalizePileViewpoint(nextViewpoint);

    if (!normalizedViewpoint) {
      return;
    }

    setViewpointState(normalizedViewpoint);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        getPileViewpointStorageKey(scope),
        JSON.stringify(normalizedViewpoint),
      );
    }
  }

  return [viewpoint ?? normalizePileViewpoint(fallbackViewpoint), setViewpoint] as const;
}
