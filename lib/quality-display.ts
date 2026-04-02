import { formatNumber } from "@/lib/format";
import { findQualityCategory } from "@/lib/quality-values";
import type { QualityDefinition, QualityValue } from "@/types/app-data";

const TECHNICAL_QUALITY_ID_PATTERN = /^q_(num|cat)_/i;

function humanizeToken(token: string) {
  return token
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function humanizeQualityId(qualityId: string) {
  const categoricalMainMatch = /^q_cat_(.+?)_main$/i.exec(qualityId);

  if (categoricalMainMatch) {
    return `Predominant ${humanizeToken(categoricalMainMatch[1] ?? qualityId)}`;
  }

  const categoricalProportionMatch = /^q_cat_(.+?)_prop_(.+)$/i.exec(qualityId);

  if (categoricalProportionMatch) {
    const source = humanizeToken(categoricalProportionMatch[1] ?? qualityId);
    const token = categoricalProportionMatch[2] ?? "other";
    return token === "other"
      ? `${source} proportion other`
      : `${source} proportion ${humanizeToken(token)}`;
  }

  const numericalMatch = /^q_num_(.+)$/i.exec(qualityId);

  if (numericalMatch) {
    return humanizeToken(numericalMatch[1] ?? qualityId);
  }

  return humanizeToken(qualityId);
}

function isUsefulDisplayLabel(label: string | undefined, qualityId: string) {
  if (!label) {
    return false;
  }

  const trimmed = label.trim();

  if (!trimmed || trimmed === qualityId) {
    return false;
  }

  return !TECHNICAL_QUALITY_ID_PATTERN.test(trimmed);
}

export function getQualityDisplayLabel(
  quality: Pick<QualityDefinition, "id" | "label"> | undefined,
  fallbackId?: string,
) {
  if (quality && isUsefulDisplayLabel(quality.label, quality.id)) {
    return quality.label.trim();
  }

  if (quality?.id) {
    return humanizeQualityId(quality.id);
  }

  if (fallbackId) {
    return humanizeQualityId(fallbackId);
  }

  return "Property";
}

export function formatQualityValueDisplay(
  quality: QualityDefinition | undefined,
  value: QualityValue | undefined,
) {
  if (value === null || value === undefined) {
    return "N/A";
  }

  if (!quality) {
    return typeof value === "number" ? formatNumber(value) : String(value);
  }

  if (quality.kind === "categorical") {
    return findQualityCategory(quality, value)?.label ?? String(value);
  }

  return formatNumber(typeof value === "number" ? value : null);
}
