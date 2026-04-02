import type { CircuitGraph } from "@/types/app-data";

export interface CircuitSequenceState {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
  upstreamNodeIds: Set<string>;
  downstreamNodeIds: Set<string>;
}

function walkConnected(startId: string, adjacency: Map<string, string[]>) {
  const visited = new Set<string>();
  const queue = [startId];

  while (queue.length > 0) {
    const currentId = queue.shift();

    if (!currentId) {
      continue;
    }

    const nextIds = adjacency.get(currentId) ?? [];

    nextIds.forEach((nextId) => {
      if (visited.has(nextId) || nextId === startId) {
        return;
      }

      visited.add(nextId);
      queue.push(nextId);
    });
  }

  return visited;
}

export function deriveCircuitSequence(
  graph: CircuitGraph,
  selectedObjectId?: string,
): CircuitSequenceState | null {
  if (!selectedObjectId || !graph.nodes.some((node) => node.id === selectedObjectId)) {
    return null;
  }

  const upstreamAdjacency = new Map<string, string[]>();
  const downstreamAdjacency = new Map<string, string[]>();

  graph.edges.forEach((edge) => {
    const upstream = upstreamAdjacency.get(edge.target) ?? [];
    upstream.push(edge.source);
    upstreamAdjacency.set(edge.target, upstream);

    const downstream = downstreamAdjacency.get(edge.source) ?? [];
    downstream.push(edge.target);
    downstreamAdjacency.set(edge.source, downstream);
  });

  const upstreamNodeIds = walkConnected(selectedObjectId, upstreamAdjacency);
  const downstreamNodeIds = walkConnected(selectedObjectId, downstreamAdjacency);
  const nodeIds = new Set<string>([
    selectedObjectId,
    ...upstreamNodeIds,
    ...downstreamNodeIds,
  ]);
  const edgeIds = new Set(
    graph.edges
      .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
      .map((edge) => edge.id),
  );

  return {
    nodeIds,
    edgeIds,
    upstreamNodeIds,
    downstreamNodeIds,
  };
}
