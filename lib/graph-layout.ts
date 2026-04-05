import { Position, type Edge, type Node } from "@xyflow/react";
import { buildCircuitPresentation } from "@/lib/circuit-presentation";
import type { CircuitEdge, CircuitGraph, CircuitNode } from "@/types/app-data";

const NODE_WIDTH = 236;
const NODE_HEIGHT = 84;
const STAGE_TOP = 28;
const STAGE_HEIGHT = 760;
const STAGE_GAP = 0;
const STAGE_SIDE_PADDING_X = 44;
const STAGE_TOP_PADDING = 44;
const STAGE_BOTTOM_PADDING = 44;
const STAGE_COLUMN_GAP = 68;
const MIN_STAGE_WIDTH = 360;

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

function groupStageColumns(nodes: Array<{ id: string; x: number; y: number }>) {
  const sorted = [...nodes].sort((left, right) => left.x - right.x);
  const columns: Array<Array<{ id: string; x: number; y: number }>> = [];

  sorted.forEach((node) => {
    const currentColumn = columns[columns.length - 1];

    if (
      currentColumn &&
      Math.abs(currentColumn[0]!.x - node.x) <= 1
    ) {
      currentColumn.push(node);
      return;
    }

    columns.push([node]);
  });

  return columns.map((column) =>
    column.sort((left, right) => left.y - right.y),
  );
}

function distributeNodeTopPositions(nodeCount: number) {
  if (nodeCount === 0) {
    return [];
  }

  const top = STAGE_TOP + STAGE_TOP_PADDING;
  const bottom = STAGE_TOP + STAGE_HEIGHT - STAGE_BOTTOM_PADDING;

  if (nodeCount === 1) {
    return [top + (bottom - top - NODE_HEIGHT) / 2];
  }

  const availableHeight = bottom - top;
  const contentHeight = NODE_HEIGHT * nodeCount;
  const gap = Math.max(16, (availableHeight - contentHeight) / (nodeCount - 1));
  const positions: number[] = [];
  let currentTop = top;

  for (let index = 0; index < nodeCount; index += 1) {
    positions.push(currentTop);
    currentTop += NODE_HEIGHT + gap;
  }

  return positions;
}

function mapPresentationCenterToTop(
  centerY: number,
  presentationFrameTop: number,
  presentationFrameHeight: number,
) {
  const usableTop = STAGE_TOP + STAGE_TOP_PADDING;
  const usableBottom = STAGE_TOP + STAGE_HEIGHT - STAGE_BOTTOM_PADDING;
  const minCenter = usableTop + NODE_HEIGHT / 2;
  const maxCenter = usableBottom - NODE_HEIGHT / 2;
  const normalized =
    presentationFrameHeight > 0
      ? (centerY - presentationFrameTop) / presentationFrameHeight
      : 0.5;
  const center = minCenter + Math.max(0, Math.min(1, normalized)) * (maxCenter - minCenter);

  return center - NODE_HEIGHT / 2;
}

function packNodeTopPositions(preferredTops: number[]) {
  if (preferredTops.length === 0) {
    return [];
  }

  const top = STAGE_TOP + STAGE_TOP_PADDING;
  const bottom = STAGE_TOP + STAGE_HEIGHT - STAGE_BOTTOM_PADDING - NODE_HEIGHT;
  const gap = 16;
  const packed = preferredTops.map((topPosition) =>
    Math.max(top, Math.min(bottom, topPosition)),
  );

  for (let index = 1; index < packed.length; index += 1) {
    packed[index] = Math.max(packed[index]!, packed[index - 1]! + NODE_HEIGHT + gap);
  }

  if (packed[packed.length - 1]! > bottom) {
    packed[packed.length - 1] = bottom;

    for (let index = packed.length - 2; index >= 0; index -= 1) {
      packed[index] = Math.min(
        packed[index]!,
        packed[index + 1]! - NODE_HEIGHT - gap,
      );
    }
  }

  return packed;
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
  const stageFrameMap = new Map(
    presentation.stages.map((stage) => [stage.index, stage]),
  );
  const presentationNodesByStage = new Map<number, Array<{ id: string; x: number; y: number }>>();

  presentation.nodes.forEach((node) => {
    const current = presentationNodesByStage.get(node.stageIndex) ?? [];
    current.push({ id: node.id, x: node.x, y: node.y });
    presentationNodesByStage.set(node.stageIndex, current);
  });

  let currentStageX = 24;
  const stageNodes: Node<CircuitStageNodeData, "stage">[] = [];
  const laidOutNodes: Node<CircuitNodeData, "circuit">[] = [];

  stages.forEach((stage) => {
    const memberNodes = nodes.filter((node) => stage.nodeIds.includes(node.id));
    const presentationStage = stageFrameMap.get(stage.index);
    const stageColumns = groupStageColumns(
      presentationNodesByStage.get(stage.index) ?? [],
    );
    const stageWidth = Math.max(
      MIN_STAGE_WIDTH,
      STAGE_SIDE_PADDING_X * 2 +
        stageColumns.length * NODE_WIDTH +
        Math.max(0, stageColumns.length - 1) * STAGE_COLUMN_GAP,
      Math.round((presentationStage?.width ?? MIN_STAGE_WIDTH) * 1.08),
    );
    const columnLefts = stageColumns.map(
      (_, index) =>
        currentStageX +
        STAGE_SIDE_PADDING_X +
        index * (NODE_WIDTH + STAGE_COLUMN_GAP),
    );

    stageColumns.forEach((column, columnIndex) => {
      const topPositions = column.length > 0
        ? packNodeTopPositions(
            column.map((columnNode) =>
              mapPresentationCenterToTop(
                columnNode.y,
                presentation.stageFrameTop,
                presentation.stageFrameHeight,
              ),
            ),
          )
        : distributeNodeTopPositions(column.length);

      column.forEach((columnNode, rowIndex) => {
        const baseNode = nodes.find((candidate) => candidate.id === columnNode.id);

        if (!baseNode) {
          return;
        }

        laidOutNodes.push({
          id: baseNode.id,
          type: "circuit",
          position: {
            x: columnLefts[columnIndex]!,
            y: topPositions[rowIndex]!,
          },
          data: {
            label: baseNode.label,
            shortDescription: baseNode.shortDescription,
            objectType: baseNode.objectType,
            objectRole: baseNode.objectRole,
            stageIndex: baseNode.stageIndex,
            isProfiled: baseNode.isProfiled,
            dimension: baseNode.dimension,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          zIndex: 10,
        } satisfies Node<CircuitNodeData, "circuit">);
      });
    });

    if (memberNodes.length > 0) {
      stageNodes.push({
        id: `stage-${stage.index}`,
        type: "stage",
        position: {
          x: currentStageX,
          y: STAGE_TOP,
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
          width: stageWidth,
          height: STAGE_HEIGHT,
          pointerEvents: "none",
        },
      } satisfies Node<CircuitStageNodeData, "stage">);
    }

    currentStageX += stageWidth + STAGE_GAP;
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
