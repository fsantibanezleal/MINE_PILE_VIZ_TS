"use client";

import { getQualityColor } from "@/lib/color";
import { formatMassTon, formatNumber } from "@/lib/format";
import { buildBeltMassHistogram } from "@/lib/live-histogram";
import type { BeltSnapshot, QualityDefinition } from "@/types/app-data";

interface BeltMassHistogramProps {
  snapshot: BeltSnapshot;
  quality: QualityDefinition | undefined;
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="belt-histogram__summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function BeltMassHistogram({
  snapshot,
  quality,
}: BeltMassHistogramProps) {
  const histogram = buildBeltMassHistogram(snapshot, quality);

  if (histogram.kind === "empty") {
    return (
      <div className="belt-histogram belt-histogram--empty">
        <p>{histogram.reason}</p>
      </div>
    );
  }

  if (histogram.kind === "categorical") {
    return (
      <div
        className="belt-histogram"
        role="img"
        aria-label={`${snapshot.displayName} mass-weighted histogram`}
      >
        <div className="belt-histogram__summary">
          <SummaryItem label="Mode" value="Categorical" />
          <SummaryItem
            label="Represented mass"
            value={formatMassTon(histogram.representedMassTon)}
          />
          <SummaryItem label="Categories" value={String(histogram.bins.length)} />
        </div>
        <div className="belt-histogram__chart belt-histogram__chart--categorical">
          {histogram.bins.map((bin) => {
            const height = histogram.maxBinMassTon
              ? (bin.massTon / histogram.maxBinMassTon) * 100
              : 0;

            return (
              <div
                key={`${quality?.id ?? "quality"}-${bin.label}`}
                className="belt-histogram__column belt-histogram__column--categorical"
                title={`${bin.label}: ${formatMassTon(bin.massTon)} across ${bin.blockCount} blocks`}
              >
                <div className="belt-histogram__bar-frame">
                  <div
                    className="belt-histogram__bar"
                    style={{
                      height: `${height}%`,
                      backgroundColor: bin.color,
                    }}
                  />
                </div>
                <span className="belt-histogram__label">{bin.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className="belt-histogram"
      role="img"
      aria-label={`${snapshot.displayName} mass-weighted histogram`}
    >
      <div className="belt-histogram__summary">
        <SummaryItem label="Mode" value="Numerical" />
        <SummaryItem
          label="Represented mass"
          value={formatMassTon(histogram.representedMassTon)}
        />
        <SummaryItem label="Weighted mean" value={formatNumber(histogram.weightedMean)} />
        <SummaryItem
          label="Observed range"
          value={`${formatNumber(histogram.domain.min)} to ${formatNumber(histogram.domain.max)}`}
        />
      </div>
      <div className="belt-histogram__chart">
        {histogram.bins.map((bin, index) => {
          const height = histogram.maxBinMassTon
            ? (bin.massTon / histogram.maxBinMassTon) * 100
            : 0;
          const label =
            histogram.bins.length === 1
              ? formatNumber(bin.center)
              : `${formatNumber(bin.start)} to ${formatNumber(bin.end)}`;

          return (
            <div
              key={`${quality?.id ?? "quality"}-${index}`}
              className="belt-histogram__column"
              title={`${label}: ${formatMassTon(bin.massTon)} across ${bin.blockCount} blocks`}
            >
              <div className="belt-histogram__bar-frame">
                <div
                  className="belt-histogram__bar"
                  style={{
                    height: `${height}%`,
                    backgroundColor: getQualityColor(quality, bin.center),
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="belt-histogram__axis">
        <span>{formatNumber(histogram.domain.min)}</span>
        <span>{formatNumber(histogram.domain.max)}</span>
      </div>
    </div>
  );
}
