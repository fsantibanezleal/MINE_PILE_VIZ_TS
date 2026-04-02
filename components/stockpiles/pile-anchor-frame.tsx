"use client";

import type { ReactNode } from "react";
import { getStockpileAnchorPlacements } from "@/lib/stockpile-anchor-layout";
import type { GraphAnchor } from "@/types/app-data";

interface PileAnchorTrackProps {
  title: string;
  anchors: GraphAnchor[];
  kind: "input" | "output";
}

function PileAnchorTrack({ title, anchors, kind }: PileAnchorTrackProps) {
  const placements = getStockpileAnchorPlacements(anchors);

  return (
    <div className={`pile-anchor-track pile-anchor-track--${kind}`}>
      <div className="pile-anchor-track__title">{title}</div>
      {placements.map(({ anchor, normalizedX }) => (
        <div
          key={anchor.id}
          className={`pile-anchor pile-anchor--${kind}`}
          style={{ left: `${normalizedX * 100}%` }}
          aria-label={anchor.label}
          title={anchor.label}
        >
          <span className="pile-anchor__label">{anchor.label}</span>
          <span className="pile-anchor__line" />
          <span className="pile-anchor__marker" />
        </div>
      ))}
    </div>
  );
}

interface PileAnchorFrameProps {
  inputs: GraphAnchor[];
  outputs: GraphAnchor[];
  children: ReactNode;
}

export function PileAnchorFrame({
  inputs,
  outputs,
  children,
}: PileAnchorFrameProps) {
  if (inputs.length === 0 && outputs.length === 0) {
    return <>{children}</>;
  }

  return (
    <div className="pile-visual-frame">
      <PileAnchorTrack title={`Feeds (${inputs.length})`} anchors={inputs} kind="input" />
      <div className="pile-visual-frame__content">{children}</div>
      <PileAnchorTrack
        title={`Discharges (${outputs.length})`}
        anchors={outputs}
        kind="output"
      />
    </div>
  );
}
