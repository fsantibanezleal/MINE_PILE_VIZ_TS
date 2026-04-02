import { FileWarning } from "lucide-react";
import { DEFAULT_APP_DATA_ROOT } from "@/lib/app-config";

export function DataUnavailable() {
  return (
    <section className="panel panel--empty">
      <div className="panel__icon">
        <FileWarning size={24} />
      </div>
      <div className="panel__content">
        <h3>App-ready data cache not found</h3>
        <p>
          This application only reads the sanitized app contract under{" "}
          <code>{DEFAULT_APP_DATA_ROOT}</code>. The original raw simulation
          outputs are intentionally not consumed at runtime.
        </p>
        <p>
          Generate a local cache that matches the documented contract in{" "}
          <code>docs/app-data-contract.md</code> and start the app again.
        </p>
      </div>
    </section>
  );
}
