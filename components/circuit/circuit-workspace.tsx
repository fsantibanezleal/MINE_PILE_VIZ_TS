"use client";

import { useMemo, useState } from "react";
import type { CircuitGraph, ObjectSummary } from "@/types/app-data";
import { CircuitDiagramCanvas } from "@/components/circuit/circuit-diagram-canvas";
import { CircuitIllustration } from "@/components/circuit/circuit-illustration";
import { CircuitInspector } from "@/components/circuit/circuit-inspector";
import { MetricGrid } from "@/components/ui/metric-grid";

type CircuitWorkspaceMode = "illustration-2d" | "illustration-3d" | "diagram";

interface CircuitWorkspaceProps {
  graph: CircuitGraph;
  summaries: ObjectSummary[];
}

function getInitialSelection(graph: CircuitGraph) {
  return (
    graph.nodes.find((node) => node.objectRole === "physical")?.id ??
    graph.nodes[0]?.id ??
    ""
  );
}

export function CircuitWorkspace({ graph, summaries }: CircuitWorkspaceProps) {
  const [mode, setMode] = useState<CircuitWorkspaceMode>("illustration-2d");
  const [selectedObjectId, setSelectedObjectId] = useState(getInitialSelection(graph));

  const selectedNode = useMemo(
    () => graph.nodes.find((node) => node.id === selectedObjectId),
    [graph.nodes, selectedObjectId],
  );
  const selectedSummary = useMemo(
    () => summaries.find((summary) => summary.objectId === selectedObjectId),
    [selectedObjectId, summaries],
  );
  const physicalCount = graph.nodes.filter((node) => node.objectRole === "physical").length;
  const virtualCount = graph.nodes.length - physicalCount;

  return (
    <div className="workspace-grid workspace-grid--triple">
      <aside className="panel">
        <div className="section-label">View Control</div>
        <div className="button-row">
          <button
            type="button"
            className={`segmented-button ${mode === "illustration-2d" ? "segmented-button--active" : ""}`}
            onClick={() => setMode("illustration-2d")}
          >
            Illustration 2D
          </button>
          <button
            type="button"
            className={`segmented-button ${mode === "illustration-3d" ? "segmented-button--active" : ""}`}
            onClick={() => setMode("illustration-3d")}
          >
            Illustration 3D
          </button>
          <button
            type="button"
            className={`segmented-button ${mode === "diagram" ? "segmented-button--active" : ""}`}
            onClick={() => setMode("diagram")}
          >
            Diagram
          </button>
        </div>
        <p className="muted-text">
          The default landing view is illustrative. The diagram remains available as a
          structural reading, but it is no longer the primary visual language of this page.
        </p>
        <label className="field">
          <span>Focus object</span>
          <select
            value={selectedObjectId}
            onChange={(event) => setSelectedObjectId(event.target.value)}
          >
            {graph.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label}
              </option>
            ))}
          </select>
        </label>
        <MetricGrid
          metrics={[
            { label: "Stages", value: String(graph.stages.length) },
            { label: "Physical objects", value: String(physicalCount) },
            { label: "Virtual objects", value: String(virtualCount) },
          ]}
        />
      </aside>

      {mode === "diagram" ? (
        <CircuitDiagramCanvas
          graph={graph}
          selectedObjectId={selectedObjectId}
          onSelect={setSelectedObjectId}
        />
      ) : (
        <CircuitIllustration
          graph={graph}
          selectedObjectId={selectedObjectId}
          onSelect={setSelectedObjectId}
          mode={mode}
        />
      )}

      <CircuitInspector node={selectedNode} summary={selectedSummary} />
    </div>
  );
}
