import dagre from "dagre";
import { Position, type Edge, type Node } from "@xyflow/react";
import type { CircuitEdge, CircuitNode } from "@/types/app-data";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 132;

export interface CircuitNodeData extends Record<string, unknown> {
  label: string;
  shortDescription: string;
  objectType: CircuitNode["objectType"];
  objectRole: CircuitNode["objectRole"];
  stageIndex: number;
  isProfiled: boolean;
  dimension: CircuitNode["dimension"];
}

export function layoutCircuitGraph(
  nodes: CircuitNode[],
  edges: CircuitEdge[],
): {
  nodes: Node<CircuitNodeData>[];
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

  return {
    nodes: nodes.map((node) => {
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
      };
    }),
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
