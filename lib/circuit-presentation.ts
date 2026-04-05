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
  z: number;
  depth: number;
  framePaddingX: number;
  framePaddingTop: number;
  framePaddingBottom: number;
}

export interface CircuitPresentationStageFootprint3d {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
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
  stageFrameTop: number;
  stageFrameHeight: number;
  stageLabelY: number;
  footnoteY: number;
  stages: CircuitPresentationStage[];
  nodes: CircuitPresentationNode[];
  edges: CircuitPresentationEdge[];
}

interface CircuitPresentationEdgeContext {
  edge: CircuitGraph["edges"][number];
  source: CircuitNode;
  target: CircuitNode;
  sourceAnchor?: GraphAnchor;
  targetAnchor?: GraphAnchor;
}

interface StageLayoutNodeDraft {
  node: CircuitNode;
  visualKind: CircuitPresentationVisualKind;
  width: number;
  height: number;
  level: number;
  sortHint: number;
}

interface StageNodePlacement extends StageLayoutNodeDraft {
  x: number;
  y: number;
  z: number;
}

const PRESENTATION_HEIGHT = 880;
const STAGE_FRAME_TOP = 24;
const STAGE_FRAME_BOTTOM_PADDING = 76;
const STAGE_LABEL_Y = 58;
const FOOTNOTE_Y = PRESENTATION_HEIGHT - 28;
const STAGE_PADDING_X = 72;
const BASE_STAGE_GAP = 0;
const BASE_STAGE_WIDTH = 360;
const STAGE_SIDE_PADDING_X = 68;
const STAGE_COLUMN_GAP = 94;
const STAGE_NODE_TOP_PADDING = 112;
const STAGE_NODE_BOTTOM_PADDING = 56;
const STAGE_FRAME_PADDING_X = 20;
const STAGE_FRAME_PADDING_TOP = 44;
const STAGE_FRAME_PADDING_BOTTOM = 26;
const MIN_VERTICAL_GAP = 28;
const STAGE_COMPONENT_GAP = 64;
const PRESENTATION_3D_X_SCALE = 28;
const PRESENTATION_3D_Z_SCALE = 30;
const STAGE_FOOTPRINT_3D_HEIGHT = 0.56;
const PILE_ANCHOR_MIN_X = 0.18;
const PILE_ANCHOR_MAX_X = 0.82;
const PILE_ANCHOR_DEPTH_STEP = 0.55;

const DEFAULT_SORT_HINT: Record<CircuitPresentationVisualKind, number> = {
  "physical-belt": 0.22,
  "physical-pile": 0.46,
  "virtual-belt": 0.68,
  "virtual-pile": 0.82,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
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
      return { width: 188, height: 48 };
    case "physical-pile":
      return { width: 138, height: 120 };
    default:
      return { width: 148, height: 48 };
  }
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
      ((PILE_ANCHOR_MAX_X - PILE_ANCHOR_MIN_X) * index) /
        (orderedAnchors.length - 1)
    );
  });
  const minimumGap = Math.min(
    0.14,
    (PILE_ANCHOR_MAX_X - PILE_ANCHOR_MIN_X) /
      Math.max(orderedAnchors.length + 1, 4),
  );
  const positions = orderedAnchors.map((entry, index) =>
    clamp(
      entry.normalizedX * 0.72 + evenlySpaced[index]! * 0.28,
      PILE_ANCHOR_MIN_X,
      PILE_ANCHOR_MAX_X,
    ),
  );

  for (let index = 1; index < positions.length; index += 1) {
    positions[index] = Math.max(
      positions[index]!,
      positions[index - 1]! + minimumGap,
    );
  }

  const overflow = positions[positions.length - 1]! - PILE_ANCHOR_MAX_X;

  if (overflow > 0) {
    for (let index = 0; index < positions.length; index += 1) {
      positions[index] -= overflow;
    }
  }

  for (let index = positions.length - 2; index >= 0; index -= 1) {
    positions[index] = Math.min(
      positions[index]!,
      positions[index + 1]! - minimumGap,
    );
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
        ? node.y - node.height / 2 - 32
        : node.y + node.height / 2 + 36;

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
  const centerX = node.x / PRESENTATION_3D_X_SCALE;
  const centerZ = node.z;

  if (node.visualKind === "physical-pile") {
    const { normalizedX, depthOffset } = getPileAnchorPlacement(node, anchor, kind);
    const localX = (normalizedX - 0.5) * 4.8;

    return {
      x: centerX + localX,
      y: kind === "input" ? 6.6 : 0.52,
      z: centerZ + depthOffset,
    };
  }

  const normalizedY = clamp(anchor?.y ?? 0.5, 0, 1);

  return {
    x: centerX + (kind === "input" ? -3.4 : 3.4),
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
    const controlY = Math.min(from.y, to.y) - 52;
    return `M ${from.x} ${from.y} C ${from.x + 48} ${from.y}, ${to.x} ${controlY}, ${to.x} ${to.y}`;
  }

  if (source.visualKind === "physical-pile") {
    const controlY = Math.max(from.y, to.y) + 52;
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
    [midX, from.y + 0.3, (from.z + to.z) / 2],
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

function buildEdgeContexts(
  graph: CircuitGraph,
  nodeMap: Map<string, CircuitNode>,
) {
  const pairOccurrences = new Map<string, number>();

  return graph.edges.flatMap((edge) => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);

    if (!source || !target) {
      return [];
    }

    const pairKey = `${source.id}->${target.id}`;
    const occurrenceIndex = pairOccurrences.get(pairKey) ?? 0;
    pairOccurrences.set(pairKey, occurrenceIndex + 1);

    return [
      {
        edge,
        source,
        target,
        sourceAnchor: pickRelatedAnchor(
          source.outputs,
          target.objectId,
          occurrenceIndex,
        ),
        targetAnchor: pickRelatedAnchor(
          target.inputs,
          source.objectId,
          occurrenceIndex,
        ),
      } satisfies CircuitPresentationEdgeContext,
    ];
  });
}

