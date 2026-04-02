import { getQualityColor } from "@/lib/color";
import {
  formatQualityValueDisplay,
  getQualityDisplayLabel,
} from "@/lib/quality-display";
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

        return (
          <div key={quality.id} className="quality-list__item">
            <span className="quality-list__meta">
              <i
                className="quality-dot"
                style={{ backgroundColor: getQualityColor(quality, value) }}
              />
              {getQualityDisplayLabel(quality)}
            </span>
            <strong>{formatQualityValueDisplay(quality, value)}</strong>
          </div>
        );
      })}
    </div>
  );
}
