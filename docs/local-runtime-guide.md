# Local Runtime Guide

This application is local-first. It does not read from `data/`, and it does not generate the app-ready cache on its own. Runtime starts only after the local app-ready cache already exists.

## Local Boundaries

- `data/` is local-only and ignored by Git.
- `.local/` is local-only and ignored by Git.
- The tracked repository reads only the app-ready cache contract.
- Raw source-trace conversion must stay outside this repository.

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

Open:

- `http://127.0.0.1:3000/circuit`
- `http://127.0.0.1:3000/live`
- `http://127.0.0.1:3000/profiler`

Legacy compatibility alias:

- `http://127.0.0.1:3000/stockpiles` redirects to `/live?view=piles`

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

### Repo-Managed Dev Server Already Running

`pnpm dev` now stays pinned to one explicit port instead of silently jumping to another one. If the repo already has a managed dev server running, use `pnpm dev:status` to inspect it, `pnpm dev:stop` to stop it, or `pnpm dev:restart` to replace it cleanly.

### Raw Files Present But App Cache Missing

The UI does not read the original local `data/` tree. The app-ready cache must exist independently and must match the contract in [App Data Contract](./app-data-contract.md).

### Contract Mismatch

If a file exists but does not meet the documented schema, the route should respond with a typed runtime error and the corresponding page should show an unavailable or warning state instead of failing silently.
