interface MetricGridProps {
  metrics: Array<{
    label: string;
    value: string;
  }>;
}

export function MetricGrid({ metrics }: MetricGridProps) {
  return (
    <div className="metric-grid">
      {metrics.map((metric) => (
        <div key={metric.label} className="metric-card">
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </div>
      ))}
    </div>
  );
}
