# Mine Pile Visualizer

Local-first web application for exploring circuit topology, live material state, stockpile structure, and profiler history produced by a mineral tracking simulation engine.

## Overview

Mine Pile Visualizer is not intended to be only a developer sandbox. It is a working visualization surface organized around four complementary operator views:

- `/circuit`
- `/simulator`
- `/live`
- `/profiler`

The current baseline already provides a routed application shell, an illustrative circuit overview with `2D`, `3D`, and diagram modes, dense live-state inspection for both belts and piles, dimensional pile views for `1D`, `2D`, and `3D` objects inside the live route, and history playback over profiler snapshots. The repository is intentionally decoupled from raw source-trace artifacts. At runtime it consumes only an app-ready local cache rooted at `.local/app-data/v1/` or an explicit `APP_DATA_ROOT` override.

## Problem Framing

Operational mineral tracking outputs are information-rich but not naturally easy to inspect. Circuit relationships, instantaneous transport state, and internal stockpile composition are usually split across different files and resolutions. Tabular inspection alone is too slow for understanding flow structure, spatial accumulation, or temporal change.

Mine Pile Visualizer responds by turning those app-ready outputs into a set of linked spatial and temporal views:

- a circuit view for sequence and object relationships
- a live view for current dense belts and current dense piles
- a profiler view for historical snapshots and time navigation

## Motivation

- Circuit diagrams alone do not show what material is present at a given instant.
- Live transport state alone does not explain how current piles are internally organized.
- Stockpile internals alone do not explain how the modeled area is connected end to end.
- Historical snapshots are useful only if the operator can move between object-level and circuit-level context without reinterpreting the data format each time.
- A local-first application keeps the runtime simple for engineering review, controlled testing, and internal dataset iteration.

## Process And Operator Flow

The application is organized as a progressive reading flow rather than a single page.

### 1. Circuit Understanding

The operator starts in `/circuit` to understand the modeled area as a staged sequence of belts and accumulation objects. This is the structural map of the system and the entry point for object selection.

### 2. Instantaneous Dense State

The operator then moves to `/live` to inspect the current dense runtime state from `06_models`. The route is split into two subviews: one for belts and virtual belts, and one for piles and virtual piles, so current transport and current accumulation can be inspected without redrawing the circuit.

### 3. Internal Pile Inspection

The next step remains inside `/live`, but in the `Piles / VPiles` subview. A selected accumulation object is rendered according to its dimensionality. `1D` objects are shown as columns, `2D` objects as matrices, and `3D` objects as voxel-based scenes with voxel, shell, slice, and complementary top-surface reading modes.

### 4. Historical Review

The operator uses `/profiler` to move through time. This route supports both a broader circuit-level reading of profiled objects and a focused object view for a selected belt or pile snapshot.

## Architecture

Mine Pile Visualizer uses a single Next.js application with App Router and a local-first runtime boundary.

- `Next.js + React + TypeScript` provide the routed frontend and server-side data access surface.
- Server-only loaders under `lib/server/` read the app-ready cache and validate the JSON contract before the UI consumes it.
- Dense object state is stored as Arrow IPC tables for efficient transport of block and voxel records.
- `React Flow + Dagre` drive the circuit topology surface.
- `React Three Fiber` is used for `3D` pile rendering.
- Tests use `Vitest` for unit and component checks and `Playwright` for route-level browser validation.

The tracked repository consumes the app-ready contract at runtime, and it now also provides one explicit maintenance path for rebuilding that cache locally from the configured raw-data tree when the operator intentionally requests it.

## KPI Targets

- Circuit clarity: the sequence of modeled objects should be understandable without opening raw files.
- Cross-view coherence: object identity, labels, and selected properties should stay consistent across routes.
- Dimensional fidelity: `1D`, `2D`, and `3D` piles should each render in a form that matches their modeled structure.
- Local operability: the application should run entirely from a local cache without external services.
- Large-volume safety: high-density `3D` piles should prefer visible-content rendering modes before full voxel expansion.
- Contract discipline: runtime code should depend on a documented app-ready cache rather than hidden serializers.

