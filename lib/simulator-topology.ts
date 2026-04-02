import type { CircuitGraph, CircuitNode, GraphAnchor, ObjectRole } from "@/types/app-data";

export interface SimulatorDischargeBelt {
  objectId: string;
  label: string;
  objectRole: ObjectRole;
  stageIndex: number;
  depth: number;
  pathNodeIds: string[];
}

export interface SimulatorDischargeLane {
  output: GraphAnchor;
  belts: SimulatorDischargeBelt[];
}

function sortPileNodes(left: CircuitNode, right: CircuitNode) {
  if (left.objectRole !== right.objectRole) {
    return left.objectRole === "physical" ? -1 : 1;
  }

  if (left.stageIndex !== right.stageIndex) {
    return left.stageIndex - right.stageIndex;
  }

  return left.label.localeCompare(right.label);
}

export function getSimulatorPileNodes(graph: CircuitGraph) {
  return [...graph.nodes]
    .filter((node) => node.objectType === "pile")
    .sort(sortPileNodes);
}

export function buildSimulatorDischargeLanes(
  graph: CircuitGraph,
  selectedObjectId: string,
): SimulatorDischargeLane[] {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const edgesBySource = new Map<string, string[]>();

  graph.edges.forEach((edge) => {
    const current = edgesBySource.get(edge.source) ?? [];
    current.push(edge.target);
    edgesBySource.set(edge.source, current);
  });

  const selectedNode = graph.nodes.find((node) => node.objectId === selectedObjectId);

  if (!selectedNode || selectedNode.objectType !== "pile") {
    return [];
  }

  return selectedNode.outputs.map((output) => {
    const belts = new Map<string, SimulatorDischargeBelt>();
    const queue: Array<{
      nodeId: string;
      depth: number;
      pathNodeIds: string[];
    }> = [
      {
        nodeId: output.relatedObjectId,
        depth: 0,
        pathNodeIds: [selectedNode.id, output.relatedObjectId],
      },
    ];

    while (queue.length > 0) {
      const current = queue.shift();

      if (!current) {
        continue;
      }

      const node = nodeById.get(current.nodeId);

      if (!node) {
        continue;
      }

      if (node.objectType === "belt" && !belts.has(node.objectId)) {
        belts.set(node.objectId, {
          objectId: node.objectId,
          label: node.label,
          objectRole: node.objectRole,
          stageIndex: node.stageIndex,
          depth: current.depth,
          pathNodeIds: current.pathNodeIds,
        });
      }

      const nextNodeIds = edgesBySource.get(node.id) ?? [];

      nextNodeIds.forEach((nextNodeId) => {
        if (current.pathNodeIds.includes(nextNodeId)) {
          return;
        }

        const nextNode = nodeById.get(nextNodeId);

        if (!nextNode) {
          return;
        }

        if (
          nextNode.objectType === "pile" &&
          nextNode.objectRole === "physical" &&
          nextNode.objectId !== selectedObjectId
        ) {
          return;
        }

        queue.push({
          nodeId: nextNodeId,
          depth: current.depth + 1,
          pathNodeIds: [...current.pathNodeIds, nextNodeId],
        });
      });
    }

    return {
      output,
      belts: [...belts.values()].sort((left, right) => {
        if (left.depth !== right.depth) {
          return left.depth - right.depth;
        }

        if (left.stageIndex !== right.stageIndex) {
          return left.stageIndex - right.stageIndex;
        }

        return left.label.localeCompare(right.label);
      }),
    };
  });
}
