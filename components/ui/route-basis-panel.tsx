import { MetricGrid } from "@/components/ui/metric-grid";

interface RouteBasisPanelProps {
  title?: string;
  source: string;
  resolution: string;
  timeBasis: string;
  note?: string;
}

export function RouteBasisPanel({
  title = "Route basis",
  source,
  resolution,
  timeBasis,
  note,
}: RouteBasisPanelProps) {
  return (
    <div className="inspector-stack">
      <div className="section-label">{title}</div>
      <MetricGrid
        metrics={[
          { label: "Source", value: source },
          { label: "Resolution", value: resolution },
          { label: "Time basis", value: timeBasis },
        ]}
      />
      {note ? <p className="muted-text">{note}</p> : null}
    </div>
  );
}
