import type { NumericColorDomain } from "@/lib/color";
import type { QualityDefinition } from "@/types/app-data";

interface QualityLegendProps {
  quality: QualityDefinition | undefined;
  numericDomain?: NumericColorDomain;
}

export function QualityLegend({ quality, numericDomain }: QualityLegendProps) {
  if (!quality) {
    return null;
  }

  return (
    <div className="quality-legend">
      <div className="section-label">Color legend</div>
      <div className="quality-legend__title-row">
        <strong>{quality.label}</strong>
        <span>{quality.kind === "categorical" ? "Categorical" : "Numerical"}</span>
      </div>
      {quality.kind === "categorical" ? (
        <div className="quality-legend__categories">
          {(quality.categories ?? []).slice(0, 8).map((category) => (
            <div key={category.value} className="quality-legend__category">
              <i
                className="quality-dot"
                style={{ backgroundColor: category.color }}
              />
              <span>{category.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="quality-legend__scale">
          <div
            className="quality-legend__bar"
            style={{
              background: `linear-gradient(90deg, ${quality.palette.join(", ")})`,
            }}
          />
          <div className="quality-legend__range">
            <span>{numericDomain?.min ?? quality.min ?? 0}</span>
            <span>{numericDomain?.max ?? quality.max ?? 0}</span>
          </div>
          <div className="quality-legend__swatches">
            {quality.palette.map((color, index) => (
              <i
                key={`${quality.id}-${index}`}
                className="quality-legend__swatch"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