## Current Measured State

| Indicator | Current State |
|---|---|
| Routed workspaces | `4` |
| User-facing focus areas | circuit, simulator, live state, profiler history |
| Dimensional pile support | `1D`, `2D`, `3D` |
| `3D` pile render modes | `surface`, `shell`, `full`, `slice`, `top surface` |
| Runtime cache contract | JSON metadata + Arrow IPC tables |
| Default local cache root | `.local/app-data/v1/` |
| Alternate cache path | `APP_DATA_ROOT` |
| Local development port | `3000` |
| Theme modes | dark, light |
| Release-synced version | `1.00.017` |
| Validation surface | `pnpm lint`, `pnpm test`, `pnpm test:e2e`, `pnpm build` |

## Release Status

| Status | Version |
|---|---|
| Closed baseline | `1.00.000` |
| Active tracked version | `1.00.017` |

## Diagnostics Surface

The application now also exposes one auxiliary diagnostics route at `/diagnostics`. It is intentionally outside the operator workflow and exists to inspect runtime identity, cache root, dataset label, route capabilities, and the latest-only loader-based contract health from inside the app itself.

## Current Frontend Views

### Circuit Workspace

The circuit workspace now starts with an illustrative reading of the modeled area. It offers an operator-facing `2D` view, a matching `3D` overview, and a diagram mode for structural debugging. Physical belts are rendered as conveyor-like elements, stockpiles are rendered as pile shapes, and virtual transfer objects remain visible as conceptual markers rather than physical equipment drawings. Pile illustrations also reflect their configured feed and discharge anchors, including multiple configured feed or reclaim points on the same pile instead of collapsing them into a single generic entry or exit point. The three circuit modes now share one fixed-height stage-board layout: stages are ordered left to right with contiguous frames, disconnected objects inside the same stage are treated as separate vertical groups, and same-stage receivers move one column to the right when the flow inside the stage has explicit dependency. The latest layout pass also pulls disconnected downstream groups toward the feeder positions that drive them, so grouped reclaim outputs read closer to the vertical center of their upstream belts instead of floating at one generic height. The `Diagram` view now inherits that same vertical ordering while using more compact cards, which makes `Diagram`, `2D`, and `3D` read as the same process board instead of three unrelated spatial guesses. The `3D` view now starts from an oblique approximately 45-degree camera so stage depth and object height are legible immediately instead of reading first as a strict top-down board. The route now also states its operator question and usage boundary explicitly, reinforcing that this page is for structural reading rather than material-content inspection. The selected object now highlights its connected circuit sequence so the operator can read upstream and downstream context without switching views, and the inspection panel exposes the configured feed and discharge anchor inventories with related object labels. It also derives one explicit flow role per object, which helps the operator distinguish virtual discharge contributors, merge accumulation nodes, and measured downstream transport instead of reading them as one generic node type.

### Live Workspace

The live workspace now reads as the dense current-state route from `06_models`, not as another circuit view. It starts with two subviews: `Belts / VBelts` and `Piles / VPiles`. The belt subview stays explicitly on one current belt at a time and exposes the dense ordered belt strip plus a literal mass-weighted histogram for the selected quality. The pile subview now absorbs the former dedicated stockpile page: it renders current dense piles directly inside `/live`, keeping accumulation reading beside transport reading without duplicating another route. When a selected pile exposes multiple direct discharge outputs, the same view now keeps one horizontal feeder card per output directly under the pile, so the operator can compare the pile inventory against all current feeder streams at the same time instead of opening each feeder separately. The `3D` pile view now also exposes a complementary `Top Surface` mode, which derives one height column per occupied `(x, y)` location and colors it either from the top visible cell or from the mass-weighted quality of the full column. Every `3D` pile view also exposes a vertical-compression factor, so tall voxel stacks can be flattened visually without changing the horizontal footprint. That factor is now stored per workspace, and the same workspace-level persistence now also restores the last-used `3D` orbit point of view on the next browser execution. Both subviews can switch into represented-material time coloring, so the current dense state can also be read by oldest age, newest age, or represented span without leaving the route. The live route now also exposes route-specific `Export HTML report` actions for the active dense belt or live pile selection.

