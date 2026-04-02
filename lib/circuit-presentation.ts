import type { CircuitGraph, CircuitNode, GraphAnchor } from "@/types/app-data";

export type CircuitPresentationVisualKind =
  | "physical-belt"
  | "physical-pile"
  | "virtual-belt"
  | "virtual-pile";

export interface CircuitPresentationStage {
  index: number;
  label: string;
  x: number;
  width: number;
}

export interface CircuitPresentationNode extends CircuitNode {
  visualKind: CircuitPresentationVisualKind;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
}

export interface CircuitPresentationEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  sourceAnchorId: string | null;
  targetAnchorId: string | null;
  sourcePoint: {
    x: number;
    y: number;
  };
  targetPoint: {
    x: number;
    y: number;
  };
  path: string;
  points3d: Array<[number, number, number]>;
  isVirtualLink: boolean;
}

export interface CircuitPresentation {
  width: number;
  height: number;
  stages: CircuitPresentationStage[];
  nodes: CircuitPresentationNode[];
  edges: CircuitPresentationEdge[];
}

const STAGE_WIDTH = 320;
const STAGE_GAP = 300;
const STAGE_PADDING_X = 96;
const PRESENTATION_HEIGHT = 640;
const PILE_ANCHOR_MIN_X = 0.18;
const PILE_ANCHOR_MAX_X = 0.82;
const PILE_ANCHOR_DEPTH_STEP = 0.55;

const LANE_CONFIG: Record<
  CircuitPresentationVisualKind,
  {
    centerY: number;
    z: number;
    xBias: number;
    yGap: number;
    xGap: number;
  }
