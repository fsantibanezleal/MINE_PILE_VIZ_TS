import type { QualityDefinition } from "@/types/app-data";
import { deriveNumericExtrema } from "@/lib/data-stats";
import { findQualityCategory } from "@/lib/quality-values";

const FALLBACK_COLOR = "#7ca4c9";

export type NumericColorDomainMode = "configured" | "adaptive-local";

export interface NumericColorDomain {
  min: number;
  max: number;
  mode: NumericColorDomainMode;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasConfiguredDomain(definition: QualityDefinition | undefined) {
  return (
    definition?.kind === "numerical" &&
    isFiniteNumber(definition.min) &&
    isFiniteNumber(definition.max) &&
    definition.max > definition.min
  );
}

function buildAdaptiveLocalDomain(
  min: number,
  max: number,
  configuredSpan = 0,
): NumericColorDomain {
  const localSpan = max - min;
  const padding =
    localSpan > 0
      ? Math.max(localSpan * 0.08, configuredSpan * 0.01)
      : Math.max(configuredSpan * 0.02, Math.max(Math.abs(min) * 0.04, 0.02));

  return {
    min: min - padding,
    max: max + padding,
    mode: "adaptive-local",
  };
}

export function interpolatePalette(palette: string[], ratio: number): string {
  if (palette.length === 0) {
    return FALLBACK_COLOR;
  }

  if (palette.length === 1) {
    return palette[0]!;
  }

  const clamped = Math.min(1, Math.max(0, ratio));
  const scaled = clamped * (palette.length - 1);
  const index = Math.min(palette.length - 2, Math.floor(scaled));
  const localRatio = scaled - index;
  const from = hexToRgb(palette[index]!);
  const to = hexToRgb(palette[index + 1]!);

  return rgbToHex(
    Math.round(lerp(from.r, to.r, localRatio)),
    Math.round(lerp(from.g, to.g, localRatio)),
    Math.round(lerp(from.b, to.b, localRatio)),
  );
}

export function getQualityColor(
  definition: QualityDefinition | undefined,
  value: string | number | null | undefined,
  domain?: NumericColorDomain,
): string {
  if (!definition || value === null || value === undefined || Number.isNaN(value)) {
    return FALLBACK_COLOR;
  }

  if (definition.kind === "categorical") {
    return findQualityCategory(definition, value)?.color ?? FALLBACK_COLOR;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return FALLBACK_COLOR;
  }

  const min = domain?.min ?? definition.min ?? 0;
  const max = domain?.max ?? definition.max ?? min + 1;
  const ratio = max === min ? 0 : (value - min) / (max - min);
  return interpolatePalette(definition.palette, ratio);
}

export function deriveNumericColorDomain(
  values: Array<number | null | undefined>,
  definition: QualityDefinition | undefined,
): NumericColorDomain | undefined {
  if (!definition || definition.kind !== "numerical") {
    return undefined;
  }

  const numericValues = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );

  if (numericValues.length === 0) {
    return undefined;
  }

  const domain = deriveNumericExtrema(numericValues, (value) => value);

  if (!domain) {
    return undefined;
  }

  const { min, max } = domain;
  const configuredDomainIsValid = hasConfiguredDomain(definition);
  const configuredMin = configuredDomainIsValid ? definition.min : undefined;
  const configuredMax = configuredDomainIsValid ? definition.max : undefined;
  const configuredSpan =
    configuredDomainIsValid && configuredMin !== undefined && configuredMax !== undefined
      ? configuredMax - configuredMin
      : 0;

  if (min === max) {
    if (configuredDomainIsValid && configuredMin !== undefined && configuredMax !== undefined) {
      return { min: configuredMin, max: configuredMax, mode: "configured" };
    }

    return buildAdaptiveLocalDomain(min, max);
  }

  if (!configuredDomainIsValid || configuredMin === undefined || configuredMax === undefined) {
    return buildAdaptiveLocalDomain(min, max);
  }

  const withinConfiguredBounds = min >= configuredMin && max <= configuredMax;
  const localCoverage = configuredSpan > 0 ? (max - min) / configuredSpan : 1;

  if (withinConfiguredBounds && localCoverage >= 0.4) {
    return { min: configuredMin, max: configuredMax, mode: "configured" };
  }

  return buildAdaptiveLocalDomain(min, max, configuredSpan);
}
