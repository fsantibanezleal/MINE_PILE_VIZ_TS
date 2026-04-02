"use client";

import "@xyflow/react/dist/style.css";

import { useState } from "react";
import clsx from "clsx";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  type Node,
  Position,
  ReactFlow,
  type NodeProps,
} from "@xyflow/react";
import type { CircuitGraph, ObjectSummary } from "@/types/app-data";
import {
  type CircuitNodeData,
  layoutCircuitGraph,
} from "@/lib/graph-layout";
import { formatMassTon } from "@/lib/format";

type CircuitFlowNode = Node<CircuitNodeData, "circuit">;

function CircuitNodeCard({ data, selected }: NodeProps<CircuitFlowNode>) {
  const nodeData = data;

  return (
    <div
      className={clsx(
        "circuit-node",
        selected && "circuit-node--selected",
        nodeData.objectRole === "virtual" && "circuit-node--virtual",
      )}
    >
      <Handle type="target" position={Position.Left} className="circuit-node__handle" />
      <div className="circuit-node__header">
        <span>{nodeData.objectType.toUpperCase()}</span>
        <span>Stage {nodeData.stageIndex + 1}</span>
      </div>
      <strong>{nodeData.label}</strong>
      <p>{nodeData.shortDescription}</p>
      <div className="circuit-node__footer">
        <span>{nodeData.dimension}D</span>
        <span>{nodeData.isProfiled ? "Profiled" : "Runtime only"}</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="circuit-node__handle"
      />
    </div>
  );
}

const nodeTypes = {
  circuit: CircuitNodeCard,
};

interface CircuitFlowProps {
  graph: CircuitGraph;
  summaries: ObjectSummary[];
  selectedObjectId?: string;
  onSelect?: (objectId: string) => void;
}

export function CircuitFlow({
  graph,
  summaries,
  selectedObjectId,
  onSelect,
}: CircuitFlowProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | undefined>();
  const { nodes, edges } = layoutCircuitGraph(graph.nodes, graph.edges);
  const summaryMap = Object.fromEntries(
    summaries.map((summary) => [summary.objectId, summary]),
  );
  const selectedId = selectedObjectId ?? internalSelectedId;

  const flowNodes = nodes.map((node) => ({
    ...node,
    selected: node.id === selectedId,
    style: {
      opacity: selectedId && node.id !== selectedId ? 0.42 : 1,
    },
  }));

  const selectedSummary = selectedId ? summaryMap[selectedId] : undefined;

  return (
    <div className="circuit-grid">
      <section className="panel panel--canvas">
        <ReactFlow
          nodes={flowNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          onNodeClick={(_, node) => {
            if (!selectedObjectId) {
              setInternalSelectedId(node.id);
            }
            onSelect?.(node.id);
          }}
        >
          <Background color="rgba(91, 140, 255, 0.12)" gap={24} />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            style={{
              backgroundColor: "rgba(8, 18, 31, 0.92)",
              border: "1px solid rgba(124, 164, 201, 0.14)",
            }}
            nodeColor={(node) =>
              node.id === selectedId ? "#59ddff" : "rgba(91, 140, 255, 0.56)"
            }
          />
        </ReactFlow>
      </section>

      <aside className="panel panel--inspector">
        <div className="section-label">Object Focus</div>
        {selectedSummary ? (
          <>
            <h3>{selectedSummary.displayName}</h3>
            <p className="muted-text">
              {selectedSummary.objectType === "pile"
                ? "Accumulation object"
                : "Transport object"}
            </p>
            <div className="inspector-stack">
              <div className="metric-card">
                <span>Mass</span>
                <strong>{formatMassTon(selectedSummary.massTon)}</strong>
              </div>
              <div className="metric-card">
                <span>Status</span>
                <strong>{selectedSummary.status}</strong>
              </div>
            </div>
            <div className="quality-list">
              {Object.entries(selectedSummary.qualityValues)
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
            Select a node to inspect current mass and quality averages.
          </p>
        )}
      </aside>
    </div>
  );
}
