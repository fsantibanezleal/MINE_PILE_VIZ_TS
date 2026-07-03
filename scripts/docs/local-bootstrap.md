# Local Bootstrap Flow

## Purpose

The `scripts/local/` folder now exposes one explicit numbered flow for bringing up this repository on a new Windows machine after cloning it.

The order is intentional:

1. `01-install-machine-prerequisites.ps1`
2. `02-install-local-requirements.ps1`
3. `03-rebuild-local-app-data.ps1`
4. `04-start-local-app.ps1`

`01` is optional and exists only for machine-level installs that should be done from an elevated PowerShell session.  
`02`, `03`, and `04` are the normal repo-local workflow.

## What Each Script Does

### `01-install-machine-prerequisites.ps1`

Use this only when the machine needs administrator-installed toolchain prerequisites.

Current responsibility:

- installs `OpenJS.NodeJS.LTS` at machine scope through `winget`
- installs `Python.Python.3.12` at machine scope through `winget`
- leaves the repo itself untouched

Expected usage:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/local/01-install-machine-prerequisites.ps1
```

Useful switches:

- `-SkipNode`
- `-SkipPython`
- `-DryRun`

This script must be run from an elevated PowerShell session unless `-DryRun` is being used.

### `02-install-local-requirements.ps1`

This is the real clean-clone bootstrap entry point inside the repo.

Current responsibility:

- verifies that Node.js satisfies the version range from `package.json`
- attempts a user-scope `winget` install of Node.js LTS if Node is missing
- resolves `pnpm` through `corepack` when available
- resolves a Python 3 launcher
- attempts a user-scope `winget` install of Python 3.12 if Python is missing
- creates a repo-managed exporter environment under `.local/python-tools/cache-rebuild`
- installs `scripts/generate_actual_cache.requirements.txt` into that repo-managed Python environment
- installs Node.js dependencies from `pnpm-lock.yaml`
- optionally installs the Chromium browser used by the tracked Playwright suite

Expected usage:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/local/02-install-local-requirements.ps1
```

Useful switches:

- `-SkipNodeInstall`
- `-SkipPythonInstall`
- `-SkipToolchainBootstrap`
- `-PythonBin`
- `-IncludePlaywrightBrowsers`
- `-DryRun`

Notes:

- If user-scope toolchain installation is blocked by machine policy or does not resolve the installed executable cleanly, rerun with `01-install-machine-prerequisites.ps1` from an elevated session first.
- The repo-managed exporter environment is reused later by `03-rebuild-local-app-data.ps1` through `PYTHON_BIN`.

### `03-rebuild-local-app-data.ps1`

This script rebuilds the app-ready cache from the private raw dataset.

Current responsibility:

- validates that the raw dataset root exists and has the expected baseline shape
- resolves `pnpm`
- reuses the repo-managed Python environment when available
- optionally refreshes exporter dependencies in that environment
- runs `pnpm cache:rebuild`
- optionally validates the generated cache with `pnpm cache:check` or `pnpm cache:check:deep`

Expected usage:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/local/03-rebuild-local-app-data.ps1
```

Useful switches:

- `-RawDataRoot`
- `-AppDataRoot`
- `-ReferenceRoot`
- `-PythonBin`
- `-InstallPythonDependencies`
- `-SkipValidation`
- `-DeepValidation`
- `-DryRun`

This script expects the private raw dataset to exist. A clean clone alone is not enough for this step.

### `04-start-local-app.ps1`

This script is the numbered local startup wrapper.

Current responsibility:

- resolves the repository root
- applies an optional `APP_DATA_ROOT`
- optionally runs `pnpm install`
- exposes the main local routes
- starts the repo-managed `pnpm dev` workflow

Expected usage:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/local/04-start-local-app.ps1
```

Useful switches:

- `-AppDataRoot`
- `-Install`
- `-SkipCacheCheck`
- `-DryRun`

## Typical Sequences

### Clean Clone On A New Machine

```powershell
powershell -ExecutionPolicy Bypass -File scripts/local/02-install-local-requirements.ps1
powershell -ExecutionPolicy Bypass -File scripts/local/03-rebuild-local-app-data.ps1
powershell -ExecutionPolicy Bypass -File scripts/local/04-start-local-app.ps1
```

### Machine Where User-Scope Install Is Not Enough

```powershell
powershell -ExecutionPolicy Bypass -File scripts/local/01-install-machine-prerequisites.ps1
powershell -ExecutionPolicy Bypass -File scripts/local/02-install-local-requirements.ps1
powershell -ExecutionPolicy Bypass -File scripts/local/03-rebuild-local-app-data.ps1
powershell -ExecutionPolicy Bypass -File scripts/local/04-start-local-app.ps1
```

### Install The Browser Used By The Tracked E2E Suite

```powershell
powershell -ExecutionPolicy Bypass -File scripts/local/02-install-local-requirements.ps1 -IncludePlaywrightBrowsers
```

## Tooling Assumptions

The current scripts are written for Windows PowerShell usage and use `winget` for automatic Node.js and Python installation when those executables are missing.

That means:

- `01` and the automatic bootstrap path inside `02` expect `winget` to be available
- if `winget` itself is unavailable on the machine, the scripts fail early and say so explicitly
- repo-local Python packages are isolated under `.local/python-tools/cache-rebuild` instead of being sprayed into whichever global Python happens to be first in `PATH`

## Internal Helper

`scripts/local/common.ps1` is a shared implementation helper used by the numbered scripts. It is not part of the execution order.
