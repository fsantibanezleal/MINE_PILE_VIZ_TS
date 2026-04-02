import { getQualityColor } from "@/lib/color";
import { formatNumber } from "@/lib/format";
import { findQualityCategory } from "@/lib/quality-values";
import type { QualityDefinition, QualityValueMap } from "@/types/app-data";

interface QualityValueListProps {
  qualities: QualityDefinition[];
  values: QualityValueMap;
  limit?: number;
}

export function QualityValueList({
  qualities,
  values,
  limit = 10,
}: QualityValueListProps) {
  return (
    <div className="quality-list">
      {qualities.slice(0, limit).map((quality) => {
        const value = values[quality.id];
        const categoricalLabel =
          quality.kind === "categorical" ? findQualityCategory(quality, value)?.label : undefined;

        return (
          <div key={quality.id} className="quality-list__item">
            <span className="quality-list__meta">
              <i
                className="quality-dot"
                style={{ backgroundColor: getQualityColor(quality, value) }}
              />
              {quality.label}
            </span>
            <strong>
              {categoricalLabel ??
                (quality.kind === "categorical"
                  ? String(value ?? "N/A")
                  : formatNumber(typeof value === "number" ? value : null))}
            </strong>
          </div>
        );
      })}
    </div>
  );
}
