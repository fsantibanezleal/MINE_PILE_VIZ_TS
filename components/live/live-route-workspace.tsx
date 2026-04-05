"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  BeltSnapshot,
  CircuitGraph,
  ObjectRegistryEntry,
  ObjectSummary,
  QualityDefinition,
} from "@/types/app-data";
import { LiveWorkspace } from "@/components/live/live-workspace";
import { StockpileWorkspace } from "@/components/stockpiles/stockpile-workspace";
import { InlineNotice } from "@/components/ui/inline-notice";
import {
  buildHrefWithQuery,
  resolveQuerySelection,
} from "@/lib/workspace-route-state";

type LiveSubview = "belts" | "piles";

interface LiveRouteWorkspaceProps {
  graph: CircuitGraph;
  summaries: ObjectSummary[];
  registry: ObjectRegistryEntry[];
  qualities: QualityDefinition[];
  initialBelt: BeltSnapshot | null;
  pileEntries: ObjectRegistryEntry[];
  initialPileId: string | null;
}

export function LiveRouteWorkspace({
  graph,
  summaries,
  registry,
  qualities,
  initialBelt,
  pileEntries,
  initialPileId,
}: LiveRouteWorkspaceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const availableViews: LiveSubview[] = [
    ...(initialBelt ? (["belts"] as const) : []),
    ...(initialPileId ? (["piles"] as const) : []),
  ];
  const selectedView = resolveQuerySelection(
    searchParams.get("view"),
    availableViews,
    initialBelt ? "belts" : "piles",
  ) as LiveSubview;

  function handleSelectView(nextView: LiveSubview) {
    if (nextView === selectedView) {
      return;
    }

    router.replace(
      buildHrefWithQuery(pathname, searchParams, {
        view: nextView,
      }),
      {
        scroll: false,
      },
    );
  }

  return (
    <div className="panel panel--stack">
      <div className="button-row">
        {initialBelt ? (
          <button
            type="button"
            className={`segmented-button ${selectedView === "belts" ? "segmented-button--active" : ""}`}
            onClick={() => handleSelectView("belts")}
          >
            Belts / VBelts
          </button>
        ) : null}
        {initialPileId ? (
          <button
            type="button"
            className={`segmented-button ${selectedView === "piles" ? "segmented-button--active" : ""}`}
            onClick={() => handleSelectView("piles")}
          >
            Piles / VPiles
          </button>
        ) : null}
      </div>

      {selectedView === "belts" ? (
        initialBelt ? (
          <LiveWorkspace
            key="live-belts"
            graph={graph}
            summaries={summaries}
            registry={registry}
            qualities={qualities}
            initialBelt={initialBelt}
          />
        ) : (
          <InlineNotice tone="warning" title="Dense belt snapshots unavailable">
            The configured cache exposes current dense pile datasets, but no current dense belt
            snapshots.
          </InlineNotice>
        )
      ) : initialPileId ? (
        <StockpileWorkspace
          key="live-piles"
          pileEntries={pileEntries}
          qualities={qualities}
          initialPileId={initialPileId}
          variant="live"
        />
      ) : (
        <InlineNotice tone="warning" title="Dense pile snapshots unavailable">
          The configured cache exposes current dense belt snapshots, but no current dense pile
          datasets.
        </InlineNotice>
      )}
    </div>
  );
}