function getStageNodeUsableBounds() {
  return {
    top: STAGE_FRAME_TOP + STAGE_NODE_TOP_PADDING,
    bottom:
      PRESENTATION_HEIGHT -
      STAGE_FRAME_BOTTOM_PADDING -
      STAGE_NODE_BOTTOM_PADDING,
  };
}

function getConnectionSortHint(
  context: CircuitPresentationEdgeContext,
  direction: "source" | "target",
) {
  if (context.source.objectType === "pile" && context.sourceAnchor) {
    return clamp(context.sourceAnchor.x, 0, 1);
  }

  if (context.target.objectType === "pile" && context.targetAnchor) {
    return clamp(context.targetAnchor.x, 0, 1);
  }

  if (direction === "source" && context.sourceAnchor) {
    return clamp(context.sourceAnchor.y, 0, 1);
  }

  if (direction === "target" && context.targetAnchor) {
    return clamp(context.targetAnchor.y, 0, 1);
  }

  return DEFAULT_SORT_HINT[getNodeVisualKind(direction === "source" ? context.source : context.target)];
}

function getNodeAnchorSortHint(node: CircuitNode) {
  const anchorHints = [...node.inputs, ...node.outputs].map((anchor) =>
    clamp(
      node.objectType === "pile" ? anchor.x : anchor.y,
      0,
      1,
    ),
  );

  if (anchorHints.length > 0) {
    return average(anchorHints);
  }

  return DEFAULT_SORT_HINT[getNodeVisualKind(node)];
}

