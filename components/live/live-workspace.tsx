"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  BeltSnapshot,
  CircuitGraph,
  ObjectRegistryEntry,
  ObjectSummary,
  QualityDefinition,
} from "@/types/app-data";
import { BeltBlockStrip } from "@/components/live/belt-block-strip";
import { BeltMassHistogram } from "@/components/live/belt-mass-histogram";
import { InlineNotice } from "@/components/ui/inline-notice";
import { MaterialTimePanel } from "@/components/ui/material-time-panel";
import { MaterialTimeModeSelector } from "@/components/ui/material-time-mode-selector";
import { MetricGrid } from "@/components/ui/metric-grid";
import { ProfiledPropertiesPanel } from "@/components/ui/profiled-properties-panel";
import { QualityLegend } from "@/components/ui/quality-legend";
import { QualitySelector } from "@/components/ui/quality-selector";
import { RelationshipPanel } from "@/components/ui/relationship-panel";
import { RouteBasisPanel } from "@/components/ui/route-basis-panel";
import { WorkspaceJumpLinks } from "@/components/ui/workspace-jump-links";
import { formatMassTon, formatTimestamp } from "@/lib/format";
import { deriveLiveBeltRouteContext } from "@/lib/live-belt-context";
import { buildMaterialTimeSummary } from "@/lib/material-time";
import {
  getMaterialTimeDefinition,
  getMaterialTimeValue,
  type MaterialTimeMode,
} from "@/lib/material-time-view";
import {
  buildHrefWithQuery,
  resolveQuerySelection,
} from "@/lib/workspace-route-state";

interface LiveWorkspaceProps {
  graph: CircuitGraph;
  summaries: ObjectSummary[];
  registry: ObjectRegistryEntry[];
  qualities: QualityDefinition[];
  initialBelt: BeltSnapshot;
}

