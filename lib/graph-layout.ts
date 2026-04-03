import dagre from "dagre";
import { Position, type Edge, type Node } from "@xyflow/react";
import { buildCircuitPresentation } from "@/lib/circuit-presentation";
import type { CircuitEdge, CircuitGraph, CircuitNode } from "@/types/app-data";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 132;
const STAGE_LOCAL_X_OFFSET_SCALE = 0.32;
const STAGE_LOCAL_Y_OFFSET_SCALE = 0.42;
const MIN_STAGE_FRAME_WIDTH_SCALE = 0.94;
const BASE_PRESENTATION_STAGE_WIDTH = 360;
const BASE_PRESENTATION_STAGE_DEPTH = 18.8;

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
  const presentation = buildCircuitPresentation({ stages, nodes, edges });
  const presentationNodeMap = new Map(
    presentation.nodes.map((node) => [node.id, node]),
  );
  const presentationStageMap = new Map(
    presentation.stages.map((stage) => [stage.index, stage]),
  );
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: "LR",
    ranksep: 140,
    nodesep: 72,
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
    const presentationNode = presentationNodeMap.get(node.id);
    const presentationStage = presentationStageMap.get(node.stageIndex);
    const stageCenterX = presentationStage
      ? presentationStage.x + presentationStage.width / 2
      : presentationNode?.x ?? 0;
    const stageWidthExpansion = presentationStage
      ? Math.max(0, presentationStage.width - BASE_PRESENTATION_STAGE_WIDTH)
      : 0;
    const stageDepthExpansion = presentationStage
      ? Math.max(0, presentationStage.depth - BASE_PRESENTATION_STAGE_DEPTH)
      : 0;
    const localXScale =
      STAGE_LOCAL_X_OFFSET_SCALE +
      Math.min(0.18, stageWidthExpansion / 1800);
    const localYScale =
      STAGE_LOCAL_Y_OFFSET_SCALE +
      Math.min(0.14, stageDepthExpansion / 48) +
      Math.min(0.06, stageWidthExpansion / 2400);
    const localXOffset = presentationNode
      ? (presentationNode.x - stageCenterX) * localXScale
      : 0;
    const localYOffset = presentationNode
      ? (presentationNode.y - presentation.height / 2) * localYScale
      : 0;

    return {
      id: node.id,
      type: "circuit",
      position: {
        x: position.x - NODE_WIDTH / 2 + localXOffset,
        y: position.y - NODE_HEIGHT / 2 + localYOffset,
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
      const presentationStage = presentationStageMap.get(stage.index);

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
      const rawWidth = maxRight - minX;
      const rawHeight = maxBottom - minY;
      const framePaddingX = presentationStage?.framePaddingX ?? 28;
      const framePaddingTop = presentationStage?.framePaddingTop ?? 54;
      const framePaddingBottom = presentationStage?.framePaddingBottom ?? 26;
      const rawWidthWithPadding = rawWidth + framePaddingX * 2;
      const desiredFrameWidth = Math.max(
        rawWidthWithPadding,
        (presentationStage?.width ?? rawWidthWithPadding) * MIN_STAGE_FRAME_WIDTH_SCALE,
      );
      const horizontalExpansion = Math.max(0, desiredFrameWidth - rawWidthWithPadding) / 2;

      return [
        {
        id: `stage-${stage.index}`,
        type: "stage",
        position: {
          x: minX - framePaddingX - horizontalExpansion,
          y: minY - framePaddingTop,
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
          width: desiredFrameWidth,
          height: rawHeight + framePaddingTop + framePaddingBottom,
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
