"use client";

import type { CircuitNode, ObjectSummary } from "@/types/app-data";
import { formatMassTon, formatTimestamp } from "@/lib/format";

interface CircuitInspectorProps {
  node?: CircuitNode;
  summary?: ObjectSummary;
}

export function CircuitInspector({ node, summary }: CircuitInspectorProps) {
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
                  <strong>{value === null ? "N/A" : value.toFixed(3)}</strong>
                </div>
              ))}
          </div>
        </>
      ) : (
        <p className="muted-text">
          No current runtime summary is available for this object in the loaded cache.
        </p>
      )}
      <div className="quality-list">
        <div className="quality-list__item">
          <span>Inputs</span>
          <strong>{node.inputs.length}</strong>
        </div>
        <div className="quality-list__item">
          <span>Outputs</span>
          <strong>{node.outputs.length}</strong>
        </div>
      </div>
    </aside>
  );
}
