"use client";

import { useMemo, useState } from "react";
import { formatMassTon, formatNumber, formatPercent } from "@/lib/format";
import {
  buildCategoricalDistributionGroups,
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
  totalMassTon?: number | null;
}

export function ProfiledPropertiesPanel({
  qualities,
  values,
  records,
  totalMassTon,
}: ProfiledPropertiesPanelProps) {
  const { numericalQualities, categoricalQualities } = useMemo(
    () => splitProfiledQualities(qualities, values, records),
    [qualities, records, values],
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
  const distributionGroups = useMemo(
    () => buildCategoricalDistributionGroups(categoricalQualities, qualities),
    [categoricalQualities, qualities],
  );

  const dominantEntries = useMemo(
    () =>
      buildDominantCategoricalEntries(
        categoricalQualities,
        qualities,
        values,
        records,
        totalMassTon,
      ),
    [categoricalQualities, qualities, records, totalMassTon, values],
  );
  const selectedCategoricalQuality = categoricalQualities.find(
    (quality) => quality.id === effectiveSelectedCategoricalId,
  );
  const selectedDistributionGroup = distributionGroups.find(
    (group) => group.mainQuality.id === effectiveSelectedCategoricalId,
  );
  const selectedBreakdown = useMemo(
    () =>
      selectedCategoricalQuality
        ? buildCategoricalProportionBreakdown(
            selectedCategoricalQuality,
            qualities,
            values,
            records,
            totalMassTon,
          )
        : null,
    [qualities, records, selectedCategoricalQuality, totalMassTon, values],
  );
  const selectedBreakdownSourceText = selectedBreakdown
    ? selectedBreakdown.source === "proportion-records"
      ? "Mass-weighted distribution from explicit categorical proportion values."
      : selectedBreakdown.source === "proportion-aggregate"
        ? "Distribution reconstructed from aggregate proportion values."
        : "Estimated from block or cell predominant labels because explicit proportion values are unavailable in this cache."
    : null;

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
            {numericalQualities.map((quality) => {
              const value = values[quality.id];

              return (
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
                  <strong>{formatNumber(typeof value === "number" ? value : null)}</strong>
                </div>
              );
            })}
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
                    {entry.source === "proportion-records"
                      ? `${formatPercent((entry.ratio ?? 0) * 100)} from explicit distribution`
                      : entry.source === "proportion-aggregate"
                        ? `${formatPercent((entry.ratio ?? 0) * 100)} from aggregate proportions`
                        : entry.source === "main-records"
                          ? `${formatPercent((entry.ratio ?? 0) * 100)} estimated from predominant labels`
                          : entry.source === "aggregate"
                            ? "Mapped from aggregate predominant category"
                            : "Requires qualitative detail or aggregate proportions"}
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
              <span>Qualitative property</span>
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
              <div className="profiled-properties__distribution">
                <div className="metric-grid">
                  <div className="metric-card">
                    <span>Source</span>
                    <strong>
                      {selectedBreakdown.source === "proportion-records"
                        ? "Explicit proportions"
                        : selectedBreakdown.source === "proportion-aggregate"
                          ? "Aggregate proportions"
                          : "Predominant-label estimate"}
                    </strong>
                  </div>
                  <div className="metric-card">
                    <span>Mass basis</span>
                    <strong>
                      {selectedBreakdown.totalMassTon !== null
                        ? formatMassTon(selectedBreakdown.totalMassTon)
                        : "Not available"}
                    </strong>
                  </div>
                  <div className="metric-card">
                    <span>Categories</span>
                    <strong>{String(selectedBreakdown.segments.length)}</strong>
                  </div>
                </div>
                <p className="muted-text">{selectedBreakdownSourceText}</p>
                {selectedDistributionGroup?.proportionQualities.length ? (
                  <p className="quality-list__subtext">
                    Derived from {selectedDistributionGroup.proportionQualities.length} explicit
                    proportion channels for this qualitative variable.
                  </p>
                ) : null}
                <div className="quality-list">
                  {selectedBreakdown.segments.map((segment) => (
                    <div
                      key={`${selectedBreakdown.quality.id}:${segment.label}`}
                      className="profiled-properties__distribution-row"
                    >
                      <div className="profiled-properties__distribution-meta">
                        <div className="quality-list__meta quality-list__meta--stacked">
                          <span className="quality-list__meta">
                            <i
                              className="quality-dot"
                              style={{ backgroundColor: segment.color }}
                            />
                            {segment.label}
                          </span>
                          <span className="quality-list__subtext">
                            {segment.massTon !== null
                              ? formatMassTon(segment.massTon)
                              : "Mass basis unavailable"}
                          </span>
                        </div>
                        <div className="profiled-properties__distribution-bar-frame">
                          <div
                            className="profiled-properties__distribution-bar"
                            style={{
                              width: `${Math.max(segment.ratio * 100, 1)}%`,
                              backgroundColor: segment.color,
                            }}
                            aria-label={`${segment.label} qualitative distribution`}
                          />
                        </div>
                      </div>
                      <div className="profiled-properties__distribution-values">
                        <strong>{formatPercent(segment.ratio * 100)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="muted-text">
                This cache does not expose explicit qualitative proportion channels for the
                selected variable, and no block or cell-level predominant labels are available
                to estimate a distribution.
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