### Simulator Workspace

The simulator workspace is now pile-centered and scenario-step based. It starts from the latest real profiler state of the selected pile, then advances only through the generated future steps emitted into the simulator cache from the raw `sims` source tree. The selected pile stays in the center, and every configured feeder/output remains visible at the same time underneath it as its own discharge column with strip, histogram, and summary metrics. The UI no longer edits discharge rates; those rates are part of the generated scenario metadata and are shown as read-only context in `tons / step` and `t/h`. `Play` and step navigation still exist as simulator controls, but the route is no longer framed as a downstream topology explorer. Instead, it reads as one pile plus simultaneous feeder discharge evidence across future simulated steps. The simulator now also exposes an `Export HTML report` action that packages the active pile, step, quality, and simultaneous feeder evidence into one standalone artifact that can be opened or printed outside the app. When `play` advances, the current `3D` pile view stays mounted and the next step loads without collapsing the scene, and the `3D` controls remain in the left panel for consistency with the other pile-focused routes.

### Profiler Workspace

The profiler workspace is now object-and-time first. It does not redraw the circuit. Instead, the operator selects one profiled object, moves through its stored profiler snapshots, and reads two pieces of evidence together: the summarized object representation at the selected timestep, and the time series of the selected quality across the available history. This route stays explicitly on `08_reporting` historical summaries, so it is suitable for trend reading, snapshot comparison, and playback over time rather than for dense current-state inspection. The selected snapshot still exposes delta against the previous stored step, represented-material time summaries, mass distributions, mapped categorical quality views, hovered summary-cell inspection, cross-route jumps, and the same vertical-compression control used by live and simulator for `3D` pile views. That compression value is restored independently for the profiler workspace, and the same workspace-level persistence now restores the last-used `3D` point of view as well. All of that now sits under one historical object view rather than being split into separate circuit and detail modes, and `play` keeps the active `3D` view stable while the next snapshot loads in the background. The route now also exports one route-specific HTML report that packages the selected historical snapshot, tracked-quality series, snapshot delta, and represented material-time window into one artifact.

## Scope And Current Status

### Current Workspaces

- `Circuit`: illustrative `2D` and `3D` overview, diagram fallback, and object inspection.
- `Simulator`: timestep-oriented circuit scenario playback backed by profiled summary history.
- `Live`: dense current state from `06_models`, split into belt/vbelt and pile/vpile subviews.
- `Profiler`: selected object, snapshot navigation, playback controls, quality series, and selected-snapshot evidence.

### Repository Boundaries

- `data/` is local-only and ignored by Git.
- `.local/` is local-only and ignored by Git.
- The tracked repository now keeps one repo-managed raw-data-to-cache rebuild command and script.
- Runtime code depends only on the documented app-ready contract.
- Local cache generation is available only through an explicit maintenance command and is not part of normal runtime startup.
- The UI never reads the original `data/` tree directly.
- The routed shell now supports an operator-selectable dark or light theme, stored locally per browser.
- `/stockpiles` is kept only as a compatibility redirect into `/live?view=piles`.

### Current Boundaries

- The tracked `1.00.005` baseline is still local-first; deployment packaging, desktop wrapping, and container workflows are not yet part of the shipped baseline.
- The application expects the app-ready cache to exist before runtime; it does not generate that cache itself.
- Very large `3D` piles already support safer rendering modes, but this is not yet a specialized high-end large-scene rendering pipeline.
- The current documentation baseline is still growing around the app-ready contract and runtime behavior.