function buildStageLevelMap(
  stageNodes: CircuitNode[],
  edgeContexts: CircuitPresentationEdgeContext[],
) {
  const nodeIds = new Set(stageNodes.map((node) => node.id));
  const incomingSameStage = new Map<string, string[]>();
  const outgoingSameStage = new Map<string, string[]>();
  const indegree = new Map(stageNodes.map((node) => [node.id, 0]));
  const levelMap = new Map<string, number>();

  edgeContexts.forEach((context) => {
    if (!nodeIds.has(context.source.id) || !nodeIds.has(context.target.id)) {
      return;
    }

    const outgoing = outgoingSameStage.get(context.source.id) ?? [];
    outgoing.push(context.target.id);
    outgoingSameStage.set(context.source.id, outgoing);

    const incoming = incomingSameStage.get(context.target.id) ?? [];
    incoming.push(context.source.id);
    incomingSameStage.set(context.target.id, incoming);

    indegree.set(context.target.id, (indegree.get(context.target.id) ?? 0) + 1);
  });

  const queue = stageNodes
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .sort((left, right) => left.label.localeCompare(right.label));
  const processed = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    processed.add(current.id);
    const currentLevel = levelMap.get(current.id) ?? 0;

    (outgoingSameStage.get(current.id) ?? []).forEach((targetId) => {
      levelMap.set(targetId, Math.max(levelMap.get(targetId) ?? 0, currentLevel + 1));
      indegree.set(targetId, Math.max(0, (indegree.get(targetId) ?? 0) - 1));

      if ((indegree.get(targetId) ?? 0) === 0) {
        const targetNode = stageNodes.find((node) => node.id === targetId);

        if (targetNode) {
          queue.push(targetNode);
          queue.sort((left, right) => left.label.localeCompare(right.label));
        }
      }
    });
  }

  stageNodes
    .filter((node) => !processed.has(node.id))
    .sort((left, right) => left.label.localeCompare(right.label))
    .forEach((node) => {
      const predecessorLevels = (incomingSameStage.get(node.id) ?? [])
        .map((predecessorId) => levelMap.get(predecessorId))
        .filter((value): value is number => value !== undefined);
      levelMap.set(
        node.id,
        predecessorLevels.length > 0 ? Math.max(...predecessorLevels) + 1 : 0,
      );
    });

  return levelMap;
}

function distributeCenters(
  top: number,
  bottom: number,
  heights: number[],
) {
  if (heights.length === 0) {
    return [];
  }

  if (heights.length === 1) {
    return [(top + bottom) / 2];
  }

  const availableHeight = bottom - top;
  const contentHeight =
    heights.reduce((sum, height) => sum + height, 0) +
    MIN_VERTICAL_GAP * (heights.length - 1);
  const extraHeight = Math.max(0, availableHeight - contentHeight);
  const gap = MIN_VERTICAL_GAP + extraHeight / (heights.length - 1);
  const centers: number[] = [];
  let cursor = top;

  heights.forEach((height, index) => {
    cursor += height / 2;
    centers.push(cursor);

    if (index < heights.length - 1) {
      cursor += height / 2 + gap;
    }
  });

  return centers;
}

function distributeComponentCenters(
  top: number,
  bottom: number,
  heights: number[],
) {
  if (heights.length === 0) {
    return [];
  }

  if (heights.length === 1) {
    return [(top + bottom) / 2];
  }

  const availableHeight = bottom - top;
  const contentHeight =
    heights.reduce((sum, height) => sum + height, 0) +
    STAGE_COMPONENT_GAP * (heights.length - 1);
  const extraHeight = Math.max(0, availableHeight - contentHeight);
  const gap = STAGE_COMPONENT_GAP + extraHeight / (heights.length - 1);
  const centers: number[] = [];
  let cursor = top;

  heights.forEach((height, index) => {
    cursor += height / 2;
    centers.push(cursor);

    if (index < heights.length - 1) {
      cursor += height / 2 + gap;
    }
  });

  return centers;
}

function buildStageComponents(
  stageNodes: CircuitNode[],
  edgeContexts: CircuitPresentationEdgeContext[],
) {
  const nodeIds = new Set(stageNodes.map((node) => node.id));
  const adjacency = new Map(stageNodes.map((node) => [node.id, new Set<string>()]));

  edgeContexts.forEach((context) => {
    if (!nodeIds.has(context.source.id) || !nodeIds.has(context.target.id)) {
      return;
    }

    adjacency.get(context.source.id)?.add(context.target.id);
    adjacency.get(context.target.id)?.add(context.source.id);
  });

  const components: string[][] = [];
  const visited = new Set<string>();

  stageNodes.forEach((node) => {
    if (visited.has(node.id)) {
      return;
    }

    const queue = [node.id];
    const component: string[] = [];
    visited.add(node.id);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      component.push(currentId);

      (adjacency.get(currentId) ?? new Set<string>()).forEach((neighborId) => {
        if (visited.has(neighborId)) {
          return;
        }

        visited.add(neighborId);
        queue.push(neighborId);
      });
    }

    components.push(component);
  });

  return components;
}

