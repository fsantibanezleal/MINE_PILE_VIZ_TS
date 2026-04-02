"use client";

import { useMemo, useState } from "react";
import { formatMassTon, formatNumber, formatPercent } from "@/lib/format";
import {
  buildCategoricalProportionBreakdown,
  buildDominantCategoricalEntries,
  splitProfiledQualities,
  type ProfiledPropertyRecord,
} from "@/lib/profiled-properties";
import type { QualityDefinition, QualityValueMap } from "@/types/app-data";

type PropertyTab = "quantitative" | "dominant" | "proportions";

interface ProfiledPropertiesPanelProps {
  qualities: QualityDefinition[];
  values: QualityValueMap;
  records?: ProfiledPropertyRecord[] | null;
}

function buildPieGradient(
  segments: Array<{
    color: string;
    ratio: number;
  }>,
) {
  let cursor = 0;

  return `conic-gradient(${segments
    .map((segment) => {
      const start = cursor * 100;
      cursor += segment.ratio;
      const end = cursor * 100;
      return `${segment.color} ${start}% ${end}%`;
    })
    .join(", ")})`;
}

export function ProfiledPropertiesPanel({
  qualities,
  values,
  records,
}: ProfiledPropertiesPanelProps) {
  const { numericalQualities, categoricalQualities } = useMemo(
    () => splitProfiledQualities(qualities, values),
    [qualities, values],
  );
  const [tab, setTab] = useState<PropertyTab>("quantitative");
  const [selectedCategoricalId, setSelectedCategoricalId] = useState(
    categoricalQualities[0]?.id ?? "",
  );
  const effectiveSelectedCategoricalId =
    selectedCategoricalId &&
    categoricalQualities.some((quality) => quality.id === selectedCategoricalId)
      ? selectedCategoricalId
      : (categoricalQualities[0]?.id ?? "");

  const dominantEntries = useMemo(
    () => buildDominantCategoricalEntries(categoricalQualities, values, records),
    [categoricalQualities, records, values],
  );
  const selectedCategoricalQuality = categoricalQualities.find(
    (quality) => quality.id === effectiveSelectedCategoricalId,
  );
  const selectedBreakdown = useMemo(
    () =>
      selectedCategoricalQuality
        ? buildCategoricalProportionBreakdown(selectedCategoricalQuality, records)
        : null,
    [records, selectedCategoricalQuality],
  );

  return (
    <div className="profiled-properties">
      <div className="section-label">Profiled properties</div>
      <div className="profiled-properties__tabs">
        <button
          type="button"
          className={`segmented-button ${tab === "quantitative" ? "segmented-button--active" : ""}`}
          onClick={() => setTab("quantitative")}
        >
          Quantitative
        </button>
        <button
          type="button"
          className={`segmented-button ${tab === "dominant" ? "segmented-button--active" : ""}`}
          onClick={() => setTab("dominant")}
        >
          Dominant
        </button>
        <button
          type="button"
          className={`segmented-button ${tab === "proportions" ? "segmented-button--active" : ""}`}
          onClick={() => setTab("proportions")}
        >
          Proportions
        </button>
      </div>

      {tab === "quantitative" ? (
        numericalQualities.length > 0 ? (
          <div className="quality-list">
            {numericalQualities.map((quality) => (
              <div key={quality.id} className="quality-list__item">
                <span className="quality-list__meta">
                  <i
                    className="quality-dot"
                    style={{
                      backgroundColor:
                        quality.palette[quality.palette.length - 1] ?? "#7ca4c9",
                    }}
                  />
                  {quality.label}
                </span>
                <strong>{formatNumber(values[quality.id])}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted-text">
            No quantitative profiled variables are available for the current object.
          </p>
        )
      ) : null}

      {tab === "dominant" ? (
        dominantEntries.length > 0 ? (
          <div className="quality-list">
            {dominantEntries.map((entry) => (
              <div key={entry.quality.id} className="quality-list__item">
                <div className="quality-list__meta quality-list__meta--stacked">
                  <span className="quality-list__meta">
                    <i
                      className="quality-dot"
                      style={{ backgroundColor: entry.color }}
                    />
                    {entry.quality.label}
                  </span>
                  <span className="quality-list__subtext">
                    {entry.source === "records"
                      ? `${formatPercent((entry.ratio ?? 0) * 100)} by mass`
                      : entry.source === "aggregate"
                        ? "Mapped from aggregate category"
                        : "Requires block or cell detail"}
                  </span>
                </div>
                <strong>{entry.label}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted-text">
            No categorical profiled variables are available for the current object.
          </p>
        )
      ) : null}

      {tab === "proportions" ? (
        categoricalQualities.length > 0 ? (
          <div className="profiled-properties__proportions">
            <label className="field">
              <span>Categorical property</span>
              <select
                value={effectiveSelectedCategoricalId}
                onChange={(event) => setSelectedCategoricalId(event.target.value)}
              >
                {categoricalQualities.map((quality) => (
                  <option key={quality.id} value={quality.id}>
                    {quality.label}
                  </option>
                ))}
              </select>
            </label>

            {selectedBreakdown ? (
              <div className="profiled-properties__pie-layout">
                <div className="profiled-properties__pie-card">
                  <div
                    className="profiled-properties__pie"
                    style={{
                      background: buildPieGradient(selectedBreakdown.segments),
                    }}
                    aria-label={`${selectedBreakdown.quality.label} categorical proportions`}
                  >
                    <div className="profiled-properties__pie-center">
                      <strong>{formatMassTon(selectedBreakdown.totalMassTon)}</strong>
                      <span>Mass basis</span>
                    </div>
                  </div>
                </div>
                <div className="quality-list">
                  {selectedBreakdown.segments.map((segment) => (
                    <div
                      key={`${selectedBreakdown.quality.id}:${segment.label}`}
                      className="quality-list__item"
                    >
                      <div className="quality-list__meta quality-list__meta--stacked">
                        <span className="quality-list__meta">
                          <i
                            className="quality-dot"
                            style={{ backgroundColor: segment.color }}
                          />
                          {segment.label}
                        </span>
                        <span className="quality-list__subtext">
                          {formatMassTon(segment.massTon)}
                        </span>
                      </div>
                      <strong>{formatPercent(segment.ratio * 100)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="muted-text">
                Proportions require block or cell-level records for the selected object.
              </p>
            )}
          </div>
        ) : (
          <p className="muted-text">
            No categorical profiled variables are available for proportion breakdowns.
          </p>
        )
      ) : null}
    </div>
  );
}
