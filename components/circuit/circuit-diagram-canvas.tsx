"use client";

import "@xyflow/react/dist/style.css";

import { useMemo } from "react";
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
import type { CircuitGraph } from "@/types/app-data";
import { type CircuitNodeData, layoutCircuitGraph } from "@/lib/graph-layout";

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
      <Handle type="source" position={Position.Right} className="circuit-node__handle" />
    </div>
  );
}

const nodeTypes = {
  circuit: CircuitNodeCard,
};

interface CircuitDiagramCanvasProps {
  graph: CircuitGraph;
  selectedObjectId?: string;
  onSelect?: (objectId: string) => void;
}

export function CircuitDiagramCanvas({
  graph,
  selectedObjectId,
  onSelect,
}: CircuitDiagramCanvasProps) {
  const { nodes, edges } = useMemo(
    () => layoutCircuitGraph(graph.nodes, graph.edges),
    [graph.edges, graph.nodes],
  );

  const flowNodes = nodes.map((node) => ({
    ...node,
    selected: node.id === selectedObjectId,
    style: {
      opacity: selectedObjectId && node.id !== selectedObjectId ? 0.42 : 1,
    },
  }));

  return (
    <section className="panel panel--canvas circuit-flow__panel">
      <div className="circuit-flow__viewport">
        <ReactFlow
          nodes={flowNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          style={{ width: "100%", height: "100%" }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          onNodeClick={(_, node) => onSelect?.(node.id)}
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
              node.id === selectedObjectId ? "#59ddff" : "rgba(91, 140, 255, 0.56)"
            }
          />
        </ReactFlow>
      </div>
    </section>
  );
}