function buildStageNodePlacements(
  stageNodes: CircuitNode[],
  stageX: number,
  edgeContexts: CircuitPresentationEdgeContext[],
  incomingByNodeId: Map<string, CircuitPresentationEdgeContext[]>,
  outgoingByNodeId: Map<string, CircuitPresentationEdgeContext[]>,
) {
  const levelMap = buildStageLevelMap(stageNodes, edgeContexts);
  const columnCount =
    Math.max(0, ...stageNodes.map((node) => levelMap.get(node.id) ?? 0)) + 1;
  const maxNodeWidth = stageNodes.reduce(
    (maxWidth, node) => Math.max(maxWidth, getNodeSize(node).width),
    148,
  );
  const columnStride = maxNodeWidth + STAGE_COLUMN_GAP;
  const stageBounds = getStageNodeUsableBounds();
  const frameCenterY = STAGE_FRAME_TOP + (PRESENTATION_HEIGHT - STAGE_FRAME_TOP - STAGE_FRAME_BOTTOM_PADDING) / 2;
  const draftNodes: StageLayoutNodeDraft[] = [];
  const resolvedSortHints = new Map<string, number>();

  stageNodes.forEach((node) => {
    const size = getNodeSize(node);
    draftNodes.push({
      node,
      visualKind: getNodeVisualKind(node),
      width: size.width,
      height: size.height,
      level: levelMap.get(node.id) ?? 0,
      sortHint: 0,
    });
  });

  for (let level = 0; level < columnCount; level += 1) {
    const levelNodes = draftNodes
      .filter((draftNode) => draftNode.level === level)
      .map((draftNode) => {
        const hints: number[] = [];

        (incomingByNodeId.get(draftNode.node.id) ?? []).forEach((context) => {
          if (context.source.stageIndex === draftNode.node.stageIndex) {
            const predecessorHint = resolvedSortHints.get(context.source.id);

            if (predecessorHint !== undefined) {
              hints.push(predecessorHint);
            }
            hints.push(getConnectionSortHint(context, "source"));
            return;
          }

          hints.push(getConnectionSortHint(context, "target"));
        });

        (outgoingByNodeId.get(draftNode.node.id) ?? []).forEach((context) => {
          if (context.target.stageIndex === draftNode.node.stageIndex) {
            return;
          }

          hints.push(getConnectionSortHint(context, "source"));
        });

        if (hints.length === 0) {
          hints.push(getNodeAnchorSortHint(draftNode.node));
        }

        return {
          ...draftNode,
          sortHint: average(hints),
        };
      })
      .sort((left, right) => {
        const sortDifference = left.sortHint - right.sortHint;

        if (Math.abs(sortDifference) > 1e-6) {
          return sortDifference;
        }

        return left.node.label.localeCompare(right.node.label);
      });

    levelNodes.forEach((draftNode) => {
      resolvedSortHints.set(draftNode.node.id, draftNode.sortHint);
    });
  }

  const orderedDraftNodes = draftNodes
    .map((draftNode) => ({
      ...draftNode,
      sortHint:
        resolvedSortHints.get(draftNode.node.id) ?? getNodeAnchorSortHint(draftNode.node),
    }))
    .sort((left, right) => {
      const sortDifference = left.sortHint - right.sortHint;

      if (Math.abs(sortDifference) > 1e-6) {
        return sortDifference;
      }

      if (left.level !== right.level) {
        return left.level - right.level;
      }

      return left.node.label.localeCompare(right.node.label);
    });
  const draftNodeById = new Map(
    orderedDraftNodes.map((draftNode) => [draftNode.node.id, draftNode]),
  );
  const orderedComponents = buildStageComponents(stageNodes, edgeContexts)
    .map((componentNodeIds) =>
      componentNodeIds
        .map((nodeId) => draftNodeById.get(nodeId))
        .filter((draftNode): draftNode is StageLayoutNodeDraft => Boolean(draftNode))
        .sort((left, right) => {
          const sortDifference = left.sortHint - right.sortHint;

          if (Math.abs(sortDifference) > 1e-6) {
            return sortDifference;
          }

          if (left.level !== right.level) {
            return left.level - right.level;
          }

          return left.node.label.localeCompare(right.node.label);
        }),
    )
    .sort((left, right) => {
      const leftHint = average(left.map((draftNode) => draftNode.sortHint));
      const rightHint = average(right.map((draftNode) => draftNode.sortHint));
      const sortDifference = leftHint - rightHint;

      if (Math.abs(sortDifference) > 1e-6) {
        return sortDifference;
      }

      const leftLevel = Math.min(...left.map((draftNode) => draftNode.level));
      const rightLevel = Math.min(...right.map((draftNode) => draftNode.level));

      if (leftLevel !== rightLevel) {
        return leftLevel - rightLevel;
      }

      return left[0]?.node.label.localeCompare(right[0]?.node.label ?? "") ?? 0;
    });
  const centerByNodeId = new Map<string, number>();

  if (orderedComponents.length <= 1) {
    const globalCenters = distributeCenters(
      stageBounds.top,
      stageBounds.bottom,
      orderedDraftNodes.map((draftNode) => draftNode.height),
    );

    orderedDraftNodes.forEach((draftNode, index) => {
      centerByNodeId.set(draftNode.node.id, globalCenters[index] ?? frameCenterY);
    });
  } else {
    const componentHeights = orderedComponents.map(
      (componentDraftNodes) =>
        componentDraftNodes.reduce((sum, draftNode) => sum + draftNode.height, 0) +
        Math.max(0, componentDraftNodes.length - 1) * MIN_VERTICAL_GAP,
    );
    const componentCenters = distributeComponentCenters(
      stageBounds.top,
      stageBounds.bottom,
      componentHeights,
    );

    orderedComponents.forEach((componentDraftNodes, index) => {
      const componentHeight = componentHeights[index] ?? 0;
      const componentCenter = componentCenters[index] ?? frameCenterY;
      const componentTop = componentCenter - componentHeight / 2;
      const localCenters = distributeCenters(
        componentTop,
        componentTop + componentHeight,
        componentDraftNodes.map((draftNode) => draftNode.height),
      );

      componentDraftNodes.forEach((draftNode, nodeIndex) => {
        centerByNodeId.set(draftNode.node.id, localCenters[nodeIndex] ?? frameCenterY);
      });
    });
  }

  return orderedDraftNodes.map((draftNode) => {
    const centerX =
      stageX +
      STAGE_SIDE_PADDING_X +
      maxNodeWidth / 2 +
      draftNode.level * columnStride;
    const centerY = centerByNodeId.get(draftNode.node.id) ?? frameCenterY;

    return {
      ...draftNode,
      x: centerX,
      y: centerY,
      z: (centerY - frameCenterY) / PRESENTATION_3D_Z_SCALE,
    } satisfies StageNodePlacement;
  });
}

