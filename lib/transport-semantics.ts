import type { SimulatorDischargeLane } from "@/lib/simulator-topology";
import type { CircuitGraph, CircuitNode } from "@/types/app-data";

export type TransportRoleId =
  | "accumulation"
  | "merge-accumulation"
  | "derived-accumulation"
  | "source-transport"
  | "derived-transport"
  | "measured-transport";

export interface TransportNodeSemantics {
  roleId: TransportRoleId;
  roleLabel: string;
  description: string;
  upstreamNodes: CircuitNode[];
  downstreamNodes: CircuitNode[];
  groupedContributorNodes: CircuitNode[];
  companionTransportNodes: CircuitNode[];
  sharedDownstreamBelts: CircuitNode[];
}

export interface SimulatorLaneSemantics {
  routeKindLabel: string;
  description: string;
  groupedOutputLabels: string[];
  sharedMergeLabels: string[];
  sharedDownstreamLabels: string[];
}

export interface SimulatorRouteGrouping {
  laneSemanticsByOutputId: Record<string, SimulatorLaneSemantics>;
  mergeContributorLabelsByNodeId: Record<string, string[]>;
  downstreamContributorLabelsByBeltId: Record<string, string[]>;
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

function uniqueLabels(labels: string[]) {
  return [...new Set(labels.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function buildGraphAdjacency(graph: CircuitGraph) {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const nodeByObjectId = new Map(graph.nodes.map((node) => [node.objectId, node]));
  const incomingById = new Map<string, CircuitNode[]>();
  const outgoingById = new Map<string, CircuitNode[]>();

  graph.nodes.forEach((node) => {
    incomingById.set(node.id, []);
    outgoingById.set(node.id, []);
  });

  graph.edges.forEach((edge) => {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);

    if (!source || !target) {
      return;
    }

    outgoingById.get(source.id)?.push(target);
    incomingById.get(target.id)?.push(source);
  });

  return {
    nodeById,
    nodeByObjectId,
    incomingById,
    outgoingById,
  };
}

function collectReachablePhysicalBelts(
  startNodeId: string,
  outgoingById: Map<string, CircuitNode[]>,
) {
  const queue = [...(outgoingById.get(startNodeId) ?? [])];
  const visited = new Set<string>([startNodeId]);
  const belts: CircuitNode[] = [];

  while (queue.length > 0) {
    const node = queue.shift();

    if (!node || visited.has(node.id)) {
      continue;
    }

    visited.add(node.id);

    if (node.objectType === "belt" && node.objectRole === "physical") {
      belts.push(node);
    }

    if (node.objectType === "pile" && node.objectRole === "physical") {
      continue;
    }

    queue.push(...(outgoingById.get(node.id) ?? []));
  }

  return uniqueNodes(belts);
}

function describeTransportRole(
  node: CircuitNode,
  upstreamNodes: CircuitNode[],
  groupedContributorNodes: CircuitNode[],
) {
  if (node.objectType === "pile" && node.objectRole === "physical") {
    return {
      roleId: "accumulation" as const,
      roleLabel: "Accumulation",
      description:
        "Physical accumulation object that stores material and releases it into downstream transport.",
    };
  }

  if (node.objectType === "pile" && node.objectRole === "virtual") {
    if (groupedContributorNodes.length > 1) {
      return {
        roleId: "merge-accumulation" as const,
        roleLabel: "Merge accumulation",
        description:
          "Virtual pile that groups multiple upstream transport contributors before the downstream route continues.",
      };
    }

    return {
      roleId: "derived-accumulation" as const,
      roleLabel: "Derived accumulation",
      description:
        "Virtual pile used as an intermediate accumulation step inside the modeled transport sequence.",
    };
  }

  if (node.objectType === "belt" && node.objectRole === "physical") {
    return {
      roleId: "measured-transport" as const,
      roleLabel: "Measured transport",
      description:
        "Physical belt that represents downstream transport in the modeled circuit.",
    };
  }

  if (upstreamNodes.some((upstreamNode) => upstreamNode.objectType === "pile")) {
    return {
      roleId: "source-transport" as const,
      roleLabel: "Source transport",
      description:
        "Virtual belt that carries one configured discharge or transfer stream directly out of an accumulation object.",
    };
  }

  return {
    roleId: "derived-transport" as const,
    roleLabel: "Derived transport",
    description:
      "Virtual belt that continues a derived transport route between modeled objects.",
  };
}

export function deriveTransportNodeSemantics(
  graph: CircuitGraph,
  nodeIdOrObjectId: string,
): TransportNodeSemantics | null {
  const { nodeById, nodeByObjectId, incomingById, outgoingById } = buildGraphAdjacency(graph);
  const node = nodeById.get(nodeIdOrObjectId) ?? nodeByObjectId.get(nodeIdOrObjectId);

  if (!node) {
    return null;
  }

  const upstreamNodes = uniqueNodes(incomingById.get(node.id) ?? []);
  const downstreamNodes = uniqueNodes(outgoingById.get(node.id) ?? []);
  const groupedContributorNodes =
    node.objectType === "pile" && node.objectRole === "virtual"
      ? uniqueNodes(upstreamNodes)
      : [];
  const downstreamMergeNodes = downstreamNodes.filter(
    (downstreamNode) =>
      downstreamNode.objectType === "pile" && downstreamNode.objectRole === "virtual",
  );
  const companionTransportNodes = uniqueNodes(
    downstreamMergeNodes.flatMap((mergeNode) =>
      (incomingById.get(mergeNode.id) ?? []).filter((candidate) => candidate.id !== node.id),
    ),
  );
  const sharedDownstreamBelts = uniqueNodes(
    downstreamMergeNodes.flatMap((mergeNode) =>
      collectReachablePhysicalBelts(mergeNode.id, outgoingById),
    ),
  );
  const role = describeTransportRole(node, upstreamNodes, groupedContributorNodes);

  return {
    ...role,
    upstreamNodes,
    downstreamNodes,
    groupedContributorNodes,
    companionTransportNodes,
    sharedDownstreamBelts,
  };
}

export function buildSimulatorRouteGrouping(
  lanes: SimulatorDischargeLane[],
): SimulatorRouteGrouping {
  const mergeContributorLabelsByNodeId = new Map<string, string[]>();
  const downstreamContributorLabelsByBeltId = new Map<string, string[]>();

  lanes.forEach((lane) => {
    lane.mergeNodes.forEach((mergeNode) => {
      const current = mergeContributorLabelsByNodeId.get(mergeNode.objectId) ?? [];
      current.push(lane.output.label);
      mergeContributorLabelsByNodeId.set(mergeNode.objectId, current);
    });

    lane.downstreamBelts.forEach((belt) => {
      const current = downstreamContributorLabelsByBeltId.get(belt.objectId) ?? [];
      current.push(lane.output.label);
      downstreamContributorLabelsByBeltId.set(belt.objectId, current);
    });
  });

  const laneSemanticsByOutputId = Object.fromEntries(
    lanes.map((lane) => {
      const groupedOutputLabels = uniqueLabels(
        [
          lane.output.label,
          ...lane.mergeNodes.flatMap((mergeNode) =>
            mergeContributorLabelsByNodeId.get(mergeNode.objectId) ?? [],
          ),
          ...lane.downstreamBelts.flatMap((belt) =>
            downstreamContributorLabelsByBeltId.get(belt.objectId) ?? [],
          ),
        ],
      );
      const sharedMergeLabels = uniqueLabels(
        lane.mergeNodes
          .filter(
            (mergeNode) =>
              (mergeContributorLabelsByNodeId.get(mergeNode.objectId) ?? []).length > 1,
          )
          .map((mergeNode) => mergeNode.label),
      );
      const sharedDownstreamLabels = uniqueLabels(
        lane.downstreamBelts
          .filter(
            (belt) =>
              (downstreamContributorLabelsByBeltId.get(belt.objectId) ?? []).length > 1,
          )
          .map((belt) => belt.label),
      );
      const companionCount = Math.max(0, groupedOutputLabels.length - 1);
      const routeKindLabel =
        companionCount > 0 ? "Grouped discharge route" : "Independent discharge route";
      const description =
        companionCount > 0
          ? sharedMergeLabels.length > 0
            ? `This output converges with ${companionCount} other configured output${companionCount === 1 ? "" : "s"} through the shared virtual merge stage.`
            : `This output stays distinct at first, then converges with ${companionCount} other configured output${companionCount === 1 ? "" : "s"} on shared downstream transport.`
          : "This output stays independent from the other configured discharge routes in the current circuit graph.";

      return [
        lane.output.id,
        {
          routeKindLabel,
          description,
          groupedOutputLabels,
          sharedMergeLabels,
          sharedDownstreamLabels,
        } satisfies SimulatorLaneSemantics,
      ];
    }),
  );

  return {
    laneSemanticsByOutputId,
    mergeContributorLabelsByNodeId: Object.fromEntries(
      [...mergeContributorLabelsByNodeId.entries()].map(([key, value]) => [
        key,
        uniqueLabels(value),
      ]),
    ),
    downstreamContributorLabelsByBeltId: Object.fromEntries(
      [...downstreamContributorLabelsByBeltId.entries()].map(([key, value]) => [
        key,
        uniqueLabels(value),
      ]),
    ),
  };
}
