# Mine Pile Visualizer

Local-first web application for exploring circuit topology, live material state, stockpile structure, and profiler history produced by a mineral tracking simulation engine.

## Overview

Mine Pile Visualizer is not intended to be only a developer sandbox. It is a working visualization surface organized around five complementary operator views:

- `/circuit`
- `/simulator`
- `/live`
- `/stockpiles`
- `/profiler`

The current baseline already provides a routed application shell, an illustrative circuit overview with `2D`, `3D`, and diagram modes, dense live-state inspection for both belts and piles, dimensional stockpile views for `1D`, `2D`, and `3D` objects, and history playback over profiler snapshots. The repository is intentionally decoupled from raw source-trace artifacts. At runtime it consumes only an app-ready local cache rooted at `.local/app-data/v1/` or an explicit `APP_DATA_ROOT` override.

## Problem Framing

Operational mineral tracking outputs are information-rich but not naturally easy to inspect. Circuit relationships, instantaneous transport state, and internal stockpile composition are usually split across different files and resolutions. Tabular inspection alone is too slow for understanding flow structure, spatial accumulation, or temporal change.

Mine Pile Visualizer responds by turning those app-ready outputs into a set of linked spatial and temporal views:

- a circuit view for sequence and object relationships
- a live view for current dense belts and current dense piles
- a stockpile view for internal structure by selected quality
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

### 2. Instantaneous Dense State

The operator then moves to `/live` to inspect the current dense runtime state from `06_models`. The route is split into two subviews: one for belts and virtual belts, and one for piles and virtual piles, so current transport and current accumulation can be inspected without redrawing the circuit.

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
| Routed workspaces | `5` |
| User-facing focus areas | circuit, simulator, live state, stockpiles, profiler history |
| Dimensional stockpile support | `1D`, `2D`, `3D` |
| `3D` pile render modes | `surface`, `shell`, `full`, `slice` |
| Runtime cache contract | JSON metadata + Arrow IPC tables |
| Default local cache root | `.local/app-data/v1/` |
| Alternate cache path | `APP_DATA_ROOT` |
| Local development port | `3000` |
| Theme modes | dark, light |
| Release-synced version | `0.01.081` |
| Validation surface | `pnpm lint`, `pnpm test`, `pnpm test:e2e`, `pnpm build` |

## Release Status

| Status | Version |
|---|---|
| Closed baseline | `0.01.080` |
| Active tracked version | `0.01.081` |

## Current Frontend Views

### Circuit Workspace

The circuit workspace now starts with an illustrative reading of the modeled area. It offers an operator-facing `2D` view, a matching `3D` overview, and a diagram mode for structural debugging. Physical belts are rendered as conveyor-like elements, stockpiles are rendered as pile shapes, and virtual transfer objects remain visible as conceptual markers rather than physical equipment drawings. Pile illustrations also reflect their configured feed and discharge anchors, including multiple configured feed or reclaim points on the same pile instead of collapsing them into a single generic entry or exit point. The three circuit modes now share one fixed-height stage-board layout: stages are ordered left to right with contiguous frames, disconnected objects inside the same stage are now treated as separate vertical groups, and same-stage receivers move one column to the right when the flow inside the stage has explicit dependency. This makes the `Diagram`, `2D`, and `3D` views read as the same process board instead of three unrelated spatial guesses, and prevents independent same-stage branches from collapsing into one mixed vertical ordering. The `3D` view now also starts from a centered top-down camera so the opening read matches the `2D` board before the operator begins orbiting. The route now also states its operator question and usage boundary explicitly, reinforcing that this page is for structural reading rather than material-content inspection. The selected object now highlights its connected circuit sequence so the operator can read upstream and downstream context without switching views, and the inspection panel exposes the configured feed and discharge anchor inventories with related object labels. It also derives one explicit flow role per object, which helps the operator distinguish virtual discharge contributors, merge accumulation nodes, and measured downstream transport instead of reading them as one generic node type.

### Live Workspace

The live workspace now reads as the dense current-state route from `06_models`, not as another circuit view. It starts with two subviews: `Belts / VBelts` and `Piles / VPiles`. The belt subview stays explicitly on one current belt at a time and exposes the dense ordered belt strip plus a literal mass-weighted histogram for the selected quality. The pile subview reuses the same dense current pile datasets that feed the stockpile route, but keeps them inside the live route as the current accumulation counterpart to belt inspection. Both subviews can switch into represented-material time coloring, so the current dense state can also be read by oldest age, newest age, or represented span without leaving the route.

### Simulator Workspace

