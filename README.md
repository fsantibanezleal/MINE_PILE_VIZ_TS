# Mine Pile Visualizer

Local-first web application for exploring circuit topology, live material state, stockpile structure, and profiler history produced by a mineral tracking simulation engine.

## Overview

Mine Pile Visualizer is not intended to be only a developer sandbox. It is a working visualization surface organized around four complementary operator views:

- `/circuit`
- `/live`
- `/stockpiles`
- `/profiler`

The current baseline already provides a routed application shell, an illustrative circuit overview with `2D`, `3D`, and diagram modes, live belt block inspection, dimensional stockpile views for `1D`, `2D`, and `3D` objects, and history playback over profiler snapshots. The repository is intentionally decoupled from raw source-trace artifacts. At runtime it consumes only an app-ready local cache rooted at `.local/app-data/v1/` or an explicit `APP_DATA_ROOT` override.

## Problem Framing

Operational mineral tracking outputs are information-rich but not naturally easy to inspect. Circuit relationships, instantaneous transport state, and internal stockpile composition are usually split across different files and resolutions. Tabular inspection alone is too slow for understanding flow structure, spatial accumulation, or temporal change.

Mine Pile Visualizer responds by turning those app-ready outputs into a set of linked spatial and temporal views:

- a circuit view for sequence and object relationships
- a live view for current belt content and object summaries
- a stockpile view for internal structure by selected property
- a profiler view for historical snapshots and time navigation

## Motivation

- Circuit diagrams alone do not show what material is present at a given instant.
- Live transport state alone does not explain how stockpiles are internally organized.
- Stockpile internals alone do not explain how the modeled area is connected end to end.
- Historical snapshots are useful only if the operator can move between object-level and circuit-level context without reinterpreting the data format each time.
- A local-first application keeps the runtime simple for engineering review, controlled testing, and internal dataset iteration.

## Process And Operator Flow

The application is organized as a progressive reading flow rather than a single page.

### 1. Circuit Understanding

The operator starts in `/circuit` to understand the modeled area as a staged sequence of belts and accumulation objects. This is the structural map of the system and the entry point for object selection.

### 2. Instantaneous Transport State

The operator then moves to `/live` to inspect what is currently present on modeled belts. The route overlays ordered block content with object summary metrics so the live transport picture stays tied to the same circuit context.

### 3. Internal Stockpile Inspection

The next step is `/stockpiles`, where a selected accumulation object is rendered according to its dimensionality. `1D` objects are shown as columns, `2D` objects as matrices, and `3D` objects as voxel-based scenes with surface-first and slice-friendly rendering modes.

### 4. Historical Review

The operator uses `/profiler` to move through time. This route supports both a broader circuit-level reading of profiled objects and a focused object view for a selected belt or stockpile snapshot.

## Architecture

Mine Pile Visualizer uses a single Next.js application with App Router and a local-first runtime boundary.

- `Next.js + React + TypeScript` provide the routed frontend and server-side data access surface.
- Server-only loaders under `lib/server/` read the app-ready cache and validate the JSON contract before the UI consumes it.
- Dense object state is stored as Arrow IPC tables for efficient transport of block and voxel records.
- `React Flow + Dagre` drive the circuit topology surface.
- `React Three Fiber` is used for `3D` stockpile rendering.
- Tests use `Vitest` for unit and component checks and `Playwright` for route-level browser validation.

The tracked repository documents and consumes the app-ready contract only. Any transformation from original local source data into `.local/app-data/v1/` must remain outside tracked code.

## KPI Targets

- Circuit clarity: the sequence of modeled objects should be understandable without opening raw files.
- Cross-view coherence: object identity, labels, and selected properties should stay consistent across routes.
- Dimensional fidelity: `1D`, `2D`, and `3D` stockpiles should each render in a form that matches their modeled structure.
- Local operability: the application should run entirely from a local cache without external services.
- Large-volume safety: high-density `3D` stockpiles should prefer visible-content rendering modes before full voxel expansion.
- Contract discipline: runtime code should depend on a documented app-ready cache rather than hidden serializers.

## Current Measured State

