"use client";

import { TransportSemanticsPanel } from "@/components/ui/transport-semantics-panel";
import { WorkspaceJumpLinks } from "@/components/ui/workspace-jump-links";
import { formatMassTon, formatNumber, formatTimestamp } from "@/lib/format";
import { deriveTransportNodeSemantics } from "@/lib/transport-semantics";
import type { CircuitGraph, GraphAnchor, CircuitNode, ObjectSummary } from "@/types/app-data";

interface CircuitInspectorProps {
  graph: CircuitGraph;
  node?: CircuitNode;
  summary?: ObjectSummary;
  relatedObjectLabels?: Record<string, string>;
}

function AnchorInventory({
  title,
  anchors,
  relatedObjectLabels,
}: {
  title: string;
  anchors: GraphAnchor[];
  relatedObjectLabels?: Record<string, string>;
}) {
  return (
    <div className="anchor-list">
      <div className="anchor-list__title">{title}</div>
      {anchors.length > 0 ? (
        anchors.map((anchor) => (
          <div key={anchor.id} className="anchor-list__item">
            <div className="anchor-list__meta">
              <strong>{anchor.label}</strong>
              <span>{anchor.id}</span>
            </div>
            <span>
              {relatedObjectLabels?.[anchor.relatedObjectId] ?? anchor.relatedObjectId}
            </span>
          </div>
        ))
      ) : (
        <p className="muted-text anchor-list__empty">None configured.</p>
      )}
    </div>
  );
}

export function CircuitInspector({
  graph,
  node,
  summary,
  relatedObjectLabels,
}: CircuitInspectorProps) {
  if (!node) {
    return (
      <aside className="panel panel--inspector">
        <div className="section-label">Object Focus</div>
        <p className="muted-text">
          Select an object from the illustration, the diagram, or the selector to inspect
          its role, current summary, and modeled anchors.
        </p>
      </aside>
    );
  }

  const semantics = deriveTransportNodeSemantics(graph, node.id);

  return (
    <aside className="panel panel--inspector">
      <div className="section-label">Object Focus</div>
      <h3>{node.label}</h3>
      <p className="muted-text">{node.shortDescription}</p>
      <div className="metric-grid">
        <div className="metric-card">
          <span>Role</span>
          <strong>{node.objectRole}</strong>
        </div>
        <div className="metric-card">
          <span>Type</span>
          <strong>{node.objectType}</strong>
        </div>
        <div className="metric-card">
          <span>Stage</span>
          <strong>{node.stageIndex + 1}</strong>
        </div>
        <div className="metric-card">
          <span>Dimension</span>
          <strong>{node.dimension}D</strong>
        </div>
      </div>
      {summary ? (
        <>
          <div className="metric-grid">
            <div className="metric-card">
              <span>Mass</span>
              <strong>{formatMassTon(summary.massTon)}</strong>
            </div>
            <div className="metric-card">
              <span>Status</span>
              <strong>{summary.status}</strong>
            </div>
            <div className="metric-card">
              <span>Latest UTC</span>
              <strong>{formatTimestamp(summary.timestamp)}</strong>
            </div>
            <div className="metric-card">
              <span>Profiled</span>
              <strong>{node.isProfiled ? "Yes" : "No"}</strong>
            </div>
          </div>
          <div className="quality-list">
            {Object.entries(summary.qualityValues)
              .slice(0, 8)
              .map(([qualityId, value]) => (
                <div key={qualityId} className="quality-list__item">
                  <span>{qualityId}</span>
                  <strong>
                    {value === null
                      ? "N/A"
                      : typeof value === "number"
                        ? formatNumber(value)
                        : value}
                  </strong>
                </div>
              ))}
          </div>
        </>
      ) : (
        <p className="muted-text">
          No current runtime summary is available for this object in the loaded cache.
        </p>
      )}
      {semantics ? <TransportSemanticsPanel semantics={semantics} /> : null}
      <AnchorInventory
        title={`Feed anchors (${node.inputs.length})`}
        anchors={node.inputs}
        relatedObjectLabels={relatedObjectLabels}
      />
      <AnchorInventory
        title={`Discharge anchors (${node.outputs.length})`}
        anchors={node.outputs}
        relatedObjectLabels={relatedObjectLabels}
      />
      <WorkspaceJumpLinks
        objectId={node.objectId}
        objectType={node.objectType}
        isProfiled={node.isProfiled}
      />
    </aside>
  );
}
