import type { ReactNode } from "react";
import { BeltBlockStrip } from "@/components/live/belt-block-strip";
import { BeltMassHistogram } from "@/components/live/belt-mass-histogram";
import { InlineNotice } from "@/components/ui/inline-notice";
import { MetricGrid } from "@/components/ui/metric-grid";
import { formatMassTon, formatTimestamp } from "@/lib/format";
import {
  getMaterialTimeValue,
  type MaterialTimeMode,
} from "@/lib/material-time-view";
import type { BeltSnapshot, QualityDefinition } from "@/types/app-data";

interface DirectOutputEvidenceCardProps {
  title: string;
  subtitle?: string;
  snapshot?: BeltSnapshot | null;
  quality: QualityDefinition | undefined;
  materialTimeMode: MaterialTimeMode;
  loading?: boolean;
  error?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyTone?: "info" | "warning" | "error";
  summaryMetrics?: Array<{
    label: string;
    value: string;
  }>;
  selected?: boolean;
  action?: ReactNode;
}

export function DirectOutputEvidenceCard({
  title,
  subtitle,
  snapshot,
  quality,
  materialTimeMode,
  loading = false,
  error,
  emptyTitle = "Direct output unavailable",
  emptyMessage = "No direct feeder content is available for this configured output.",
  emptyTone = "info",
  summaryMetrics,
  selected = false,
  action,
}: DirectOutputEvidenceCardProps) {
  const inspectionValueAccessor =
    materialTimeMode === "property" || !snapshot
      ? undefined
      : (block: BeltSnapshot["blocks"][number]) =>
          getMaterialTimeValue(block, materialTimeMode, snapshot.timestamp);

  const metrics =
    summaryMetrics ??
    (snapshot
      ? [
          { label: "Blocks", value: String(snapshot.blockCount) },
          { label: "Mass", value: formatMassTon(snapshot.totalMassTon) },
          { label: "Timestamp", value: formatTimestamp(snapshot.timestamp) },
        ]
      : []);

  return (
    <article
      className={`direct-output-card${selected ? " direct-output-card--selected" : ""}`}
    >
      <div className="direct-output-card__header">
        <div>
          <div className="section-label">Direct output</div>
          <h3>{title}</h3>
          {subtitle ? <p className="muted-text">{subtitle}</p> : null}
        </div>
        {action ? <div className="direct-output-card__action">{action}</div> : null}
      </div>
      {loading ? <div className="loading-banner">Loading feeder content...</div> : null}
      {error ? (
        <InlineNotice tone="error" title="Direct output unavailable">
          {error}
        </InlineNotice>
      ) : null}
      {!loading && !error && !snapshot ? (
        <InlineNotice tone={emptyTone} title={emptyTitle}>
          {emptyMessage}
        </InlineNotice>
      ) : null}
      {snapshot ? (
        <>
          <MetricGrid metrics={metrics} />
          <BeltBlockStrip
            snapshot={snapshot}
            quality={quality}
            valueAccessor={inspectionValueAccessor}
          />
          <BeltMassHistogram
            snapshot={snapshot}
            quality={quality}
            valueAccessor={inspectionValueAccessor}
          />
        </>
      ) : null}
    </article>
  );
}
