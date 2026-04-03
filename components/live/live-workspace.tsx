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
import { CircuitFlow } from "@/components/circuit/circuit-flow";
import { BeltBlockStrip } from "@/components/live/belt-block-strip";
import { BeltMassHistogram } from "@/components/live/belt-mass-histogram";
import { InlineNotice } from "@/components/ui/inline-notice";
import { MaterialTimePanel } from "@/components/ui/material-time-panel";
import { MaterialTimeModeSelector } from "@/components/ui/material-time-mode-selector";
import { MetricGrid } from "@/components/ui/metric-grid";
import { ProfiledPropertiesPanel } from "@/components/ui/profiled-properties-panel";
import { QualitySelector } from "@/components/ui/quality-selector";
import { RelationshipPanel } from "@/components/ui/relationship-panel";
import { RouteBasisPanel } from "@/components/ui/route-basis-panel";
import { TransportSemanticsPanel } from "@/components/ui/transport-semantics-panel";
import { WorkspaceJumpLinks } from "@/components/ui/workspace-jump-links";
import { formatMassTon, formatTimestamp } from "@/lib/format";
import { buildMaterialTimeSummary } from "@/lib/material-time";
import {
  getMaterialTimeDefinition,
  getMaterialTimeValue,
  type MaterialTimeMode,
} from "@/lib/material-time-view";
import { deriveTransportNodeSemantics } from "@/lib/transport-semantics";
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
  const allObjectIds = registry.map((entry) => entry.objectId);
  const beltEntries = registry.filter((entry) => entry.objectType === "belt" && entry.liveRef);
  const beltIds = beltEntries.map((entry) => entry.objectId);
  const initialSelectedObjectId = resolveQuerySelection(
    searchParams.get("object"),
    allObjectIds,
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
  const initialSelectedBeltId = beltIds.includes(initialSelectedObjectId)
    ? initialSelectedObjectId
    : initialBelt.objectId;
  const [selectedObjectId, setSelectedObjectId] = useState(initialSelectedObjectId);
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
  const selectedSummary = summaries.find((summary) => summary.objectId === selectedObjectId);
  const selectedRegistryEntry = registry.find((entry) => entry.objectId === selectedObjectId);
  const selectedNode = graph.nodes.find((node) => node.objectId === selectedObjectId);
  const selectedBeltEntry = beltEntries.find(
    (entry) => entry.objectId === selectedBeltId,
  );
  const selectedBeltSummary = summaries.find(
    (summary) => summary.objectId === selectedBeltId,
  );
  const focusedObjectDiffersFromInspectionBelt = selectedObjectId !== selectedBeltId;
  const transportSemantics = useMemo(
    () =>
      selectedNode ? deriveTransportNodeSemantics(graph, selectedNode.id) : null,
    [graph, selectedNode],
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

  function handleSelectObject(nextObjectId: string) {
    const beltEntry = beltEntries.find((entry) => entry.objectId === nextObjectId);

    setSelectedObjectId(nextObjectId);
    router.replace(
      buildHrefWithQuery(pathname, searchParams, {
        object: nextObjectId,
      }),
      {
        scroll: false,
      },
    );

    if (!beltEntry) {
      return;
    }

    setSelectedBeltId(nextObjectId);

    if (nextObjectId !== currentBelt.objectId) {
      setLoading(true);
      setLoadError(null);
    }
  }

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
    <div className="workspace-grid workspace-grid--triple">
      <aside className="panel">
        <div className="section-label">Selection</div>
        <label className="field">
          <span>Inspection belt</span>
          <select
            value={selectedBeltId}
            onChange={(event) => handleSelectObject(event.target.value)}
          >
            {beltEntries.map((entry) => (
              <option key={entry.objectId} value={entry.objectId}>
                {entry.displayName}
              </option>
            ))}
          </select>
        </label>
        <QualitySelector
          label="Color by"
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
            { label: "Tracked objects", value: String(registry.length) },
            {
              label: "Graph focus",
              value: selectedSummary?.displayName ?? currentBelt.displayName,
            },
            {
              label: "Quality kind",
              value: inspectionQuality?.kind ?? "Pending",
            },
          ]}
        />
      </aside>

      <section className="panel panel--canvas panel--stack">
        {loadError ? (
          <InlineNotice tone="error" title="Live belt snapshot unavailable">
            {loadError}
          </InlineNotice>
        ) : null}
        {loading ? <div className="loading-banner">Loading belt snapshot...</div> : null}
        <CircuitFlow
          graph={graph}
          summaries={summaries}
          selectedObjectId={selectedObjectId}
          onSelect={handleSelectObject}
        />
        <div className="belt-strip-panel">
          <div className="section-label">Current belt content</div>
          {focusedObjectDiffersFromInspectionBelt ? (
            <InlineNotice tone="info" title="Graph focus is contextual">
              The graph focus is {selectedSummary?.displayName ?? selectedObjectId}, but the
              dense live content below stays on {currentBelt.displayName}. Use the belt selector
              on the left to change which current transport strip is being inspected.
            </InlineNotice>
          ) : null}
          {selectedTimeMode !== "property" ? (
            <InlineNotice tone="info" title="Material time mode active">
              The block strip and histogram are using represented material timestamps
              relative to the current belt snapshot instead of a tracked property.
            </InlineNotice>
          ) : null}
          <BeltBlockStrip
            snapshot={currentBelt}
            quality={inspectionQuality}
            valueAccessor={inspectionValueAccessor}
          />
          <div className="section-label">Mass-weighted histogram</div>
          <BeltMassHistogram
            snapshot={currentBelt}
            quality={inspectionQuality}
            valueAccessor={inspectionValueAccessor}
          />
        </div>
      </section>

      <aside className="panel">
        <div className="section-label">Current belt snapshot</div>
        <h3>{currentBelt.displayName}</h3>
        <MetricGrid
          metrics={[
            {
              label: "Status",
              value: selectedBeltSummary?.status ?? "Updated",
            },
            {
              label: "Current mass",
              value: formatMassTon(currentBelt.totalMassTon),
            },
            {
              label: "Latest UTC",
              value: formatTimestamp(currentBelt.timestamp),
            },
            {
              label: "Inspection belt",
              value: selectedBeltEntry?.displayName ?? currentBelt.displayName,
            },
          ]}
        />
        <RouteBasisPanel
          source="Current belt snapshot"
          resolution="Dense ordered blocks"
          timeBasis="Current runtime state"
          note="This route is always belt-centric. Use graph selection for structural context, but use the inspection belt selector to choose which dense live transport strip and histogram are being read."
        />
        {focusedObjectDiffersFromInspectionBelt ? (
          <RelationshipPanel
            title="Graph focus context"
            summary="The selected graph object remains available as context, but the right-side evidence stays tied to the currently inspected belt."
            metrics={[
              {
                label: "Focused object",
                value: selectedSummary?.displayName ?? selectedObjectId,
              },
              {
                label: "Focused type",
                value: selectedRegistryEntry?.objectType ?? "Unknown",
              },
              {
                label: "Current belt",
                value: currentBelt.displayName,
              },
            ]}
          />
        ) : null}
        {transportSemantics ? (
          <TransportSemanticsPanel
            semantics={transportSemantics}
            title={
              focusedObjectDiffersFromInspectionBelt
                ? "Focused object semantics"
                : "Inspection belt semantics"
            }
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
          objectId={selectedObjectId}
          objectType={selectedRegistryEntry?.objectType}
          isProfiled={selectedRegistryEntry?.isProfiled}
        />
      </aside>
    </div>
  );
}
