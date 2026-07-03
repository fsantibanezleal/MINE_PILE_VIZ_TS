# Scripts Docs

This folder documents the tracked maintenance scripts under `scripts/`, with emphasis on the raw-data-to-app-cache conversion path that feeds the application runtime.

Current documents:

- [local-bootstrap.md](./local-bootstrap.md)
  Documents the numbered local PowerShell bootstrap flow under `scripts/local/`, including the optional machine-level prerequisite step, the clean-clone install step, cache rebuild, and managed local startup.
- [generate-actual-cache.md](./generate-actual-cache.md)
  Documents how `scripts/generate_actual_cache.py` converts `data/` into the app-ready cache used by the web application for circuit, live MTO state, profiler history, and simulator steps.
