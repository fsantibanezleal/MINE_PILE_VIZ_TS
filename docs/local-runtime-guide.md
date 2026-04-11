# Local Runtime Guide

This application is local-first. Runtime reads only the app-ready cache. It does not rebuild that cache during normal startup, but the repository now includes one explicit maintenance command for regenerating it from local raw data when needed.

## Local Boundaries

- `data/` is local-only and ignored by Git.
- `.local/` is local-only and ignored by Git.
- The tracked repository reads only the app-ready cache contract.
- Raw source-trace conversion is now available through one tracked maintenance script and command.

## Expected Runtime Root

Default runtime root:

```text
.local/app-data/v1/
```

Optional override:

```powershell
$env:APP_DATA_ROOT = "D:\path\to\app-data\v1"
```

## First Local Boot

From the repository root:

```powershell
corepack enable
pnpm install
pnpm dev
```

If you need to inspect or reset the repo-managed local server:

```powershell
pnpm dev:status
pnpm dev:stop
pnpm dev:restart
```

If you need to validate the current app-ready cache before opening routes:

```powershell
pnpm cache:rebuild
pnpm cache:check
pnpm cache:check:deep
```

Optional rebuild overrides:

```powershell
pnpm cache:rebuild --root .local/app-data/v1-alt
pnpm cache:rebuild --raw-root D:\path\to\raw\data
```

If the chosen Python environment is missing exporter dependencies:

```powershell
python -m pip install -r scripts/generate_actual_cache.requirements.txt
```

If the raw model state needs the reference `mineral_tracking` module and the default local fallback path is not available, set:

```powershell
$env:REFERENCE_ROOT = "D:\path\to\dgm_tracking_ds\databricks"
```

The managed `pnpm dev` path now runs the shallow cache check before starting Next.js.  
If you intentionally need to bypass that preflight:

```powershell
$env:SKIP_APP_CACHE_CHECK = "1"
pnpm dev
```

Open:

- `http://127.0.0.1:3000/circuit`
- `http://127.0.0.1:3000/live`
- `http://127.0.0.1:3000/profiler`

Legacy compatibility alias:

- `http://127.0.0.1:3000/stockpiles` redirects to `/live?view=piles`

Useful local validation helpers:

```powershell
pnpm validate
pnpm validate:build
pnpm validate:full
pnpm validate:real-data
```

## First-Run Verification

Use this sequence to verify that the local cache is the one being served:

1. Open `http://127.0.0.1:3000/api/manifest`.
2. Confirm that `datasetLabel`, `latestTimestamp`, and `appVersion` are returned as JSON.
3. Open `/circuit` and verify the dataset header is populated.
4. Open `/live?view=piles` and confirm that the page loads first, then requests the selected dense pile dataset.
5. Open `/profiler` and confirm that the page loads first, then requests summary history and snapshots on demand.

## If The Cache Is Missing

Expected behavior is not a crash. The app should surface route-level unavailable states with the configured cache root so the operator can correct the local path.

## Common Local Problems

### Node Or pnpm Not Found

Use a supported Node version from `package.json` and enable `pnpm` through `corepack`.

### Wrong Cache Root

If `.local/app-data/v1/` is not the intended cache, set `APP_DATA_ROOT` explicitly before `pnpm dev`.

### Cache Version Drift

`pnpm cache:check` now warns when the app-ready cache advertises a different `appVersion` than the current repository version. That is not always a hard failure, but it is a strong signal that the local cache should be rebuilt before trusting new UI behavior.

### Rebuilding The Cache

Use `pnpm cache:rebuild` when the current `.local/app-data/v1/` cache is missing, stale, or version-drifted. The command runs the tracked Python exporter against the configured raw-data root.

The rebuild path can be redirected with:

- `--root` for the generated app-ready cache target
- `--raw-root` for a non-default raw dataset location
- `PYTHON_BIN` if the preferred Python launcher is not discoverable from `PATH`
- `python -m pip install -r scripts/generate_actual_cache.requirements.txt` if the selected Python environment is missing exporter dependencies
- `REFERENCE_ROOT` if the raw model state needs the external `mineral_tracking` module and the default fallback path is not present

### CI Baseline

The tracked repository now also expects GitHub Actions to run:

- `pnpm validate:build`
- `pnpm test:e2e`

There is also a manual self-hosted workflow for real local datasets:

- `.github/workflows/real-data-cache.yml`

That workflow expects:

- `MINE_PILE_VIZ_RAW_DATA_ROOT` for the raw-data tree available on the self-hosted runner
- optionally `MINE_PILE_VIZ_REFERENCE_ROOT` if the runner does not expose the default local fallback for `mineral_tracking`

### Repo-Managed Dev Server Already Running

`pnpm dev` now stays pinned to one explicit port instead of silently jumping to another one. If the repo already has a managed dev server running, use `pnpm dev:status` to inspect it, `pnpm dev:stop` to stop it, or `pnpm dev:restart` to replace it cleanly.

If the port is occupied by a different local process, the managed workflow now reports the owning PID and, when the operating system can resolve it, the corresponding process name as well.

### Raw Files Present But App Cache Missing

The UI does not read the original local `data/` tree. The app-ready cache must exist independently and must match the contract in [App Data Contract](./app-data-contract.md).

### Contract Mismatch

If a file exists but does not meet the documented schema, the route should respond with a typed runtime error and the corresponding page should show an unavailable or warning state instead of failing silently.
