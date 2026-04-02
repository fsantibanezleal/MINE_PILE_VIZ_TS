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
  showInFigureAnchors?: boolean;
  children: ReactNode;
}

interface PileInFigureAnchorLayerProps {
  anchors: GraphAnchor[];
  kind: "input" | "output";
}

function PileInFigureAnchorLayer({
  anchors,
  kind,
}: PileInFigureAnchorLayerProps) {
  const placements = getStockpileAnchorPlacements(anchors);
  const token = kind === "input" ? "F" : "D";

  if (placements.length === 0) {
    return null;
  }

  return (
    <div
      className={`pile-anchor-overlay pile-anchor-overlay--${kind}`}
      data-testid={`pile-anchor-overlay-${kind}`}
      aria-hidden="true"
    >
      {placements.map(({ anchor, normalizedX }, index) => (
        <div
          key={anchor.id}
          className={`pile-anchor-overlay__item pile-anchor-overlay__item--${kind}`}
          style={{ left: `${normalizedX * 100}%` }}
          title={anchor.label}
        >
          <span className="pile-anchor-overlay__line" />
          <span className="pile-anchor-overlay__marker">
            {token}
            {index + 1}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PileAnchorFrame({
  inputs,
  outputs,
  showInFigureAnchors = false,
  children,
}: PileAnchorFrameProps) {
  if (inputs.length === 0 && outputs.length === 0) {
    return <>{children}</>;
  }

  return (
    <div className="pile-visual-frame">
      <PileAnchorTrack title={`Feeds (${inputs.length})`} anchors={inputs} kind="input" />
      <div className="pile-visual-frame__content">
        {showInFigureAnchors ? (
          <>
            <PileInFigureAnchorLayer anchors={inputs} kind="input" />
            <PileInFigureAnchorLayer anchors={outputs} kind="output" />
          </>
        ) : null}
        {children}
      </div>
      <PileAnchorTrack
        title={`Discharges (${outputs.length})`}
        anchors={outputs}
        kind="output"
      />
    </div>
  );
}
