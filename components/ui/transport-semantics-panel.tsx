import { RelationshipPanel } from "@/components/ui/relationship-panel";
import type { TransportNodeSemantics } from "@/lib/transport-semantics";

interface TransportSemanticsPanelProps {
  semantics: TransportNodeSemantics;
  title?: string;
}

export function TransportSemanticsPanel({
  semantics,
  title = "Flow semantics",
}: TransportSemanticsPanelProps) {
  return (
    <RelationshipPanel
      title={title}
      summary={semantics.description}
      metrics={[
        { label: "Role", value: semantics.roleLabel },
        { label: "Receives from", value: String(semantics.upstreamNodes.length) },
        { label: "Feeds into", value: String(semantics.downstreamNodes.length) },
      ]}
      groups={[
        {
          label: "Upstream objects",
          items: semantics.upstreamNodes.map((node) => node.label),
        },
        {
          label: "Downstream objects",
          items: semantics.downstreamNodes.map((node) => node.label),
        },
        {
          label: "Grouped contributors",
          items: semantics.groupedContributorNodes.map((node) => node.label),
        },
        {
          label: "Companion transport",
          items: semantics.companionTransportNodes.map((node) => node.label),
        },
        {
          label: "Shared downstream conveyors",
          items: semantics.sharedDownstreamBelts.map((node) => node.label),
        },
      ]}
    />
  );
}