export function LiveWorkspace({
  graph,
  summaries,
  registry,
  qualities,
  initialBelt,
}: LiveWorkspaceProps) {
  const materialTimeModes: MaterialTimeMode[] = [
    "property",
    "oldest-age",
    "newest-age",
    "material-span",
  ];
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const beltEntries = registry.filter((entry) => entry.objectType === "belt" && entry.liveRef);
  const beltIds = beltEntries.map((entry) => entry.objectId);
  const initialSelectedBeltId = resolveQuerySelection(
    searchParams.get("object"),
    beltIds,
    initialBelt.objectId,
  );
  const initialSelectedQualityId = resolveQuerySelection(
    searchParams.get("quality"),
    qualities.map((quality) => quality.id),
    qualities[0]?.id ?? "",
  );
  const initialSelectedTimeMode = resolveQuerySelection(
    searchParams.get("timemode"),
    materialTimeModes,
    "property",
  ) as MaterialTimeMode;
  const [selectedBeltId, setSelectedBeltId] = useState(initialSelectedBeltId);
  const [selectedQualityId, setSelectedQualityId] = useState(initialSelectedQualityId);
  const [selectedTimeMode, setSelectedTimeMode] = useState(initialSelectedTimeMode);
  const [currentBelt, setCurrentBelt] = useState(initialBelt);
  const [loading, setLoading] = useState(initialSelectedBeltId !== initialBelt.objectId);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedQuality = qualities.find((quality) => quality.id === selectedQualityId);
  const inspectionQuality =
    selectedTimeMode === "property"
      ? selectedQuality
      : getMaterialTimeDefinition(selectedTimeMode);
  const selectedBeltEntry = beltEntries.find((entry) => entry.objectId === selectedBeltId);
  const selectedBeltSummary = summaries.find(
    (summary) => summary.objectId === selectedBeltId,
  );
  const inspectionBeltRouteContext = useMemo(
    () => deriveLiveBeltRouteContext(graph, selectedBeltId),
    [graph, selectedBeltId],
  );
  const beltTimeSummary = useMemo(
    () => buildMaterialTimeSummary(currentBelt.blocks, currentBelt.timestamp),
    [currentBelt.blocks, currentBelt.timestamp],
  );
  const inspectionValueAccessor = useMemo(
    () =>
      selectedTimeMode === "property"
        ? undefined
        : (block: BeltSnapshot["blocks"][number]) =>
            getMaterialTimeValue(block, selectedTimeMode, currentBelt.timestamp),
    [currentBelt.timestamp, selectedTimeMode],
  );

  useEffect(() => {
    if (selectedBeltId === currentBelt.objectId) {
      return;
    }

    let cancelled = false;

    fetch(`/api/live/belts/${selectedBeltId}`)
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | {
                error?: {
                  message?: string;
                };
              }
            | null;
          throw new Error(
            payload?.error?.message ?? "Failed to load live belt snapshot.",
          );
        }

        return (await response.json()) as BeltSnapshot;
      })
      .then((payload) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setCurrentBelt(payload);
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load live belt snapshot.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentBelt.objectId, selectedBeltId]);

  function handleSelectBelt(nextBeltId: string) {
    setSelectedBeltId(nextBeltId);
    setLoadError(null);

    if (nextBeltId !== currentBelt.objectId) {
      setLoading(true);
    }

    router.replace(
      buildHrefWithQuery(pathname, searchParams, {
        object: nextBeltId,
      }),
      {
        scroll: false,
      },
    );
  }

  function handleSelectQuality(nextQualityId: string) {
    setSelectedQualityId(nextQualityId);
    router.replace(
      buildHrefWithQuery(pathname, searchParams, {
        quality: nextQualityId,
      }),
      {
        scroll: false,
      },
    );
  }

  function handleSelectTimeMode(nextMode: MaterialTimeMode) {
    setSelectedTimeMode(nextMode);
    router.replace(
      buildHrefWithQuery(pathname, searchParams, {
        timemode: nextMode,
      }),
      {
        scroll: false,
      },
    );
  }

  return (
    <div className="workspace-grid workspace-grid--double">
      <aside className="panel">
        <div className="section-label">Selection</div>
        <label className="field">
          <span>Current belt</span>
          <select
            value={selectedBeltId}
            onChange={(event) => handleSelectBelt(event.target.value)}
          >
            {beltEntries.map((entry) => (
              <option key={entry.objectId} value={entry.objectId}>
                {entry.displayName}
              </option>
            ))}
          </select>
        </label>
        <QualitySelector
          label="Quality"
          qualities={qualities}
          value={selectedQualityId}
          onChange={handleSelectQuality}
        />
        <MaterialTimeModeSelector
          value={selectedTimeMode}
          onChange={handleSelectTimeMode}
          label="Inspection mode"
        />
        <MetricGrid
          metrics={[
            { label: "Live belts", value: String(beltEntries.length) },
            {
              label: "Current mass",
              value: formatMassTon(currentBelt.totalMassTon),
            },
            {
              label: "Latest UTC",
              value: formatTimestamp(currentBelt.timestamp),
            },
            {
              label: "Blocks",
              value: String(currentBelt.blockCount),
            },
          ]}
        />
        <RouteBasisPanel
          source="Current dense belt snapshot"
          resolution="Dense ordered belt blocks"
          timeBasis="Latest runtime state from 06_models"
          note="This route is intentionally current-state only. It avoids replay or topology-first reading so the operator can focus on what is physically present on one transport object right now."
        />
        {inspectionBeltRouteContext ? (
          <RelationshipPanel
            title="Inspection belt route context"
            summary="The inspected belt still keeps minimal structural context so the current dense strip can be read against its immediate modeled neighborhood without redrawing the full circuit."
            metrics={[
              {
                label: "Stage",
                value: `${inspectionBeltRouteContext.stageIndex + 1}: ${inspectionBeltRouteContext.stageLabel}`,
              },
              {
                label: "Receives from",
                value: String(inspectionBeltRouteContext.upstreamNodes.length),
              },
              {
                label: "Feeds into",
                value: String(inspectionBeltRouteContext.downstreamNodes.length),
              },
              {
                label: "Stage peers",
                value: String(inspectionBeltRouteContext.stagePeers.length),
              },
            ]}
            groups={[
              {
                label: "Upstream objects",
                items: inspectionBeltRouteContext.upstreamNodes.map((node) => node.label),
              },
              {
                label: "Downstream objects",
                items: inspectionBeltRouteContext.downstreamNodes.map((node) => node.label),
              },
            ]}
          />
        ) : null}
        <MaterialTimePanel summary={beltTimeSummary} />
        <ProfiledPropertiesPanel
          qualities={qualities}
          values={currentBelt.qualityAverages}
          records={currentBelt.blocks}
          totalMassTon={currentBelt.totalMassTon}
        />
        <WorkspaceJumpLinks
          objectId={selectedBeltId}
          objectType={selectedBeltEntry?.objectType}
          isProfiled={selectedBeltEntry?.isProfiled}
        />
      </aside>

      <section className="panel panel--canvas panel--stack">
        {loadError ? (
          <InlineNotice tone="error" title="Live belt snapshot unavailable">
            {loadError}
          </InlineNotice>
        ) : null}
        {loading ? <div className="loading-banner">Loading belt snapshot...</div> : null}
        {selectedTimeMode !== "property" ? (
          <InlineNotice tone="info" title="Material time mode active">
            The strip and histogram are reading represented material timestamps
            relative to the current snapshot instead of one tracked quality.
          </InlineNotice>
        ) : null}
        <div className="belt-strip-panel">
          <div className="section-label">Current belt content</div>
          <h3>{currentBelt.displayName}</h3>
          <p className="muted-text">
            Dense current-state blocks from the selected belt. This route does
            not redraw the circuit; it stays on the ordered content actually
            present on the inspected transport object.
          </p>
          <QualityLegend quality={inspectionQuality} />
          <BeltBlockStrip
            snapshot={currentBelt}
            quality={inspectionQuality}
            valueAccessor={inspectionValueAccessor}
          />
        </div>
        <div className="belt-strip-panel">
          <div className="section-label">Mass-weighted histogram</div>
          <BeltMassHistogram
            snapshot={currentBelt}
            quality={inspectionQuality}
            valueAccessor={inspectionValueAccessor}
          />
        </div>
        {selectedBeltSummary ? (
          <MetricGrid
            metrics={[
              {
                label: "Status",
                value: selectedBeltSummary.status,
              },
              {
                label: "Summary mass",
                value: formatMassTon(selectedBeltSummary.massTon),
              },
              {
                label: "Tracked quality",
                value: inspectionQuality?.label ?? "Pending",
              },
            ]}
          />
        ) : null}
      </section>
    </div>
  );
}