> = {
  "physical-belt": {
    centerY: 182,
    z: -2.8,
    xBias: -28,
    yGap: 86,
    xGap: 88,
  },
  "physical-pile": {
    centerY: 314,
    z: 1.8,
    xBias: 36,
    yGap: 94,
    xGap: 102,
  },
  "virtual-belt": {
    centerY: 454,
    z: 7.6,
    xBias: -16,
    yGap: 82,
    xGap: 84,
  },
  "virtual-pile": {
    centerY: 558,
    z: 11.2,
    xBias: 26,
    yGap: 86,
    xGap: 92,
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getNodeVisualKind(node: CircuitNode): CircuitPresentationVisualKind {
  if (node.objectRole === "physical" && node.objectType === "belt") {
    return "physical-belt";
  }

  if (node.objectRole === "physical" && node.objectType === "pile") {
    return "physical-pile";
  }

  return node.objectType === "belt" ? "virtual-belt" : "virtual-pile";
}

function getNodeSize(node: CircuitNode) {
  const visualKind = getNodeVisualKind(node);

  switch (visualKind) {
    case "physical-belt":
      return { width: 176, height: 42 };
    case "physical-pile":
      return { width: 126, height: 104 };
    default:
      return { width: 140, height: 46 };
  }
}

function distributeAround(count: number, center: number, gap: number) {
  if (count <= 1) {
    return [center];
  }

  const totalSpan = (count - 1) * gap;
  const start = center - totalSpan / 2;

  return Array.from({ length: count }, (_, index) => start + index * gap);
}

export function getPresentationInputAnchor(node: CircuitPresentationNode) {
  if (node.visualKind === "physical-pile") {
    return { x: node.x, y: node.y - node.height / 2 };
  }

  return { x: node.x - node.width / 2, y: node.y };
}

export function getPresentationOutputAnchor(node: CircuitPresentationNode) {
  if (node.visualKind === "physical-pile") {
    return { x: node.x, y: node.y + node.height / 2 };
  }

  return { x: node.x + node.width / 2, y: node.y };
}

function getNormalizedPileAnchorX(anchor: GraphAnchor | undefined) {
  const anchorX = clamp(anchor?.x ?? 0.5, 0, 1);
  return PILE_ANCHOR_MIN_X + anchorX * (PILE_ANCHOR_MAX_X - PILE_ANCHOR_MIN_X);
}

function getDistributedPileAnchorPlacements(anchors: GraphAnchor[]) {
  if (anchors.length === 0) {
    return new Map<string, { normalizedX: number; depthOffset: number }>();
  }

  const orderedAnchors = anchors
    .map((anchor, index) => ({
      anchor,
      index,
      normalizedX: getNormalizedPileAnchorX(anchor),
    }))
    .sort(
      (left, right) =>
        left.normalizedX - right.normalizedX || left.index - right.index,
    );
  const evenlySpaced = orderedAnchors.map((_, index) => {
    if (orderedAnchors.length === 1) {
      return 0.5;
    }

    return (
      PILE_ANCHOR_MIN_X +
      ((PILE_ANCHOR_MAX_X - PILE_ANCHOR_MIN_X) * index) / (orderedAnchors.length - 1)
    );
  });
  const minimumGap = Math.min(
    0.14,
    (PILE_ANCHOR_MAX_X - PILE_ANCHOR_MIN_X) / Math.max(orderedAnchors.length + 1, 4),
  );
  const positions = orderedAnchors.map((entry, index) =>
    clamp(entry.normalizedX * 0.72 + evenlySpaced[index]! * 0.28, PILE_ANCHOR_MIN_X, PILE_ANCHOR_MAX_X),
  );

  for (let index = 1; index < positions.length; index += 1) {
    positions[index] = Math.max(positions[index]!, positions[index - 1]! + minimumGap);
  }

  const overflow = positions[positions.length - 1]! - PILE_ANCHOR_MAX_X;

  if (overflow > 0) {
    for (let index = 0; index < positions.length; index += 1) {
      positions[index] -= overflow;
    }
  }

  for (let index = positions.length - 2; index >= 0; index -= 1) {
    positions[index] = Math.min(positions[index]!, positions[index + 1]! - minimumGap);
  }

  const underflow = PILE_ANCHOR_MIN_X - positions[0]!;

  if (underflow > 0) {
    for (let index = 0; index < positions.length; index += 1) {
      positions[index] += underflow;
    }
  }

  return new Map(
    orderedAnchors.map((entry, index) => [
      entry.anchor.id,
      {
        normalizedX: positions[index]!,
        depthOffset: clamp(
          (index - (orderedAnchors.length - 1) / 2) * PILE_ANCHOR_DEPTH_STEP,
          -1.1,
          1.1,
        ),
      },
    ]),
  );
}

function getPileAnchorPlacement(
  node: CircuitPresentationNode,
  anchor: GraphAnchor | undefined,
  kind: "input" | "output",
) {
  const anchors = kind === "input" ? node.inputs : node.outputs;
  const placements = getDistributedPileAnchorPlacements(anchors);

  if (anchor) {
    const placement = placements.get(anchor.id);

    if (placement) {
      return placement;
    }
  }

  return {
    normalizedX: getNormalizedPileAnchorX(anchor),
    depthOffset: 0,
  };
}

export function getPresentationAnchorPoint(
  node: CircuitPresentationNode,
  anchor: GraphAnchor | undefined,
  kind: "input" | "output",
) {
  if (node.visualKind === "physical-pile") {
    const { normalizedX } = getPileAnchorPlacement(node, anchor, kind);
    const x = node.x - node.width / 2 + normalizedX * node.width;
    const y =
      kind === "input"
        ? node.y - node.height / 2 - 30
        : node.y + node.height / 2 + 34;

    return { x, y };
  }

  const normalizedY = clamp(anchor?.y ?? 0.5, 0, 1);
  const y = node.y - node.height / 2 + normalizedY * node.height;

  if (kind === "input") {
    return {
      x: node.x - node.width / 2,
      y,
    };
  }

  return {
    x: node.x + node.width / 2,
    y,
  };
}

export function getPresentationAnchorPoint3d(
  node: CircuitPresentationNode,
  anchor: GraphAnchor | undefined,
  kind: "input" | "output",
) {
  const centerX = node.x / 26;
  const centerZ = node.z;

  if (node.visualKind === "physical-pile") {
    const { normalizedX, depthOffset } = getPileAnchorPlacement(node, anchor, kind);
    const localX = (normalizedX - 0.5) * 4.8;

    return {
      x: centerX + localX,
      y: kind === "input" ? 6.4 : 0.52,
      z: centerZ + depthOffset,
    };
  }

  const normalizedY = clamp(anchor?.y ?? 0.5, 0, 1);

  return {
    x: centerX + (kind === "input" ? -3.3 : 3.3),
    y: 0.42 + normalizedY * 0.6,
    z: centerZ,
  };
}

function buildEdgePath(
  source: CircuitPresentationNode,
  target: CircuitPresentationNode,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  if (target.visualKind === "physical-pile") {
    const controlY = Math.min(from.y, to.y) - 48;
    return `M ${from.x} ${from.y} C ${from.x + 48} ${from.y}, ${to.x} ${controlY}, ${to.x} ${to.y}`;
  }

  if (source.visualKind === "physical-pile") {
    const controlY = Math.max(from.y, to.y) + 48;
    return `M ${from.x} ${from.y} C ${from.x} ${controlY}, ${to.x - 48} ${to.y}, ${to.x} ${to.y}`;
  }

  const midX = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
}

function buildEdgePoints3d(
  source: CircuitPresentationNode,
  target: CircuitPresentationNode,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
) {
  const midX = (from.x + to.x) / 2;

  if (target.visualKind === "physical-pile") {
    return [
      [from.x, from.y, from.z],
      [midX, from.y + 0.8, (from.z + to.z) / 2],
      [to.x, to.y + 0.8, to.z],
      [to.x, to.y, to.z],
    ] as Array<[number, number, number]>;
  }

  if (source.visualKind === "physical-pile") {
    return [
      [from.x, from.y, from.z],
      [from.x, from.y - 1.2, from.z],
      [midX, Math.max(from.y, to.y) - 0.4, (from.z + to.z) / 2],
      [to.x, to.y, to.z],
    ] as Array<[number, number, number]>;
  }

  return [
    [from.x, from.y, from.z],
    [midX, from.y + 0.35, (from.z + to.z) / 2],
    [to.x, to.y, to.z],
  ] as Array<[number, number, number]>;
}

function pickRelatedAnchor(
  anchors: GraphAnchor[],
  relatedObjectId: string,
  occurrenceIndex: number,
) {
  const candidates = anchors.filter((anchor) => anchor.relatedObjectId === relatedObjectId);

  if (candidates.length === 0) {
    return undefined;
  }

  return candidates[Math.min(occurrenceIndex, candidates.length - 1)];
}

export function buildCircuitPresentation(graph: CircuitGraph): CircuitPresentation {
  const stages = graph.stages.map((stage, index) => ({
    index: stage.index,
    label: stage.label,
    x: STAGE_PADDING_X + index * STAGE_GAP,
    width: STAGE_WIDTH,
  }));

  const stageMap = new Map(stages.map((stage) => [stage.index, stage]));
  const nodesByStage = new Map<number, CircuitNode[]>();

  graph.nodes.forEach((node) => {
    const current = nodesByStage.get(node.stageIndex) ?? [];
    current.push(node);
    nodesByStage.set(node.stageIndex, current);
  });

  const nodes = graph.nodes.map((node) => {
    const stageNodes = nodesByStage.get(node.stageIndex) ?? [];
    const visualKind = getNodeVisualKind(node);
    const laneNodes = stageNodes.filter(
      (entry) => getNodeVisualKind(entry) === visualKind,
    );
    const nodeSize = getNodeSize(node);
    const stage = stageMap.get(node.stageIndex);
    const laneConfig = LANE_CONFIG[visualKind];
    const laneIndex = Math.max(
      0,
      laneNodes.findIndex((entry) => entry.id === node.id),
    );
    const baseCenterX =
      (stage?.x ?? STAGE_PADDING_X) + STAGE_WIDTH / 2 + laneConfig.xBias;
    const xPositions = distributeAround(laneNodes.length, baseCenterX, laneConfig.xGap);
    const yPositions = distributeAround(
      laneNodes.length,
      laneConfig.centerY,
      laneConfig.yGap,
    );

    return {
      ...node,
      visualKind,
      x: xPositions[laneIndex] ?? baseCenterX,
      y: yPositions[laneIndex] ?? laneConfig.centerY,
      z: laneConfig.z,
      width: nodeSize.width,
      height: nodeSize.height,
    } satisfies CircuitPresentationNode;
  });

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const pairOccurrences = new Map<string, number>();
  const edges = graph.edges
    .map((edge) => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);

      if (!source || !target) {
        return null;
      }

      const pairKey = `${source.id}->${target.id}`;
      const occurrenceIndex = pairOccurrences.get(pairKey) ?? 0;
      pairOccurrences.set(pairKey, occurrenceIndex + 1);

      const sourceAnchor = pickRelatedAnchor(source.outputs, target.objectId, occurrenceIndex);
      const targetAnchor = pickRelatedAnchor(target.inputs, source.objectId, occurrenceIndex);
      const sourcePoint = getPresentationAnchorPoint(source, sourceAnchor, "output");
      const targetPoint = getPresentationAnchorPoint(target, targetAnchor, "input");
      const sourcePoint3d = getPresentationAnchorPoint3d(source, sourceAnchor, "output");
      const targetPoint3d = getPresentationAnchorPoint3d(target, targetAnchor, "input");

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        sourceAnchorId: sourceAnchor?.id ?? null,
        targetAnchorId: targetAnchor?.id ?? null,
        sourcePoint,
        targetPoint,
        path: buildEdgePath(source, target, sourcePoint, targetPoint),
        points3d: buildEdgePoints3d(source, target, sourcePoint3d, targetPoint3d),
        isVirtualLink: source.objectRole === "virtual" || target.objectRole === "virtual",
      } satisfies CircuitPresentationEdge;
    })
    .filter((edge): edge is CircuitPresentationEdge => edge !== null);

  return {
    width:
      (stages[stages.length - 1]?.x ?? STAGE_PADDING_X) + STAGE_WIDTH + STAGE_PADDING_X,
    height: PRESENTATION_HEIGHT,
    stages,
    nodes,
    edges,
  };
}
