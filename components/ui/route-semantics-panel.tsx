import { RelationshipPanel } from "@/components/ui/relationship-panel";
import type { SimulatorLaneSemantics } from "@/lib/transport-semantics";

interface RouteSemanticsPanelProps {
  semantics: SimulatorLaneSemantics;
  title?: string;
}

export function RouteSemanticsPanel({
  semantics,
  title = "Route semantics",
}: RouteSemanticsPanelProps) {
  return (
    <RelationshipPanel
      title={title}
      summary={semantics.description}
      metrics={[
        { label: "Route kind", value: semantics.routeKindLabel },
        { label: "Grouped outputs", value: String(semantics.groupedOutputLabels.length) },
        { label: "Shared merges", value: String(semantics.sharedMergeLabels.length) },
      ]}
      groups={[
        {
          label: "Grouped outputs",
          items: semantics.groupedOutputLabels,
        },
        {
          label: "Shared merge nodes",
          items: semantics.sharedMergeLabels,
        },
        {
          label: "Shared downstream conveyors",
          items: semantics.sharedDownstreamLabels,
        },
      ]}
    />
  );
}
