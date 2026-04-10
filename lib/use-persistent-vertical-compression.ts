"use client";

import { useEffect, useState } from "react";
import {
  MIN_VERTICAL_COMPRESSION_FACTOR,
  clampVerticalCompressionFactor,
} from "@/lib/vertical-compression";

const STORAGE_KEY_PREFIX = "mine-pile-viz-vertical-compression:";

export function getVerticalCompressionStorageKey(scope: string) {
  return `${STORAGE_KEY_PREFIX}${scope}`;
}

function readStoredVerticalCompression(scope: string) {
  if (typeof window === "undefined") {
    return MIN_VERTICAL_COMPRESSION_FACTOR;
  }

  const storedValue = window.localStorage.getItem(
    getVerticalCompressionStorageKey(scope),
  );

  if (!storedValue) {
    return MIN_VERTICAL_COMPRESSION_FACTOR;
  }

  return clampVerticalCompressionFactor(Number(storedValue));
}

export function usePersistentVerticalCompression(scope: string) {
  const [verticalCompressionFactor, setVerticalCompressionFactorState] =
    useState(() => readStoredVerticalCompression(scope));

  useEffect(() => {
    setVerticalCompressionFactorState(readStoredVerticalCompression(scope));
  }, [scope]);

  function setVerticalCompressionFactor(nextValue: number) {
    const normalizedValue = clampVerticalCompressionFactor(nextValue);
    setVerticalCompressionFactorState(normalizedValue);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        getVerticalCompressionStorageKey(scope),
        String(normalizedValue),
      );
    }
  }

  return [verticalCompressionFactor, setVerticalCompressionFactor] as const;
}
