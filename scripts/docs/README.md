# Scripts Docs

This folder documents the tracked maintenance scripts under `scripts/`, with emphasis on the raw-data-to-app-cache conversion path that feeds the application runtime.

Current documents:

- [generate-actual-cache.md](./generate-actual-cache.md)
  Documents how `scripts/generate_actual_cache.py` converts `data/` into the app-ready cache used by the web application for circuit, live MTO state, profiler history, and simulator steps.
