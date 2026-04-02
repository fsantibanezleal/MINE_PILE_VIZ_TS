import type { QualityDefinition } from "@/types/app-data";

const FALLBACK_COLOR = "#7ca4c9";

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
  value: number | null | undefined,
): string {
  if (!definition || value === null || value === undefined || Number.isNaN(value)) {
    return FALLBACK_COLOR;
  }

  if (definition.kind === "categorical") {
    return (
      definition.categories?.find((category) => category.value === value)?.color ??
      FALLBACK_COLOR
    );
  }

  const min = definition.min ?? 0;
  const max = definition.max ?? min + 1;
  const ratio = max === min ? 0 : (value - min) / (max - min);
  return interpolatePalette(definition.palette, ratio);
}
