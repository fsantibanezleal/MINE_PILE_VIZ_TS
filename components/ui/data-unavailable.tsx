import type { ReactNode } from "react";
import { FileWarning } from "lucide-react";
import { DEFAULT_APP_DATA_ROOT } from "@/lib/app-config";

interface DataUnavailableProps {
  title?: string;
  description?: ReactNode;
  details?: string[];
  guidance?: ReactNode;
  cacheRoot?: string;
}

export function DataUnavailable({
  title = "App-ready data cache not found",
  description,
  details = [],
  guidance,
  cacheRoot = DEFAULT_APP_DATA_ROOT,
}: DataUnavailableProps) {
  return (
    <section className="panel panel--empty">
      <div className="panel__icon">
        <FileWarning size={24} />
      </div>
      <div className="panel__content">
        <h3>{title}</h3>
        <p>
          {description ?? (
            <>
              This application only reads the sanitized app contract under{" "}
              <code>{cacheRoot}</code>. The original raw simulation outputs are
              intentionally not consumed at runtime.
            </>
          )}
        </p>
        {details.length > 0 ? (
          <ul className="detail-list">
            {details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}
        <p>
          {guidance ?? (
            <>
              Generate a local cache that matches the documented contract in{" "}
              <code>docs/app-data-contract.md</code> and start the app again.
            </>
          )}
        </p>
      </div>
    </section>
  );
}
