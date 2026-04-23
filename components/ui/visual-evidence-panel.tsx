interface VisualEvidenceNote {
  label: string;
  text: string;
}

interface VisualEvidencePanelProps {
  title?: string;
  summary?: string;
  notes: VisualEvidenceNote[];
}

/**
 * Shared workspace-level reading guide used to keep the visible evidence
 * explicit without repeating page-level route intent copy.
 */
export function VisualEvidencePanel({
  title = "Reading notes",
  summary,
  notes,
}: VisualEvidencePanelProps) {
  return (
    <div className="inspector-stack evidence-panel">
      <div className="section-label">{title}</div>
      {summary ? <p className="muted-text">{summary}</p> : null}
      <div className="evidence-panel__grid">
        {notes.map((note) => (
          <article key={note.label} className="evidence-panel__card">
            <span className="evidence-panel__eyebrow">{note.label}</span>
            <p>{note.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
