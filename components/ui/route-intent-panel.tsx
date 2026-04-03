interface RouteIntentPanelProps {
  primaryQuestion: string;
  uniqueEvidence: string;
  useWhen: string;
  switchWhen: string;
}

/**
 * Shared route-intent panel used to keep each routed workspace explicit about
 * the operator question it answers and the evidence it contributes.
 */
export function RouteIntentPanel({
  primaryQuestion,
  uniqueEvidence,
  useWhen,
  switchWhen,
}: RouteIntentPanelProps) {
  return (
    <section className="panel route-intent-panel">
      <article className="route-intent-card">
        <span className="route-intent-card__eyebrow">Primary question</span>
        <p>{primaryQuestion}</p>
      </article>
      <article className="route-intent-card">
        <span className="route-intent-card__eyebrow">Unique evidence</span>
        <p>{uniqueEvidence}</p>
      </article>
      <article className="route-intent-card">
        <span className="route-intent-card__eyebrow">Use this route when</span>
        <p>{useWhen}</p>
      </article>
      <article className="route-intent-card">
        <span className="route-intent-card__eyebrow">Switch routes when</span>
        <p>{switchWhen}</p>
      </article>
    </section>
  );
}
