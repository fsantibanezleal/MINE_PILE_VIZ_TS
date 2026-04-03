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

interface StageDraft {
  index: number;
  label: string;
  x: number;
  width: number;
  slotCount: number;
  slotHints: number[];
  slotCenters: number[];
  clusterCount: number;
  maxClusterLogicalWidth: number;
  sidePaddingX: number;
  slotGap: number;
  framePaddingX: number;
  framePaddingTop: number;
  framePaddingBottom: number;
  crossAxisScale: number;
  depthScale: number;
}

interface StageClusterEntry {
  key: string;
  memberNodeIds: string[];
  multiMember: boolean;
  logicalWidthUnits: number;
}

interface StageClusterPlan {
  clusters: StageClusterEntry[];
  interClusterGapUnits: number;
  totalLogicalPositions: number;
  enablesGroupDepthZoning: boolean;
  maxClusterLogicalWidth: number;
}

const BASE_STAGE_WIDTH = 360;
const BASE_STAGE_GAP = 240;
const STAGE_PADDING_X = 96;
const STAGE_SIDE_PADDING_X = 74;
const STAGE_SLOT_GAP = 124;
const STAGE_SLOT_MIN_NORMALIZED = 0.18;
const STAGE_SLOT_MAX_NORMALIZED = 0.82;
const STAGE_MIN_SLOT_COUNT = 3;
const PRESENTATION_HEIGHT = 780;
const STAGE_FRAME_TOP = 26;
const STAGE_FRAME_BOTTOM_PADDING = 86;
const STAGE_LABEL_Y = 72;
const FOOTNOTE_Y = PRESENTATION_HEIGHT - 28;
const PRESENTATION_3D_X_SCALE = 26;
const STAGE_FOOTPRINT_3D_HEIGHT = 0.56;
const STAGE_DEPTH_PREDECESSOR_WEIGHT = 0.72;
const STAGE_DEPTH_KIND_OFFSET_SCALE = 0.92;
const LANE_TOP = 178;
const LANE_BOTTOM = 654;
const LANE_ORDER: CircuitPresentationVisualKind[] = [
  "physical-belt",
  "physical-pile",
  "virtual-belt",
  "virtual-pile",
];
const PILE_ANCHOR_MIN_X = 0.18;
const PILE_ANCHOR_MAX_X = 0.82;
const PILE_ANCHOR_DEPTH_STEP = 0.55;

const LANE_CONFIG: Record<
  CircuitPresentationVisualKind,
  {
    z: number;
    crossDepthSpan: number;
    orderingDepthSpan: number;
    groupDepthSpan: number;
    crossYOffset: number;
  }
> = {
  "physical-belt": {
    z: -2.8,
    crossDepthSpan: 0.9,
    orderingDepthSpan: 1.2,
    groupDepthSpan: 0.65,
    crossYOffset: 18,
  },
  "physical-pile": {
    z: 1.8,
    crossDepthSpan: 0.7,
    orderingDepthSpan: 0.84,
    groupDepthSpan: 0.25,
    crossYOffset: 14,
  },
  "virtual-belt": {
    z: 7.6,
    crossDepthSpan: 2.3,
    orderingDepthSpan: 1.12,
    groupDepthSpan: 1.5,
    crossYOffset: 54,
  },
  "virtual-pile": {
    z: 11.2,
    crossDepthSpan: 1.7,
    orderingDepthSpan: 0.96,
    groupDepthSpan: 1.1,
    crossYOffset: 32,
  },
};

const DEFAULT_FLOW_HINT: Record<CircuitPresentationVisualKind, number> = {
  "physical-belt": 0.28,
  "physical-pile": 0.5,
  "virtual-belt": 0.64,
  "virtual-pile": 0.72,
};
const EMPTY_NORMALIZED_ASSIGNMENTS = new Map<string, number>();
const EMPTY_CROSS_AXIS_ASSIGNMENTS = new Map<string, number>();

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

function getNodeDepthEnvelope(node: Pick<CircuitPresentationNode, "visualKind">) {
  switch (node.visualKind) {
    case "physical-pile":
      return 3.8;
    case "virtual-pile":
      return 2.8;
    case "virtual-belt":
      return 2.4;
    default:
      return 1.9;
  }
}

