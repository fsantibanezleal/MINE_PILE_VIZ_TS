import { MetricGrid } from "@/components/ui/metric-grid";

interface RelationshipPanelProps {
  title: string;
  summary: string;
  metrics: Array<{
    label: string;
    value: string;
  }>;
  groups?: Array<{
    label: string;
    items: string[];
  }>;
}

export function RelationshipPanel({
  title,
  summary,
  metrics,
  groups = [],
}: RelationshipPanelProps) {
  const visibleGroups = groups.filter((group) => group.items.length > 0);

  return (
    <div className="relationship-panel">
      <div className="section-label">{title}</div>
      <p className="muted-text">{summary}</p>
      <MetricGrid metrics={metrics} />
      {visibleGroups.length > 0 ? (
        <div className="relationship-panel__groups">
          {visibleGroups.map((group) => (
            <div key={group.label} className="relationship-panel__group">
              <div className="relationship-panel__group-title">{group.label}</div>
              <div className="relationship-panel__chips">
                {group.items.map((item) => (
                  <span key={`${group.label}:${item}`} className="relationship-chip">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