## Technical Quick Start

### 1. Prepare the Node environment

Use a Node.js version within the supported range declared in `package.json`, then enable or install `pnpm`.

```powershell
corepack enable
```

### 2. Install dependencies

```powershell
pnpm install
```

### 3. Prepare the local app-ready cache

Place the local cache at:

```text
.local/app-data/v1/
```

Or point the runtime to an alternate cache root:

```powershell
$env:APP_DATA_ROOT = "D:\path\to\app-data\v1"
```

The required folder layout, JSON files, Arrow schemas, and semantics are documented in [App Data Contract](docs/app-data-contract.md).
Operator-facing startup checks and local runtime expectations are documented in [Local Runtime Guide](docs/local-runtime-guide.md).

If the cache needs to be regenerated from local raw data, use the repo-managed rebuild path:

```powershell
pnpm cache:rebuild
```

Optional overrides:

```powershell
pnpm cache:rebuild --root .local/app-data/v1-alt
pnpm cache:rebuild --raw-root D:\path\to\raw\data
```

If the selected Python environment does not yet have the exporter dependencies, install them with:

```powershell
python -m pip install -r scripts/generate_actual_cache.requirements.txt
```

If the cached raw model state depends on the reference `mineral_tracking` module and the default local fallback path is not present, set:

```powershell
$env:REFERENCE_ROOT = "D:\path\to\dgm_tracking_ds\databricks"
```

### 4. Run the application

```powershell
pnpm dev
```

Local dev helpers:

```powershell
pnpm dev:status
pnpm dev:stop
pnpm dev:restart
```

Optional local PowerShell wrapper:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/local/start-local-app.ps1
```

Cache validation helpers:

```powershell
pnpm cache:rebuild
pnpm cache:check
pnpm cache:check:deep
pnpm validate:real-data
```

`pnpm validate:real-data` rebuilds the app-ready cache from the configured raw-data root and then runs the deep contract check against that regenerated cache.

To bypass the startup cache preflight intentionally:

```powershell
$env:SKIP_APP_CACHE_CHECK = "1"
pnpm dev
```

Open one of the routed workspaces:

- `http://127.0.0.1:3000/circuit`
- `http://127.0.0.1:3000/simulator`
- `http://127.0.0.1:3000/live`
- `http://127.0.0.1:3000/profiler`

Legacy compatibility alias:

- `http://127.0.0.1:3000/stockpiles` redirects to `/live?view=piles`

## Validation

### Lint

```powershell
pnpm lint
```

### Unit and component tests

```powershell
pnpm test
```

### End-to-end route validation

```powershell
pnpm test:e2e
```

### Production build

```powershell
pnpm build
```

### Combined validation helpers

```powershell
pnpm validate
pnpm validate:build
pnpm validate:full
pnpm validate:real-data
```

## Runtime Surface

### Metadata and contract entry points

- `GET /api/manifest`

### Live state services

- `GET /api/live/belts/{beltId}`
- `GET /api/live/piles/{pileId}`

### Stockpile services

- `GET /api/stockpiles/{pileId}` (legacy route alias for the dense pile dataset loader)

### Profiler services

- `GET /api/profiler/summary`
- `GET /api/profiler/objects/{objectId}/snapshots/{snapshotId}`

## Project Structure

```text
app/
components/
docs/
lib/
tests/
types/
```

## Documentation Index

- [App Data Contract](docs/app-data-contract.md)
- [Development Guidelines](docs/development-guidelines.md)
- [Local Runtime Guide](docs/local-runtime-guide.md)
pr - [Exporter Script Docs](scripts/docs/generate-actual-cache.md)
- [Changelog](CHANGELOG.md)

## Current Version

`1.00.017`

Versioning uses the fixed-width format `x.xx.xxx`.
This stable baseline corresponds semantically to the `1.0.0` release milestone.
See [Changelog](CHANGELOG.md) for release-by-release history.
