import dagre from "dagre";
import { Position, type Edge, type Node } from "@xyflow/react";
import type { CircuitEdge, CircuitGraph, CircuitNode } from "@/types/app-data";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 132;
const STAGE_PADDING_X = 28;
const STAGE_PADDING_TOP = 54;
const STAGE_PADDING_BOTTOM = 26;

export interface CircuitNodeData extends Record<string, unknown> {
  label: string;
  shortDescription: string;
  objectType: CircuitNode["objectType"];
  objectRole: CircuitNode["objectRole"];
  stageIndex: number;
  isProfiled: boolean;
  dimension: CircuitNode["dimension"];
  isInSequence?: boolean;
}

export interface CircuitStageNodeData extends Record<string, unknown> {
  label: string;
  stageIndex: number;
  nodeCount: number;
  memberNodeIds: string[];
  isActive?: boolean;
}

export function layoutCircuitGraph(
  stages: CircuitGraph["stages"],
  nodes: CircuitNode[],
  edges: CircuitEdge[],
): {
  stageNodes: Node<CircuitStageNodeData, "stage">[];
  nodes: Node<CircuitNodeData, "circuit">[];
  edges: Edge[];
} {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: "LR",
    ranksep: 120,
    nodesep: 48,
    marginx: 40,
    marginy: 40,
  });

  nodes.forEach((node) => {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  const laidOutNodes = nodes.map((node) => {
    const position = graph.node(node.id);

    return {
      id: node.id,
      type: "circuit",
      position: {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2,
      },
      data: {
        label: node.label,
        shortDescription: node.shortDescription,
        objectType: node.objectType,
        objectRole: node.objectRole,
        stageIndex: node.stageIndex,
        isProfiled: node.isProfiled,
        dimension: node.dimension,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      zIndex: 10,
    } satisfies Node<CircuitNodeData, "circuit">;
  });

  const stageNodes: Node<CircuitStageNodeData, "stage">[] = stages.flatMap((stage) => {
      const memberNodes = laidOutNodes.filter((node) => stage.nodeIds.includes(node.id));

      if (memberNodes.length === 0) {
        return [];
      }

      const minX = Math.min(...memberNodes.map((node) => node.position.x));
      const minY = Math.min(...memberNodes.map((node) => node.position.y));
      const maxRight = Math.max(
        ...memberNodes.map((node) => node.position.x + NODE_WIDTH),
      );
      const maxBottom = Math.max(
        ...memberNodes.map((node) => node.position.y + NODE_HEIGHT),
      );

      return [
        {
        id: `stage-${stage.index}`,
        type: "stage",
        position: {
          x: minX - STAGE_PADDING_X,
          y: minY - STAGE_PADDING_TOP,
        },
        data: {
          label: stage.label,
          stageIndex: stage.index,
          nodeCount: memberNodes.length,
          memberNodeIds: memberNodes.map((node) => node.id),
        },
        draggable: false,
        selectable: false,
        focusable: false,
        zIndex: 0,
        style: {
          width: maxRight - minX + STAGE_PADDING_X * 2,
          height: maxBottom - minY + STAGE_PADDING_TOP + STAGE_PADDING_BOTTOM,
          pointerEvents: "none",
        },
        } satisfies Node<CircuitStageNodeData, "stage">,
      ];
    });

  return {
    stageNodes,
    nodes: laidOutNodes,
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      animated: false,
      style: { stroke: "rgba(89, 221, 255, 0.45)", strokeWidth: 1.6 },
      labelStyle: { fill: "#94abc4", fontSize: 11 },
      type: "smoothstep",
    })),
  };
}
