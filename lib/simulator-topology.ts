import type {
  CircuitGraph,
  CircuitNode,
  GraphAnchor,
  ObjectRole,
} from "@/types/app-data";

export interface SimulatorDischargeBelt {
  objectId: string;
  label: string;
  objectRole: ObjectRole;
  stageIndex: number;
  depth: number;
  pathNodeIds: string[];
}

export interface SimulatorDischargeMergeNode {
  objectId: string;
  label: string;
  objectRole: ObjectRole;
  stageIndex: number;
  pathNodeIds: string[];
  downstreamBelts: SimulatorDischargeBelt[];
}

export interface SimulatorDischargeLane {
  output: GraphAnchor;
  directBelts: SimulatorDischargeBelt[];
  mergeNodes: SimulatorDischargeMergeNode[];
  downstreamBelts: SimulatorDischargeBelt[];
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

function sortBelts(left: SimulatorDischargeBelt, right: SimulatorDischargeBelt) {
  if (left.depth !== right.depth) {
    return left.depth - right.depth;
  }

  if (left.stageIndex !== right.stageIndex) {
    return left.stageIndex - right.stageIndex;
  }

  return left.label.localeCompare(right.label);
}

function createBeltDescriptor(
  node: CircuitNode,
  depth: number,
  pathNodeIds: string[],
): SimulatorDischargeBelt {
  return {
    objectId: node.objectId,
    label: node.label,
    objectRole: node.objectRole,
    stageIndex: node.stageIndex,
    depth,
    pathNodeIds,
  };
}

export function getSimulatorPileNodes(graph: CircuitGraph) {
  return [...graph.nodes]
    .filter((node) => node.objectType === "pile")
    .sort(sortPileNodes);
}

export function getSimulatorLaneBelts(lane: SimulatorDischargeLane) {
  const belts = new Map<string, SimulatorDischargeBelt>();

  lane.directBelts.forEach((belt) => {
    belts.set(belt.objectId, belt);
  });
  lane.downstreamBelts.forEach((belt) => {
    if (!belts.has(belt.objectId)) {
      belts.set(belt.objectId, belt);
    }
  });

  lane.mergeNodes.forEach((mergeNode) => {
    mergeNode.downstreamBelts.forEach((belt) => {
      if (!belts.has(belt.objectId)) {
        belts.set(belt.objectId, belt);
      }
    });
  });

  return [...belts.values()].sort(sortBelts);
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
    const directBelts = new Map<string, SimulatorDischargeBelt>();
    const downstreamBelts = new Map<string, SimulatorDischargeBelt>();
    const mergeNodes = new Map<string, SimulatorDischargeMergeNode>();
    const directNode = nodeById.get(output.relatedObjectId);

    if (!directNode) {
      return {
        output,
        directBelts: [],
        mergeNodes: [],
        downstreamBelts: [],
      };
    }

    const directPathNodeIds = [selectedNode.id, directNode.id];

    if (directNode.objectType === "belt") {
      directBelts.set(
        directNode.objectId,
        createBeltDescriptor(directNode, 0, directPathNodeIds),
      );
    } else if (
      directNode.objectType === "pile" &&
      directNode.objectRole === "virtual" &&
      directNode.objectId !== selectedObjectId
    ) {
      mergeNodes.set(directNode.objectId, {
        objectId: directNode.objectId,
        label: directNode.label,
        objectRole: directNode.objectRole,
        stageIndex: directNode.stageIndex,
        pathNodeIds: directPathNodeIds,
        downstreamBelts: [],
      });
    }

    const queue = (edgesBySource.get(directNode.id) ?? []).map((nextNodeId) => ({
      nodeId: nextNodeId,
      depth: 1,
      pathNodeIds: [...directPathNodeIds, nextNodeId],
      mergeNodeId:
        directNode.objectType === "pile" && directNode.objectRole === "virtual"
          ? directNode.objectId
          : undefined,
    }));

    while (queue.length > 0) {
      const current = queue.shift();

      if (!current) {
        continue;
      }

      const node = nodeById.get(current.nodeId);

      if (!node) {
        continue;
      }

      if (
        node.objectType === "pile" &&
        node.objectRole === "physical" &&
        node.objectId !== selectedObjectId
      ) {
        continue;
      }

      if (node.objectType === "belt") {
        const belt = createBeltDescriptor(node, current.depth, current.pathNodeIds);

        if (!downstreamBelts.has(node.objectId)) {
          downstreamBelts.set(node.objectId, belt);
        }

        if (current.mergeNodeId) {
          const mergeNode = mergeNodes.get(current.mergeNodeId);

          if (mergeNode && !mergeNode.downstreamBelts.some((entry) => entry.objectId === node.objectId)) {
            mergeNode.downstreamBelts.push(belt);
          }
        }
      }

      if (node.objectType === "pile" && node.objectRole === "virtual") {
        const existingMergeNode = mergeNodes.get(node.objectId);

        if (!existingMergeNode) {
          mergeNodes.set(node.objectId, {
            objectId: node.objectId,
            label: node.label,
            objectRole: node.objectRole,
            stageIndex: node.stageIndex,
            pathNodeIds: current.pathNodeIds,
            downstreamBelts: [],
          });
        }
      }

      const nextMergeNodeId =
        node.objectType === "pile" && node.objectRole === "virtual"
          ? node.objectId
          : current.mergeNodeId;

      (edgesBySource.get(node.id) ?? []).forEach((nextNodeId) => {
        if (current.pathNodeIds.includes(nextNodeId)) {
          return;
        }

        queue.push({
          nodeId: nextNodeId,
          depth: current.depth + 1,
          pathNodeIds: [...current.pathNodeIds, nextNodeId],
          mergeNodeId: nextMergeNodeId,
        });
      });
    }

    return {
      output,
      directBelts: [...directBelts.values()].sort(sortBelts),
      mergeNodes: [...mergeNodes.values()]
        .map((mergeNode) => ({
          ...mergeNode,
          downstreamBelts: [...mergeNode.downstreamBelts].sort(sortBelts),
        }))
        .sort((left, right) => {
          if (left.stageIndex !== right.stageIndex) {
            return left.stageIndex - right.stageIndex;
          }

          return left.label.localeCompare(right.label);
        }),
      downstreamBelts: [...downstreamBelts.values()].sort(sortBelts),
    };
  });
}
