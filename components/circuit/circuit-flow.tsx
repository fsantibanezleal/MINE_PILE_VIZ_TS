"use client";

import { useState } from "react";
import type { CircuitGraph, ObjectSummary } from "@/types/app-data";
import { CircuitDiagramCanvas } from "@/components/circuit/circuit-diagram-canvas";
import { CircuitInspector } from "@/components/circuit/circuit-inspector";

interface CircuitFlowProps {
  graph: CircuitGraph;
  summaries: ObjectSummary[];
  selectedObjectId?: string;
  onSelect?: (objectId: string) => void;
}

export function CircuitFlow({
  graph,
  summaries,
  selectedObjectId,
  onSelect,
}: CircuitFlowProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | undefined>();
  const summaryMap = Object.fromEntries(
    summaries.map((summary) => [summary.objectId, summary]),
  );
  const selectedId = selectedObjectId ?? internalSelectedId;
  const selectedNode = graph.nodes.find((node) => node.id === selectedId);
  const selectedSummary = selectedId ? summaryMap[selectedId] : undefined;

  return (
    <div className="circuit-grid">
      <CircuitDiagramCanvas
        graph={graph}
        selectedObjectId={selectedId}
        onSelect={(nextObjectId) => {
          if (!selectedObjectId) {
            setInternalSelectedId(nextObjectId);
          }
          onSelect?.(nextObjectId);
        }}
      />
      <CircuitInspector graph={graph} node={selectedNode} summary={selectedSummary} />
    </div>
  );
}
