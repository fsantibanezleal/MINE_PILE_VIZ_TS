import type { CircuitGraph, CircuitNode } from "@/types/app-data";

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
  width: number;
  height: number;
}

export interface CircuitPresentationEdge {
  id: string;
  source: string;
  target: string;
  label: string;
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

const STAGE_WIDTH = 220;
const STAGE_GAP = 240;
const STAGE_PADDING_X = 84;
const PHYSICAL_CENTER_Y = 234;
const VIRTUAL_CENTER_Y = 432;
const STACK_GAP = 118;

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

function distributeLane(count: number, centerY: number) {
  if (count <= 1) {
    return [centerY];
  }

  const totalHeight = (count - 1) * STACK_GAP;
  const startY = centerY - totalHeight / 2;

  return Array.from({ length: count }, (_, index) => startY + index * STACK_GAP);
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

function buildEdgePath(source: CircuitPresentationNode, target: CircuitPresentationNode) {
  const from = getPresentationOutputAnchor(source);
  const to = getPresentationInputAnchor(target);

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

function buildEdgePoints3d(source: CircuitPresentationNode, target: CircuitPresentationNode) {
  const from = getPresentationOutputAnchor(source);
  const to = getPresentationInputAnchor(target);
  const sourceY = source.visualKind === "physical-pile" ? 1.4 : 0.72;
  const targetY = target.visualKind === "physical-pile" ? 4.9 : 0.72;
  const sourceZ = source.objectRole === "physical" ? 0 : 9;
  const targetZ = target.objectRole === "physical" ? 0 : 9;
  const sourceX = from.x / 26;
  const targetX = to.x / 26;
  const midX = (sourceX + targetX) / 2;

  if (target.visualKind === "physical-pile") {
    return [
      [sourceX, sourceY, sourceZ],
      [midX, sourceY + 0.8, (sourceZ + targetZ) / 2],
      [targetX, targetY + 0.8, targetZ],
      [targetX, targetY, targetZ],
    ] as Array<[number, number, number]>;
  }

  if (source.visualKind === "physical-pile") {
    return [
      [sourceX, sourceY, sourceZ],
      [sourceX, sourceY - 1.2, sourceZ],
      [midX, Math.max(sourceY, targetY) - 0.4, (sourceZ + targetZ) / 2],
      [targetX, targetY, targetZ],
    ] as Array<[number, number, number]>;
  }

  return [
    [sourceX, sourceY, sourceZ],
    [midX, sourceY + 0.35, (sourceZ + targetZ) / 2],
    [targetX, targetY, targetZ],
  ] as Array<[number, number, number]>;
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
    const physicalNodes = stageNodes.filter((entry) => entry.objectRole === "physical");
    const virtualNodes = stageNodes.filter((entry) => entry.objectRole === "virtual");
    const nodeSize = getNodeSize(node);
    const stage = stageMap.get(node.stageIndex);

    let y = PHYSICAL_CENTER_Y;

    if (node.objectRole === "physical") {
      const lane = distributeLane(physicalNodes.length, PHYSICAL_CENTER_Y);
      y = lane[Math.max(0, physicalNodes.findIndex((entry) => entry.id === node.id))] ?? y;
    } else {
      const lane = distributeLane(virtualNodes.length, VIRTUAL_CENTER_Y);
      y =
        lane[Math.max(0, virtualNodes.findIndex((entry) => entry.id === node.id))] ??
        VIRTUAL_CENTER_Y;
    }

    return {
      ...node,
      visualKind: getNodeVisualKind(node),
      x: (stage?.x ?? STAGE_PADDING_X) + STAGE_WIDTH / 2,
      y,
      width: nodeSize.width,
      height: nodeSize.height,
    } satisfies CircuitPresentationNode;
  });

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const edges = graph.edges
    .map((edge) => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);

      if (!source || !target) {
        return null;
      }

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        path: buildEdgePath(source, target),
        points3d: buildEdgePoints3d(source, target),
        isVirtualLink: source.objectRole === "virtual" || target.objectRole === "virtual",
      } satisfies CircuitPresentationEdge;
    })
    .filter((edge): edge is CircuitPresentationEdge => edge !== null);

  return {
    width: STAGE_PADDING_X * 2 + Math.max(1, stages.length) * STAGE_GAP,
    height: 520,
    stages,
    nodes,
    edges,
  };
}