function getStageWidth(stageNodes: CircuitNode[], edgeContexts: CircuitPresentationEdgeContext[]) {
  const levelMap = buildStageLevelMap(stageNodes, edgeContexts);
  const columnCount =
    Math.max(0, ...stageNodes.map((node) => levelMap.get(node.id) ?? 0)) + 1;
  const maxNodeWidth = stageNodes.reduce(
    (maxWidth, node) => Math.max(maxWidth, getNodeSize(node).width),
    148,
  );

  return Math.max(
    BASE_STAGE_WIDTH,
    STAGE_SIDE_PADDING_X * 2 +
      columnCount * maxNodeWidth +
      Math.max(0, columnCount - 1) * STAGE_COLUMN_GAP,
  );
}

export function buildCircuitPresentation(graph: CircuitGraph): CircuitPresentation {
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const edgeContexts = buildEdgeContexts(graph, nodeMap);
  const nodesByStage = new Map<number, CircuitNode[]>();
  const incomingByNodeId = new Map<string, CircuitPresentationEdgeContext[]>();
  const outgoingByNodeId = new Map<string, CircuitPresentationEdgeContext[]>();
  const stageFrameHeight =
    PRESENTATION_HEIGHT - STAGE_FRAME_TOP - STAGE_FRAME_BOTTOM_PADDING;
  const stageDepth = stageFrameHeight / PRESENTATION_3D_Z_SCALE + 2.2;

  graph.nodes.forEach((node) => {
    const current = nodesByStage.get(node.stageIndex) ?? [];
    current.push(node);
    nodesByStage.set(node.stageIndex, current);
  });

  edgeContexts.forEach((context) => {
    const incoming = incomingByNodeId.get(context.target.id) ?? [];
    incoming.push(context);
    incomingByNodeId.set(context.target.id, incoming);

    const outgoing = outgoingByNodeId.get(context.source.id) ?? [];
    outgoing.push(context);
    outgoingByNodeId.set(context.source.id, outgoing);
  });

  let currentStageX = STAGE_PADDING_X;
  const stageDrafts = graph.stages.map((stage) => {
    const stageNodes = nodesByStage.get(stage.index) ?? [];
    const stageEdgeContexts = edgeContexts.filter(
      (context) =>
        context.source.stageIndex === stage.index &&
        context.target.stageIndex === stage.index,
    );
    const width = getStageWidth(stageNodes, stageEdgeContexts);
    const stageDraft = {
      index: stage.index,
      label: stage.label,
      x: currentStageX,
      width,
      z: 0,
      depth: stageDepth,
      framePaddingX: STAGE_FRAME_PADDING_X,
      framePaddingTop: STAGE_FRAME_PADDING_TOP,
      framePaddingBottom: STAGE_FRAME_PADDING_BOTTOM,
    } satisfies CircuitPresentationStage;

    currentStageX += width + BASE_STAGE_GAP;

    return stageDraft;
  });

  const stageMap = new Map(stageDrafts.map((stage) => [stage.index, stage]));
  const stagePlacementsByNodeId = new Map<string, StageNodePlacement>();

  graph.stages.forEach((stage) => {
    const stageDraft = stageMap.get(stage.index);
    const stageNodes = nodesByStage.get(stage.index) ?? [];
    const stageEdgeContexts = edgeContexts.filter(
      (context) =>
        context.source.stageIndex === stage.index &&
        context.target.stageIndex === stage.index,
    );
    const placements = buildStageNodePlacements(
      stageNodes,
      stageDraft?.x ?? STAGE_PADDING_X,
      stageEdgeContexts,
      incomingByNodeId,
      outgoingByNodeId,
    );

    placements.forEach((placement) => {
      stagePlacementsByNodeId.set(placement.node.id, placement);
    });
  });

  const nodes = graph.nodes.map((node) => {
    const placement = stagePlacementsByNodeId.get(node.id)!;

    return {
      ...node,
      visualKind: placement.visualKind,
      x: placement.x,
      y: placement.y,
      z: placement.z,
      width: placement.width,
      height: placement.height,
    } satisfies CircuitPresentationNode;
  });

  const presentationNodeMap = new Map(nodes.map((node) => [node.id, node]));
  const edges = edgeContexts.map((context) => {
    const source = presentationNodeMap.get(context.source.id)!;
    const target = presentationNodeMap.get(context.target.id)!;
    const sourcePoint = getPresentationAnchorPoint(
      source,
      context.sourceAnchor,
      "output",
    );
    const targetPoint = getPresentationAnchorPoint(
      target,
      context.targetAnchor,
      "input",
    );
    const sourcePoint3d = getPresentationAnchorPoint3d(
      source,
      context.sourceAnchor,
      "output",
    );
    const targetPoint3d = getPresentationAnchorPoint3d(
      target,
      context.targetAnchor,
      "input",
    );

    return {
      id: context.edge.id,
      source: context.edge.source,
      target: context.edge.target,
      label: context.edge.label,
      sourceAnchorId: context.sourceAnchor?.id ?? null,
      targetAnchorId: context.targetAnchor?.id ?? null,
      sourcePoint,
      targetPoint,
      path: buildEdgePath(source, target, sourcePoint, targetPoint),
      points3d: buildEdgePoints3d(source, target, sourcePoint3d, targetPoint3d),
      isVirtualLink:
        context.source.objectRole === "virtual" || context.target.objectRole === "virtual",
    } satisfies CircuitPresentationEdge;
  });

  return {
    width:
      (stageDrafts[stageDrafts.length - 1]?.x ?? STAGE_PADDING_X) +
      (stageDrafts[stageDrafts.length - 1]?.width ?? BASE_STAGE_WIDTH) +
      STAGE_PADDING_X,
    height: PRESENTATION_HEIGHT,
    stageFrameTop: STAGE_FRAME_TOP,
    stageFrameHeight,
    stageLabelY: STAGE_LABEL_Y,
    footnoteY: FOOTNOTE_Y,
    stages: stageDrafts,
    nodes,
    edges,
  };
}

export function getPresentationStageFootprint3d(
  stage: CircuitPresentationStage,
): CircuitPresentationStageFootprint3d {
  return {
    x: (stage.x + stage.width / 2) / PRESENTATION_3D_X_SCALE,
    y: STAGE_FOOTPRINT_3D_HEIGHT / 2,
    z: stage.z,
    width: Math.max(4.4, stage.width / PRESENTATION_3D_X_SCALE - 0.16),
    height: STAGE_FOOTPRINT_3D_HEIGHT,
    depth: stage.depth,
  };
}
