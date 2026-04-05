import type { CircuitGraph, CircuitNode } from "@/types/app-data";

export interface LiveBeltRouteContext {
  stageLabel: string;
  stageIndex: number;
  upstreamNodes: CircuitNode[];
  downstreamNodes: CircuitNode[];
  stagePeers: CircuitNode[];
}

function uniqueNodes(nodes: CircuitNode[]) {
  const seen = new Set<string>();
  const result: CircuitNode[] = [];

  nodes.forEach((node) => {
    if (seen.has(node.id)) {
      return;
    }

    seen.add(node.id);
    result.push(node);
  });

  return result;
}

export function deriveLiveBeltRouteContext(
  graph: CircuitGraph,
  objectId: string,
): LiveBeltRouteContext | null {
  const node = graph.nodes.find((candidate) => candidate.objectId === objectId);

  if (!node) {
    return null;
  }

  const stage = graph.stages.find((candidate) => candidate.index === node.stageIndex);
  const nodeById = new Map(graph.nodes.map((candidate) => [candidate.id, candidate]));
  const upstreamNodes = uniqueNodes(
    graph.edges
      .filter((edge) => edge.target === node.id)
      .map((edge) => nodeById.get(edge.source))
      .filter((candidate): candidate is CircuitNode => Boolean(candidate)),
  );
  const downstreamNodes = uniqueNodes(
    graph.edges
      .filter((edge) => edge.source === node.id)
      .map((edge) => nodeById.get(edge.target))
      .filter((candidate): candidate is CircuitNode => Boolean(candidate)),
  );
  const stagePeers = graph.nodes.filter(
    (candidate) =>
      candidate.stageIndex === node.stageIndex && candidate.id !== node.id,
  );

  return {
    stageLabel: stage?.label ?? `Stage ${node.stageIndex + 1}`,
    stageIndex: node.stageIndex,
    upstreamNodes,
    downstreamNodes,
    stagePeers,
  };
}
