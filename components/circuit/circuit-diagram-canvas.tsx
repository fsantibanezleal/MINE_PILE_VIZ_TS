"use client";

import "@xyflow/react/dist/style.css";

import { useMemo } from "react";
import clsx from "clsx";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  type Edge,
  type Node,
  Position,
  ReactFlow,
  type NodeProps,
} from "@xyflow/react";
import type { CircuitSequenceState } from "@/lib/circuit-sequence";
import type { CircuitGraph } from "@/types/app-data";
import {
  type CircuitNodeData,
  type CircuitStageNodeData,
  layoutCircuitGraph,
} from "@/lib/graph-layout";
import { useTheme } from "@/components/shell/theme-provider";
import { getThemeCanvasPalette } from "@/lib/theme";

type CircuitFlowNode = Node<CircuitNodeData, "circuit">;
type CircuitStageNode = Node<CircuitStageNodeData, "stage">;
type CircuitFlowRenderableNode = CircuitStageNode | CircuitFlowNode;

const EMPTY_NODE_IDS = new Set<string>();
const EMPTY_EDGE_IDS = new Set<string>();

function CircuitNodeCard({ data, selected }: NodeProps<CircuitFlowNode>) {
  const nodeData = data;

  return (
    <div
      className={clsx(
        "circuit-node",
        selected && "circuit-node--selected",
        nodeData.isInSequence && !selected && "circuit-node--sequence",
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

function CircuitStageCard({ data }: NodeProps<CircuitStageNode>) {
  const nodeData = data;

  return (
    <div
      className={clsx("circuit-stage", nodeData.isActive && "circuit-stage--active")}
      data-testid={`circuit-stage-${nodeData.stageIndex}`}
    >
      <div className="circuit-stage__eyebrow">
        <span>{`Stage ${nodeData.stageIndex + 1}`}</span>
        <span>{`${nodeData.nodeCount} objects`}</span>
      </div>
      <strong>{nodeData.label}</strong>
    </div>
  );
}

const nodeTypes = {
  stage: CircuitStageCard,
  circuit: CircuitNodeCard,
};

interface CircuitDiagramCanvasProps {
  graph: CircuitGraph;
  selectedObjectId?: string;
  sequenceState?: CircuitSequenceState | null;
  onSelect?: (objectId: string) => void;
}

export function CircuitDiagramCanvas({
  graph,
  selectedObjectId,
  sequenceState,
  onSelect,
}: CircuitDiagramCanvasProps) {
  const { theme } = useTheme();
  const { stageNodes, nodes, edges } = useMemo(
    () => layoutCircuitGraph(graph.stages, graph.nodes, graph.edges),
    [graph.edges, graph.nodes, graph.stages],
  );
  const palette = getThemeCanvasPalette(theme);
  const sequenceNodeIds = sequenceState?.nodeIds ?? EMPTY_NODE_IDS;
  const sequenceEdgeIds = sequenceState?.edgeIds ?? EMPTY_EDGE_IDS;
  const hasSelection = Boolean(selectedObjectId);

  const flowStageNodes = stageNodes.map((node) => {
    const isActive =
      hasSelection &&
      node.data.memberNodeIds.some(
        (memberNodeId) =>
          memberNodeId === selectedObjectId || sequenceNodeIds.has(memberNodeId),
      );

    return {
      ...node,
      data: {
        ...node.data,
        isActive,
      },
      style: {
        ...node.style,
        opacity: !hasSelection ? 1 : isActive ? 1 : 0.38,
      },
    } satisfies CircuitStageNode;
  });
  const flowNodes = nodes.map((node) => ({
    ...node,
    selected: node.id === selectedObjectId,
    data: {
      ...node.data,
      isInSequence: hasSelection && sequenceNodeIds.has(node.id),
    },
    style: {
      opacity: !hasSelection ? 1 : sequenceNodeIds.has(node.id) ? 1 : 0.26,
    },
  }));
  const flowEdges = edges.map((edge) => {
    const isInSequence = hasSelection && sequenceEdgeIds.has(edge.id);

    return {
      ...edge,
      animated: isInSequence,
      style: {
        ...edge.style,
        opacity: !hasSelection ? 1 : isInSequence ? 1 : 0.18,
        stroke: isInSequence ? palette.edgeActive : palette.edgeMuted,
        strokeWidth: isInSequence ? 2.8 : 1.4,
      },
      labelStyle: {
        ...edge.labelStyle,
        fill: isInSequence ? palette.edgeLabelActive : palette.edgeLabelMuted,
      },
    } satisfies Edge;
  });
  const renderNodes: CircuitFlowRenderableNode[] = [...flowStageNodes, ...flowNodes];

  return (
    <section className="panel panel--canvas circuit-flow__panel">
      <div className="circuit-flow__viewport">
        <ReactFlow
          nodes={renderNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          fitView
          style={{ width: "100%", height: "100%" }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          onNodeClick={(_, node) => {
            if (node.type === "circuit") {
              onSelect?.(node.id);
            }
          }}
        >
          <Background color={palette.diagramGrid} gap={24} />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            style={{
              backgroundColor: palette.diagramMinimapBackground,
              border: `1px solid ${palette.diagramMinimapBorder}`,
            }}
            nodeColor={(node) => {
              if (node.type === "stage") {
                return palette.diagramStageMinimap;
              }

              return node.id === selectedObjectId ? "#59ddff" : palette.diagramNodeMinimap;
            }}
          />
        </ReactFlow>
      </div>
    </section>
  );
}