function getLaneCenterY(visualKind: CircuitPresentationVisualKind) {
  const laneIndex = LANE_ORDER.indexOf(visualKind);

  if (laneIndex <= 0) {
    return LANE_TOP;
  }

  if (laneIndex >= LANE_ORDER.length - 1) {
    return LANE_BOTTOM;
  }

  return LANE_TOP + ((LANE_BOTTOM - LANE_TOP) * laneIndex) / (LANE_ORDER.length - 1);
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

function getAnchorBandHint(anchor: GraphAnchor | undefined) {
  const normalizedY = clamp(anchor?.y ?? 0.5, 0, 1);
  return clamp((normalizedY - 0.5) * 3.4, -1, 1);
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
  const centerX = node.x / PRESENTATION_3D_X_SCALE;
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

function getStageSlotHints(slotCount: number) {
  if (slotCount <= 1) {
    return [0.5];
  }

  return Array.from({ length: slotCount }, (_, index) => {
    return (
      STAGE_SLOT_MIN_NORMALIZED +
      ((STAGE_SLOT_MAX_NORMALIZED - STAGE_SLOT_MIN_NORMALIZED) * index) /
        (slotCount - 1)
    );
  });
}

function getStageSlotCenters(
  stageX: number,
  stageWidth: number,
  slotCount: number,
  maxNodeWidth: number,
  sidePaddingX: number,
) {
  if (slotCount <= 1) {
    return [stageX + stageWidth / 2];
  }

  const left = stageX + sidePaddingX + maxNodeWidth / 2;
  const right = stageX + stageWidth - sidePaddingX - maxNodeWidth / 2;

  return Array.from({ length: slotCount }, (_, index) => {
    return left + ((right - left) * index) / (slotCount - 1);
  });
}

function getDistributedSlotIndices(slotCount: number, nodeCount: number) {
  if (nodeCount <= 0 || slotCount <= 0) {
    return [];
  }

  if (nodeCount === 1) {
    return [Math.floor((slotCount - 1) / 2)];
  }

  const indices = Array.from({ length: nodeCount }, (_, index) =>
    Math.round((index * (slotCount - 1)) / (nodeCount - 1)),
  );

  for (let index = 1; index < indices.length; index += 1) {
    indices[index] = Math.max(indices[index]!, indices[index - 1]! + 1);
  }

  for (let index = indices.length - 2; index >= 0; index -= 1) {
    indices[index] = Math.min(indices[index]!, indices[index + 1]! - 1);
  }

  return indices.map((index) => clamp(index, 0, slotCount - 1));
}

function getConnectionHint(
  context: CircuitPresentationEdgeContext,
  direction: "source" | "target",
  normalizedAssignments: Map<string, number>,
) {
  const sourceVisualKind = getNodeVisualKind(context.source);
  const targetVisualKind = getNodeVisualKind(context.target);

  if (sourceVisualKind === "physical-pile" && context.sourceAnchor) {
    return getNormalizedPileAnchorX(context.sourceAnchor);
  }

  if (targetVisualKind === "physical-pile" && context.targetAnchor) {
    return getNormalizedPileAnchorX(context.targetAnchor);
  }

  if (direction === "target") {
    return (
      normalizedAssignments.get(context.source.id) ??
      DEFAULT_FLOW_HINT[sourceVisualKind]
    );
  }

  return (
    normalizedAssignments.get(context.target.id) ??
    DEFAULT_FLOW_HINT[targetVisualKind]
  );
}

function getConnectionBandHint(
  context: CircuitPresentationEdgeContext,
  direction: "source" | "target",
  crossAxisAssignments: Map<string, number>,
) {
  const sourceVisualKind = getNodeVisualKind(context.source);
  const targetVisualKind = getNodeVisualKind(context.target);

  if (sourceVisualKind === "physical-pile" && context.sourceAnchor) {
    return getAnchorBandHint(context.sourceAnchor);
  }

  if (targetVisualKind === "physical-pile" && context.targetAnchor) {
    return getAnchorBandHint(context.targetAnchor);
  }

  if (direction === "target") {
    return crossAxisAssignments.get(context.source.id) ?? 0;
  }

  return crossAxisAssignments.get(context.target.id) ?? 0;
}

function getNodeBranchGroupKey(
  node: CircuitNode,
  incomingByNodeId: Map<string, CircuitPresentationEdgeContext[]>,
  outgoingByNodeId: Map<string, CircuitPresentationEdgeContext[]>,
) {
  const outgoing = (outgoingByNodeId.get(node.id) ?? []).filter(
    (context) => context.target.stageIndex > node.stageIndex,
  );

  if (outgoing.length > 0) {
    const nextStageIndex = Math.min(
      ...outgoing.map((context) => context.target.stageIndex),
    );
    const relatedTargetIds = [...new Set(
      outgoing
        .filter((context) => context.target.stageIndex === nextStageIndex)
        .map((context) => context.target.id),
    )].sort((left, right) => left.localeCompare(right));

    return `out:${nextStageIndex}:${relatedTargetIds.join("|")}`;
  }

  const incoming = (incomingByNodeId.get(node.id) ?? []).filter(
    (context) => context.source.stageIndex < node.stageIndex,
  );

  if (incoming.length > 0) {
    const previousStageIndex = Math.max(
      ...incoming.map((context) => context.source.stageIndex),
    );
    const relatedSourceIds = [...new Set(
      incoming
        .filter((context) => context.source.stageIndex === previousStageIndex)
        .map((context) => context.source.id),
    )].sort((left, right) => left.localeCompare(right));

    return `in:${previousStageIndex}:${relatedSourceIds.join("|")}`;
  }

  return `self:${node.id}`;
}

function buildStageClusterPlan<
  T extends {
    node: CircuitNode;
    xHint: number;
    crossAxisHint: number;
    clusterKey: string;
  },
>(entries: T[]) {
  const groupedEntries = new Map<string, T[]>();

  entries.forEach((entry) => {
    const current = groupedEntries.get(entry.clusterKey) ?? [];
    current.push(entry);
    groupedEntries.set(entry.clusterKey, current);
  });

  const clusters = [...groupedEntries.entries()]
    .map(([key, clusterEntries]) => ({
      clusterEntries,
      key,
      memberNodeIds: clusterEntries.map((entry) => entry.node.id),
      multiMember: clusterEntries.length > 1,
      xHint:
        clusterEntries.reduce((sum, entry) => sum + entry.xHint, 0) /
        Math.max(clusterEntries.length, 1),
      crossAxisHint:
        clusterEntries.reduce((sum, entry) => sum + entry.crossAxisHint, 0) /
        Math.max(clusterEntries.length, 1),
      flowSpread:
        clusterEntries.length > 1
          ? Math.max(...clusterEntries.map((entry) => entry.xHint)) -
            Math.min(...clusterEntries.map((entry) => entry.xHint))
          : 0,
      crossAxisSpread:
        clusterEntries.length > 1
          ? Math.max(...clusterEntries.map((entry) => entry.crossAxisHint)) -
            Math.min(...clusterEntries.map((entry) => entry.crossAxisHint))
          : 0,
      visualKinds: new Set(
        clusterEntries.map((entry) => getNodeVisualKind(entry.node)),
      ),
    }))
    .sort((left, right) => {
      const hintDifference = left.xHint - right.xHint;

      if (Math.abs(hintDifference) > 1e-6) {
        return hintDifference;
      }

      const bandDifference = left.crossAxisHint - right.crossAxisHint;

      if (Math.abs(bandDifference) > 1e-6) {
        return bandDifference;
      }

      return left.key.localeCompare(right.key);
    });
  const logicalClusters = clusters.map((cluster) => {
    const branchWidthBonus = Math.ceil(
      Math.max(0, cluster.clusterEntries.length - 1) * 0.35,
    );
    const flowSpreadBonus = cluster.flowSpread > 0.24 ? 1 : 0;
    const crossAxisSpreadBonus = cluster.crossAxisSpread > 0.42 ? 1 : 0;
    const mixedVisualBonus = cluster.visualKinds.size > 1 ? 1 : 0;

    return {
      key: cluster.key,
      memberNodeIds: cluster.memberNodeIds,
      multiMember: cluster.multiMember,
      logicalWidthUnits:
        cluster.clusterEntries.length +
        branchWidthBonus +
        flowSpreadBonus +
        crossAxisSpreadBonus +
        mixedVisualBonus,
    };
  });
  const maxClusterLogicalWidth = logicalClusters.reduce(
    (maxWidth, cluster) => Math.max(maxWidth, cluster.logicalWidthUnits),
    1,
  );
  const interClusterGapUnits =
    logicalClusters.length <= 1
      ? 0
      : Math.min(
          3,
          1 +
            (logicalClusters.some((cluster) => cluster.multiMember) ? 1 : 0) +
            (maxClusterLogicalWidth >= 4 ? 1 : 0),
        );
  const totalLogicalPositions =
    logicalClusters.reduce(
      (sum, cluster) => sum + cluster.logicalWidthUnits,
      0,
    ) +
    Math.max(0, logicalClusters.length - 1) * interClusterGapUnits;
  const stageVisualKinds = new Set(entries.map((entry) => getNodeVisualKind(entry.node)));

  return {
    clusters: logicalClusters.map((cluster) => ({
      key: cluster.key,
      memberNodeIds: cluster.memberNodeIds,
      multiMember: cluster.multiMember,
      logicalWidthUnits: cluster.logicalWidthUnits,
    })),
    interClusterGapUnits,
    totalLogicalPositions,
    enablesGroupDepthZoning:
      logicalClusters.length > 1 &&
      stageVisualKinds.size === 1 &&
      entries.length > 1,
    maxClusterLogicalWidth,
  } satisfies StageClusterPlan;
}

function getStageDefaultDepthBase(nodes: CircuitNode[]) {
  if (nodes.length === 0) {
    return 0;
  }

  return (
    nodes.reduce(
      (sum, node) => sum + LANE_CONFIG[getNodeVisualKind(node)].z,
      0,
    ) / nodes.length
  );
}

function buildStageDepthBaseMap(
  stages: CircuitGraph["stages"],
  nodesByStage: Map<number, CircuitNode[]>,
  incomingByNodeId: Map<string, CircuitPresentationEdgeContext[]>,
) {
  const stageDepthBaseMap = new Map<number, number>();

  [...stages]
    .sort((left, right) => left.index - right.index)
    .forEach((stage) => {
      const stageNodes = nodesByStage.get(stage.index) ?? [];
      const defaultDepthBase = getStageDefaultDepthBase(stageNodes);
      const predecessorStageBases = [
        ...new Set(
          stageNodes.flatMap((node) =>
            (incomingByNodeId.get(node.id) ?? [])
              .filter((context) => context.source.stageIndex < stage.index)
              .map((context) => context.source.stageIndex),
          ),
        ),
      ]
        .map((stageIndex) => stageDepthBaseMap.get(stageIndex))
        .filter((value): value is number => typeof value === "number");

      if (predecessorStageBases.length === 0) {
        stageDepthBaseMap.set(stage.index, defaultDepthBase);
        return;
      }

      const predecessorAverage =
        predecessorStageBases.reduce((sum, value) => sum + value, 0) /
        predecessorStageBases.length;

      stageDepthBaseMap.set(
        stage.index,
        predecessorAverage * STAGE_DEPTH_PREDECESSOR_WEIGHT +
          defaultDepthBase * (1 - STAGE_DEPTH_PREDECESSOR_WEIGHT),
      );
    });

  return stageDepthBaseMap;
}

function getStageSlotCount(
  nodes: CircuitNode[],
  incomingByNodeId: Map<string, CircuitPresentationEdgeContext[]>,
  outgoingByNodeId: Map<string, CircuitPresentationEdgeContext[]>,
) {
  const clusterPlan = buildStageClusterPlan(
    nodes.map((node) => ({
      node,
      xHint: getNodeFlowHint(
        node,
        incomingByNodeId,
        outgoingByNodeId,
        EMPTY_NORMALIZED_ASSIGNMENTS,
      ),
      crossAxisHint: getNodeCrossAxisHint(
        node,
        incomingByNodeId,
        outgoingByNodeId,
        EMPTY_CROSS_AXIS_ASSIGNMENTS,
      ),
      clusterKey: getNodeBranchGroupKey(
        node,
        incomingByNodeId,
        outgoingByNodeId,
      ),
    })),
  );
  const fanoutDemand = nodes.reduce((maxDemand, node) => {
    return Math.max(
      maxDemand,
      node.inputs.length + 1,
      node.outputs.length + 1,
      (incomingByNodeId.get(node.id)?.length ?? 0) + 1,
      (outgoingByNodeId.get(node.id)?.length ?? 0) + 1,
    );
  }, 0);

  return Math.max(
    STAGE_MIN_SLOT_COUNT,
    nodes.length,
    fanoutDemand,
    clusterPlan.totalLogicalPositions,
  );
}

function getStageSidePaddingX(
  stageNodes: CircuitNode[],
  slotCount: number,
  clusterCount: number,
  maxClusterLogicalWidth: number,
) {
  const hasPhysicalPile = stageNodes.some(
    (node) => getNodeVisualKind(node) === "physical-pile",
  );
  const hasVirtualObjects = stageNodes.some(
    (node) => node.objectRole === "virtual",
  );

  return (
    STAGE_SIDE_PADDING_X +
    Math.max(0, slotCount - STAGE_MIN_SLOT_COUNT) * 10 +
    Math.max(0, clusterCount - 1) * 12 +
    Math.max(0, maxClusterLogicalWidth - 2) * 6 +
    (hasPhysicalPile ? 14 : 0) +
    (hasVirtualObjects ? 6 : 0)
  );
}

function getStageSlotGap(
  slotCount: number,
  clusterCount: number,
  maxClusterLogicalWidth: number,
) {
  return (
    STAGE_SLOT_GAP +
    Math.max(0, slotCount - STAGE_MIN_SLOT_COUNT) * 8 +
    Math.max(0, clusterCount - 1) * 6 +
    Math.max(0, maxClusterLogicalWidth - 2) * 4
  );
}

function getStageFramePadding(
  stageNodes: CircuitNode[],
  slotCount: number,
  clusterCount: number,
  maxClusterLogicalWidth: number,
) {
  const hasPhysicalPile = stageNodes.some(
    (node) => getNodeVisualKind(node) === "physical-pile",
  );
  const hasVirtualObjects = stageNodes.some(
    (node) => node.objectRole === "virtual",
  );

  return {
    x:
      28 +
      Math.max(0, slotCount - STAGE_MIN_SLOT_COUNT) * 8 +
      Math.max(0, clusterCount - 1) * 6 +
      Math.max(0, maxClusterLogicalWidth - 2) * 4,
    top:
      54 +
      Math.max(0, clusterCount - 1) * 4 +
      Math.max(0, maxClusterLogicalWidth - 2) * 3 +
      (hasPhysicalPile ? 8 : 0),
    bottom:
      26 +
      Math.max(0, slotCount - STAGE_MIN_SLOT_COUNT) * 4 +
      Math.max(0, maxClusterLogicalWidth - 2) * 2 +
      (hasVirtualObjects ? 6 : 0),
  };
}

function getStageDepthPadding(
  stageDraft: Pick<StageDraft, "slotCount" | "clusterCount" | "maxClusterLogicalWidth">,
) {
  return (
    5.6 +
    Math.max(0, stageDraft.slotCount - STAGE_MIN_SLOT_COUNT) * 0.85 +
    Math.max(0, stageDraft.clusterCount - 1) * 0.9 +
    Math.max(0, stageDraft.maxClusterLogicalWidth - 2) * 0.55
  );
}

function getStageMinimumDepth(
  stageDraft: Pick<StageDraft, "slotCount" | "clusterCount" | "maxClusterLogicalWidth">,
) {
  return (
    18.8 +
    Math.max(0, stageDraft.slotCount - STAGE_MIN_SLOT_COUNT) * 0.75 +
    Math.max(0, stageDraft.clusterCount - 1) * 0.65 +
    Math.max(0, stageDraft.maxClusterLogicalWidth - 2) * 0.7
  );
}

function getStageCrossAxisScale(
  slotCount: number,
  clusterCount: number,
  maxClusterLogicalWidth: number,
) {
  return (
    1 +
    Math.min(
      0.58,
      Math.max(0, slotCount - STAGE_MIN_SLOT_COUNT) * 0.03 +
        Math.max(0, clusterCount - 1) * 0.08 +
        Math.max(0, maxClusterLogicalWidth - 2) * 0.06,
    )
  );
}

function getStageDepthScale(
  slotCount: number,
  clusterCount: number,
  maxClusterLogicalWidth: number,
) {
  return (
    1 +
    Math.min(
      0.82,
      Math.max(0, slotCount - STAGE_MIN_SLOT_COUNT) * 0.035 +
        Math.max(0, clusterCount - 1) * 0.1 +
        Math.max(0, maxClusterLogicalWidth - 2) * 0.08,
    )
  );
}

function getNodeFlowHint(
  node: CircuitNode,
  incomingByNodeId: Map<string, CircuitPresentationEdgeContext[]>,
  outgoingByNodeId: Map<string, CircuitPresentationEdgeContext[]>,
  normalizedAssignments: Map<string, number>,
) {
  const predecessorHints = (incomingByNodeId.get(node.id) ?? [])
    .filter((context) => context.source.stageIndex < node.stageIndex)
    .map((context) => getConnectionHint(context, "target", normalizedAssignments));

  if (predecessorHints.length > 0) {
    return predecessorHints.reduce((sum, value) => sum + value, 0) / predecessorHints.length;
  }

  const outgoingHints = (outgoingByNodeId.get(node.id) ?? [])
    .filter((context) => context.target.stageIndex > node.stageIndex)
    .map((context) => getConnectionHint(context, "source", normalizedAssignments));

  if (outgoingHints.length > 0) {
    return outgoingHints.reduce((sum, value) => sum + value, 0) / outgoingHints.length;
  }

  return DEFAULT_FLOW_HINT[getNodeVisualKind(node)];
}

function getNodeCrossAxisHint(
  node: CircuitNode,
  incomingByNodeId: Map<string, CircuitPresentationEdgeContext[]>,
  outgoingByNodeId: Map<string, CircuitPresentationEdgeContext[]>,
  crossAxisAssignments: Map<string, number>,
) {
  const predecessorHints = (incomingByNodeId.get(node.id) ?? [])
    .filter((context) => context.source.stageIndex < node.stageIndex)
    .map((context) =>
      getConnectionBandHint(context, "target", crossAxisAssignments),
    );

  if (predecessorHints.length > 0) {
    return predecessorHints.reduce((sum, value) => sum + value, 0) / predecessorHints.length;
  }

  const outgoingHints = (outgoingByNodeId.get(node.id) ?? [])
    .filter((context) => context.target.stageIndex > node.stageIndex)
    .map((context) =>
      getConnectionBandHint(context, "source", crossAxisAssignments),
    );

  if (outgoingHints.length > 0) {
    return outgoingHints.reduce((sum, value) => sum + value, 0) / outgoingHints.length;
  }

  return 0;
}

export function buildCircuitPresentation(graph: CircuitGraph): CircuitPresentation {
  const baseNodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const edgeContexts = buildEdgeContexts(graph, baseNodeMap);
  const nodesByStage = new Map<number, CircuitNode[]>();
  const incomingByNodeId = new Map<string, CircuitPresentationEdgeContext[]>();
  const outgoingByNodeId = new Map<string, CircuitPresentationEdgeContext[]>();

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
  const stageDrafts: StageDraft[] = graph.stages.map((stage) => {
    const stageNodes = nodesByStage.get(stage.index) ?? [];
    const widthClusterPlan = buildStageClusterPlan(
      stageNodes.map((node) => ({
        node,
        xHint: getNodeFlowHint(
          node,
          incomingByNodeId,
          outgoingByNodeId,
          EMPTY_NORMALIZED_ASSIGNMENTS,
        ),
        crossAxisHint: getNodeCrossAxisHint(
          node,
          incomingByNodeId,
          outgoingByNodeId,
          EMPTY_CROSS_AXIS_ASSIGNMENTS,
        ),
        clusterKey: getNodeBranchGroupKey(
          node,
          incomingByNodeId,
          outgoingByNodeId,
        ),
      })),
    );
    const slotCount = getStageSlotCount(
      stageNodes,
      incomingByNodeId,
      outgoingByNodeId,
    );
    const maxNodeWidth = stageNodes.reduce((maxWidth, node) => {
      return Math.max(maxWidth, getNodeSize(node).width);
    }, 140);
    const clusterCount = Math.max(1, widthClusterPlan.clusters.length);
    const maxClusterLogicalWidth = widthClusterPlan.maxClusterLogicalWidth;
    const sidePaddingX = getStageSidePaddingX(
      stageNodes,
      slotCount,
      clusterCount,
      maxClusterLogicalWidth,
    );
    const slotGap = getStageSlotGap(
      slotCount,
      clusterCount,
      maxClusterLogicalWidth,
    );
    const framePadding = getStageFramePadding(
      stageNodes,
      slotCount,
      clusterCount,
      maxClusterLogicalWidth,
    );
    const crossAxisScale = getStageCrossAxisScale(
      slotCount,
      clusterCount,
      maxClusterLogicalWidth,
    );
    const depthScale = getStageDepthScale(
      slotCount,
      clusterCount,
      maxClusterLogicalWidth,
    );
    const width = Math.max(
      BASE_STAGE_WIDTH,
      sidePaddingX * 2 + maxNodeWidth + (slotCount - 1) * slotGap,
    );
    const draft = {
      index: stage.index,
      label: stage.label,
      x: currentStageX,
      width,
      slotCount,
      slotHints: getStageSlotHints(slotCount),
      slotCenters: getStageSlotCenters(
        currentStageX,
        width,
        slotCount,
        maxNodeWidth,
        sidePaddingX,
      ),
      clusterCount,
      maxClusterLogicalWidth,
      sidePaddingX,
      slotGap,
      framePaddingX: framePadding.x,
      framePaddingTop: framePadding.top,
      framePaddingBottom: framePadding.bottom,
      crossAxisScale,
      depthScale,
    } satisfies StageDraft;

    currentStageX += width + BASE_STAGE_GAP;

    return draft;
  });

  const stageMap = new Map(stageDrafts.map((stage) => [stage.index, stage]));
  const normalizedAssignments = new Map<string, number>();
  const crossAxisAssignments = new Map<string, number>();
  const groupDepthAssignments = new Map<string, number>();
  const slotAssignments = new Map<string, number>();
  const stageDefaultDepthBaseMap = new Map(
    graph.stages.map((stage) => [
      stage.index,
      getStageDefaultDepthBase(nodesByStage.get(stage.index) ?? []),
    ]),
  );
  const stageDepthBaseMap = buildStageDepthBaseMap(
    graph.stages,
    nodesByStage,
    incomingByNodeId,
  );

  graph.stages.forEach((stage) => {
    const stageNodes = nodesByStage.get(stage.index) ?? [];
    const stageDraft = stageMap.get(stage.index);

    if (!stageDraft) {
      return;
    }

    const orderedNodes = stageNodes
      .map((node) => ({
        node,
        xHint: getNodeFlowHint(
          node,
          incomingByNodeId,
          outgoingByNodeId,
          normalizedAssignments,
        ),
        crossAxisHint: getNodeCrossAxisHint(
          node,
          incomingByNodeId,
          outgoingByNodeId,
          crossAxisAssignments,
        ),
        clusterKey: getNodeBranchGroupKey(
          node,
          incomingByNodeId,
          outgoingByNodeId,
        ),
      }))
      .sort((left, right) => {
        const hintDifference = left.xHint - right.xHint;

        if (Math.abs(hintDifference) > 1e-6) {
          return hintDifference;
        }

        const crossAxisDifference = left.crossAxisHint - right.crossAxisHint;

        if (Math.abs(crossAxisDifference) > 1e-6) {
          return crossAxisDifference;
        }

        return (
          LANE_ORDER.indexOf(getNodeVisualKind(left.node)) -
            LANE_ORDER.indexOf(getNodeVisualKind(right.node)) ||
          left.node.label.localeCompare(right.node.label)
        );
      });
    const clusterPlan = buildStageClusterPlan(orderedNodes);
    const logicalSlotIndices = getDistributedSlotIndices(
      stageDraft.slotCount,
      clusterPlan.totalLogicalPositions,
    );
    let logicalPositionIndex = 0;

    clusterPlan.clusters.forEach((cluster, clusterIndex) => {
      const clusterNodes = orderedNodes.filter(
        (entry) => entry.clusterKey === cluster.key,
      );
      const clusterSlotWindow = logicalSlotIndices.slice(
        logicalPositionIndex,
        logicalPositionIndex + cluster.logicalWidthUnits,
      );
      const clusterWindowMargin =
        clusterPlan.clusters.length > 1
          ? Math.min(
              1,
              Math.floor(
                Math.max(
                  0,
                  clusterSlotWindow.length - clusterNodes.length,
                ) / 2,
              ),
            )
          : 0;
      const usableClusterWindow =
        clusterWindowMargin > 0
          ? clusterSlotWindow.slice(
              clusterWindowMargin,
              clusterSlotWindow.length - clusterWindowMargin,
            )
          : clusterSlotWindow;
      const clusterLocalSlots =
        usableClusterWindow.length > 0
          ? getDistributedSlotIndices(
              usableClusterWindow.length,
              clusterNodes.length,
            ).map((slotIndex) => usableClusterWindow[slotIndex]!)
          : [];
      const normalizedGroupDepthHint =
        clusterPlan.enablesGroupDepthZoning && clusterPlan.clusters.length > 1
          ? (clusterIndex / (clusterPlan.clusters.length - 1)) * 2 - 1
          : 0;

      clusterNodes.forEach(({ node, xHint, crossAxisHint }, memberIndex) => {
        const slotIndex =
          clusterLocalSlots[memberIndex] ??
          Math.floor((stageDraft.slotCount - 1) / 2);
        const assignedHint =
          stageDraft.slotHints[slotIndex]! * 0.62 + clamp(xHint, 0, 1) * 0.38;

        slotAssignments.set(node.id, slotIndex);
        normalizedAssignments.set(node.id, clamp(assignedHint, 0, 1));
        crossAxisAssignments.set(node.id, clamp(crossAxisHint, -1, 1));
        groupDepthAssignments.set(node.id, normalizedGroupDepthHint);
      });

      logicalPositionIndex += cluster.logicalWidthUnits;

      if (clusterIndex < clusterPlan.clusters.length - 1) {
        logicalPositionIndex += clusterPlan.interClusterGapUnits;
      }
    });
  });

  const nodes = graph.nodes.map((node) => {
    const visualKind = getNodeVisualKind(node);
    const nodeSize = getNodeSize(node);
    const stage = stageMap.get(node.stageIndex);
    const laneCenterY = getLaneCenterY(visualKind);
    const slotIndex =
      slotAssignments.get(node.id) ?? Math.floor((stage?.slotCount ?? 1) / 2);
    const assignedHint =
      normalizedAssignments.get(node.id) ?? DEFAULT_FLOW_HINT[visualKind];
    const crossAxisHint = crossAxisAssignments.get(node.id) ?? 0;
    const groupDepthHint = groupDepthAssignments.get(node.id) ?? 0;
    const slotCenterX =
      stage?.slotCenters[slotIndex] ??
      (stage?.x ?? STAGE_PADDING_X) + (stage?.width ?? BASE_STAGE_WIDTH) / 2;
    const laneConfig = LANE_CONFIG[visualKind];
    const stageNodeCount = nodesByStage.get(node.stageIndex)?.length ?? 1;
    const crossAxisScale = stage?.crossAxisScale ?? 1;
    const depthScale = stage?.depthScale ?? 1;
    const yOffset =
      stageNodeCount > 1
        ? crossAxisHint * laneConfig.crossYOffset * crossAxisScale
        : 0;
    const yTopBound = STAGE_FRAME_TOP + nodeSize.height / 2 + 46;
    const yBottomBound =
      PRESENTATION_HEIGHT -
      STAGE_FRAME_BOTTOM_PADDING -
      nodeSize.height / 2 -
      42;
    const stageDefaultDepthBase =
      stageDefaultDepthBaseMap.get(node.stageIndex) ?? laneConfig.z;
    const stageDepthBase = stageDepthBaseMap.get(node.stageIndex) ?? stageDefaultDepthBase;
    const visualKindDepthOffset =
      (laneConfig.z - stageDefaultDepthBase) * STAGE_DEPTH_KIND_OFFSET_SCALE;

    return {
      ...node,
      visualKind,
      x: slotCenterX,
      y: clamp(laneCenterY + yOffset, yTopBound, yBottomBound),
      z:
        stageDepthBase +
        visualKindDepthOffset +
        groupDepthHint * laneConfig.groupDepthSpan * depthScale +
        crossAxisHint * laneConfig.crossDepthSpan * depthScale +
        (assignedHint - 0.5) * laneConfig.orderingDepthSpan,
      width: nodeSize.width,
      height: nodeSize.height,
    } satisfies CircuitPresentationNode;
  });

  const stageDepthByIndex = new Map<number, { z: number; depth: number }>();

  graph.stages.forEach((stage) => {
    const memberNodes = nodes.filter((node) => node.stageIndex === stage.index);
    const stageDraft = stageMap.get(stage.index);

    if (memberNodes.length === 0) {
      stageDepthByIndex.set(stage.index, {
        z: 3.6,
        depth: stageDraft ? getStageMinimumDepth(stageDraft) : 18.8,
      });
      return;
    }

    const minZ = Math.min(
      ...memberNodes.map((node) => node.z - getNodeDepthEnvelope(node)),
    );
    const maxZ = Math.max(
      ...memberNodes.map((node) => node.z + getNodeDepthEnvelope(node)),
    );

    stageDepthByIndex.set(stage.index, {
      z: (minZ + maxZ) / 2,
        depth: Math.max(
          stageDraft ? getStageMinimumDepth(stageDraft) : 18.8,
          maxZ -
            minZ +
            getStageDepthPadding(
              stageDraft ?? {
                slotCount: 3,
                clusterCount: 1,
                maxClusterLogicalWidth: 1,
              },
            ),
        ),
      });
  });

  const stages = stageDrafts.map((stage) => ({
    index: stage.index,
    label: stage.label,
    x: stage.x,
    width: stage.width,
    z: stageDepthByIndex.get(stage.index)?.z ?? 3.6,
    depth: stageDepthByIndex.get(stage.index)?.depth ?? 18.8,
    framePaddingX: stage.framePaddingX,
    framePaddingTop: stage.framePaddingTop,
    framePaddingBottom: stage.framePaddingBottom,
  }));

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const edges = edgeContexts.map((context) => {
    const source = nodeMap.get(context.source.id)!;
    const target = nodeMap.get(context.target.id)!;
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
      (stages[stages.length - 1]?.x ?? STAGE_PADDING_X) +
      (stages[stages.length - 1]?.width ?? BASE_STAGE_WIDTH) +
      STAGE_PADDING_X,
    height: PRESENTATION_HEIGHT,
    stageFrameTop: STAGE_FRAME_TOP,
    stageFrameHeight:
      PRESENTATION_HEIGHT - STAGE_FRAME_TOP - STAGE_FRAME_BOTTOM_PADDING,
    stageLabelY: STAGE_LABEL_Y,
    footnoteY: FOOTNOTE_Y,
    stages,
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
    width: Math.max(4.4, stage.width / PRESENTATION_3D_X_SCALE - 0.64),
    height: STAGE_FOOTPRINT_3D_HEIGHT,
    depth: stage.depth,
  };
}
