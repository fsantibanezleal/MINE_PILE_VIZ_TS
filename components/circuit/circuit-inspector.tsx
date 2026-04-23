"use client";

import { TransportSemanticsPanel } from "@/components/ui/transport-semantics-panel";
import { VisualEvidencePanel } from "@/components/ui/visual-evidence-panel";
import { WorkspaceJumpLinks } from "@/components/ui/workspace-jump-links";
import { formatMassTon, formatTimestamp } from "@/lib/format";
import { deriveTransportNodeSemantics } from "@/lib/transport-semantics";
import type {
  CircuitGraph,
  GraphAnchor,
  CircuitNode,
  ObjectSummary,
} from "@/types/app-data";

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
        <div className="section-label">Selected circuit object</div>
        <p className="muted-text">
          Select an object from the illustration, the diagram, or the selector to inspect
          its stage role, flow semantics, and modeled anchors.
        </p>
      </aside>
    );
  }

  const semantics = deriveTransportNodeSemantics(graph, node.id);

  return (
    <aside className="panel panel--inspector">
      <div className="section-label">Selected circuit object</div>
      <h3>{node.label}</h3>
      <p className="muted-text">{node.shortDescription}</p>
      <div className="metric-grid">
        <div className="metric-card">
          <span>Modeled role</span>
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
        <div className="metric-card">
          <span>Feed anchors</span>
          <strong>{node.inputs.length}</strong>
        </div>
        <div className="metric-card">
          <span>Discharge anchors</span>
          <strong>{node.outputs.length}</strong>
        </div>
      </div>
      <VisualEvidencePanel
        title="Visual reading notes"
        summary="Circuit stays structural. The view is meant to explain configured sequence, stage grouping, and object relationships before any detailed current or historical content reading."
        notes={[
          {
            label: "Stage frames encode",
            text: "A fixed-height left-to-right process board, so stage order reads as sequence rather than as absolute physical plant coordinates.",
          },
          {
            label: "Object forms encode",
            text: "Modeled transport and accumulation roles, not dense material content or profiled mass evidence.",
          },
          {
            label: "Anchor marks encode",
            text: "Configured feed and discharge geometry from the circuit contract, including relative position and configured span where available.",
          },
        ]}
      />
      <details className="inspector-stack inspector-stack--collapsed-context">
        <summary className="section-label">Cross-route context</summary>
        {summary ? (
          <>
            <p className="muted-text">
              Runtime values stay secondary here. They are shown only as reference for the
              selected object and do not drive the default structural reading.
            </p>
            <div className="metric-grid">
              <div className="metric-card">
                <span>Runtime mass</span>
                <strong>{formatMassTon(summary.massTon)}</strong>
              </div>
              <div className="metric-card">
                <span>Summary status</span>
                <strong>{summary.status}</strong>
              </div>
              <div className="metric-card">
                <span>Latest live UTC</span>
                <strong>{formatTimestamp(summary.timestamp)}</strong>
              </div>
              <div className="metric-card">
                <span>Profiled</span>
                <strong>{node.isProfiled ? "Yes" : "No"}</strong>
              </div>
            </div>
          </>
        ) : (
          <p className="muted-text">
            No current runtime reference is available for this object in the loaded cache.
          </p>
        )}
      </details>
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