| Indicator | Current State |
|---|---|
| Routed workspaces | `4` |
| User-facing focus areas | circuit, live state, stockpiles, profiler history |
| Dimensional stockpile support | `1D`, `2D`, `3D` |
| `3D` pile render modes | `surface`, `shell`, `full`, `slice` |
| Runtime cache contract | JSON metadata + Arrow IPC tables |
| Default local cache root | `.local/app-data/v1/` |
| Alternate cache path | `APP_DATA_ROOT` |
| Local development port | `3000` |
| Release-synced version | `0.01.019` |
| Validation surface | `pnpm lint`, `pnpm test`, `pnpm test:e2e`, `pnpm build` |

## Current Frontend Views

### Circuit Workspace

The circuit workspace now starts with an illustrative reading of the modeled area. It offers an operator-facing `2D` view, a matching `3D` overview, and a diagram mode for structural debugging. Physical belts are rendered as conveyor-like elements, stockpiles are rendered as pile shapes, and virtual transfer objects remain visible as conceptual markers rather than physical equipment drawings. Pile illustrations also reflect their configured feed and discharge anchors, including multiple configured feed or reclaim points on the same pile instead of collapsing them into a single generic entry or exit point. The selected object now highlights its connected circuit sequence so the operator can read upstream and downstream context without switching views, and the inspection panel exposes the configured feed and discharge anchor inventories with related object labels.

### Live Workspace

The live workspace focuses on instantaneous transport state. Belt content is represented as ordered block strips, and a mass-weighted histogram under that strip summarizes the selected property across the current belt content without losing the block ordering view. The side panel keeps the selected object summary visible for quick reading.
Route query state now preserves the current object and property context when the operator moves to another workspace through the top navigation.
The side inspection panels now expose direct cross-workspace actions so the operator can jump into a more suitable view without resetting object or property context.

### Stockpile Workspace

The stockpile workspace exposes internal structure for accumulation objects. It supports property selection, dimension-aware rendering, and multiple `3D` display strategies so the operator can move between overview and denser views without changing data sources. Dense pile tables are requested on demand after the selected object is known instead of being preloaded during the route render.

### Profiler Workspace

The profiler workspace adds time navigation. It lets the operator inspect profiled objects across stored snapshots, switching between a broader circuit reading and a more focused object-centric reading of historical content. Summary history now loads on demand from the route API so the page can mount before fetching the full timeline table.

## Scope And Current Status

### Current Workspaces

- `Circuit`: illustrative `2D` and `3D` overview, diagram fallback, and object inspection.
- `Live`: circuit context plus live belt block content and summary metrics.
- `Stockpiles`: pile selection, property selection, dimension-aware rendering, and `3D` view modes.
- `Profiler`: timestamp navigation, playback controls, circuit mode, and object-detail mode.

### Repository Boundaries

- `data/` is local-only and ignored by Git.
- `.local/` is local-only and ignored by Git.
- The tracked repository does not keep source-trace serialization logic.
- Runtime code depends only on the documented app-ready contract.
- Local cache generation for sample or real datasets must stay outside tracked code.
- The UI never reads the original `data/` tree directly.

### Current Boundaries

- v0.01.019 is local-first; deployment packaging, desktop wrapping, and container workflows are not yet part of the shipped baseline.
- The application expects the app-ready cache to exist before runtime; it does not generate that cache itself.
- Very large `3D` stockpiles already support safer rendering modes, but this is not yet a specialized high-end large-scene rendering pipeline.
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

### 4. Run the application

```powershell
pnpm dev
```

Open one of the routed workspaces:

- `http://127.0.0.1:3000/circuit`
- `http://127.0.0.1:3000/live`
- `http://127.0.0.1:3000/stockpiles`
- `http://127.0.0.1:3000/profiler`

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

## Runtime Surface

### Metadata and contract entry points

- `GET /api/manifest`

### Live state services

- `GET /api/live/belts/{beltId}`

### Stockpile services

- `GET /api/stockpiles/{pileId}`

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
- [Local Runtime Guide](docs/local-runtime-guide.md)

## Current Version

`0.01.019`

Versioning uses the fixed-width format `x.xx.xxx`.