The simulator workspace now uses piles and virtual piles as its central object model. A selected pile stays at the center of the route, profiler time controls remain available when that pile has history, and the lower section now treats discharge structure as one focused active route instead of a repeated flat stack per output. Direct reclaim belts are selected first from the pile outputs, then the active route separates virtual merge nodes from downstream conveyors so the reclaim hierarchy reads in the same order as the modeled flow. The route framing now stays profiler-only: downstream conveyors follow the same selected profiler timestep when a historical snapshot exists locally, and otherwise remain structural context instead of falling back to dense live strips. The simulator builds an aggregated summary for the currently selected discharge route so the operator can read the active reclaim path as one combined histogram and summary block before drilling into each downstream belt card. Both the central pile and downstream belt histograms can now switch into represented-material time modes, which makes age and represented-span patterns readable in the same simulator context used for discharge interpretation. Route selectors, merge cards, and the route sidebar now expose grouped discharge semantics directly, so one selected output can read as an independent route or as one contributor inside a larger grouped reclaim structure that converges on shared merge or downstream transport. The simulator sidebar itself is now framed around active-route context instead of generic pile quality summary, which keeps the route semantically separate from the stockpile workspace.

### Stockpile Workspace

The stockpile workspace exposes internal structure for accumulation objects as a pile-only route. It supports quality selection, dimension-aware rendering, and multiple `3D` display strategies so the operator can move between overview and denser views without changing data sources. Dense pile tables are requested on demand after the selected object is known instead of being preloaded during the route render, and the route now states explicitly that it is reading current dense pile inventories rather than historical snapshots. The pile visual keeps configured feed and discharge anchors visible on the view itself instead of relegating them to supporting text, and `2D` and `3D` pile views keep a second near-pile anchor layer slightly above and below the drawn pile so the operator can read anchor position directly against the figure. Those anchors now also respect relative footprint spans from configuration instead of rendering only as point markers. The same selector can now switch the pile from tracked-quality coloring into oldest-age, newest-age, or represented-span coloring, which makes material residence patterns visible directly inside the dense cell or voxel view. Numerical pile qualities also switch to a view-scaled contrast domain when the visible cells only occupy a narrow slice of the configured range, so voxel patterns stay readable when qualities are tightly clustered. The `3D` voxel renderer now uses an explicit merged visible-voxel mesh so colored cells remain visible under dense real datasets. The sidebar now includes a stockpile-specific structure profile with fill ratio, footprint use, mass center, axis coverage, and mass-by-layer profile, which makes the route read more clearly as internal pile interpretation instead of another generic inspector. The remaining sidebar panels still separate quantitative averages, dominant mapped categorical values, and histogram-style qualitative distributions, preferring explicit categorical proportion channels when they are present in the cache. String-valued qualitative tokens are resolved through the same dictionary path as numeric-coded categories. The workspace can also surface hovered cell details without leaving the current view mode.

### Profiler Workspace

The profiler workspace is now object-and-time first. It does not redraw the circuit. Instead, the operator selects one profiled object, moves through its stored profiler snapshots, and reads two pieces of evidence together: the summarized object representation at the selected timestep, and the time series of the selected quality across the available history. This route stays explicitly on `08_reporting` historical summaries, so it is suitable for trend reading, snapshot comparison, and playback over time rather than for dense current-state inspection. The selected snapshot still exposes delta against the previous stored step, represented-material time summaries, mass distributions, mapped categorical quality views, and hovered summary-cell inspection, but all of that now sits under one historical object view rather than being split into separate circuit and detail modes.

## Scope And Current Status

### Current Workspaces

- `Circuit`: illustrative `2D` and `3D` overview, diagram fallback, and object inspection.
- `Simulator`: timestep-oriented circuit scenario playback backed by profiled summary history.
- `Live`: dense current state from `06_models`, split into belt/vbelt and pile/vpile subviews.
- `Stockpiles`: pile selection, quality selection, dimension-aware rendering, and `3D` view modes.
- `Profiler`: timestamp navigation, playback controls, circuit mode, and object-detail mode.

### Repository Boundaries

- `data/` is local-only and ignored by Git.
- `.local/` is local-only and ignored by Git.
- The tracked repository does not keep source-trace serialization logic.
- Runtime code depends only on the documented app-ready contract.
- Local cache generation for sample or real datasets must stay outside tracked code.
- The UI never reads the original `data/` tree directly.
- The routed shell now supports an operator-selectable dark or light theme, stored locally per browser.

### Current Boundaries

- The current `0.01.x` line is local-first; deployment packaging, desktop wrapping, and container workflows are not yet part of the shipped baseline.
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
- `http://127.0.0.1:3000/simulator`
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
- [Changelog](CHANGELOG.md)

## Current Version

`0.01.081`

Versioning uses the fixed-width format `x.xx.xxx`.
See [Changelog](CHANGELOG.md) for release-by-release history.
