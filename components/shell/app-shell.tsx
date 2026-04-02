import { Suspense, type ReactNode } from "react";
import { DatabaseZap, Radar } from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/app-config";
import { RouteNav } from "@/components/shell/route-nav";

interface AppShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function AppShell({
  eyebrow,
  title,
  description,
  children,
  actions,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <div className="app-header__eyebrow">{eyebrow}</div>
          <h1>{APP_NAME}</h1>
          <p>{title}</p>
        </div>
        <Suspense fallback={<nav className="top-nav" aria-label="Primary" />}>
          <RouteNav />
        </Suspense>
        <div className="app-header__meta">
          <span className="status-chip">
            <Radar size={14} />
            Local
          </span>
          <span className="status-chip status-chip--muted">
            <DatabaseZap size={14} />
            v{APP_VERSION}
          </span>
        </div>
      </header>

      <main className="page-shell">
        <section className="hero-panel">
          <div className="hero-panel__body">
            <div className="section-label">{eyebrow}</div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          {actions ? <div className="hero-panel__actions">{actions}</div> : null}
        </section>
        {children}
      </main>
    </div>
  );
}
