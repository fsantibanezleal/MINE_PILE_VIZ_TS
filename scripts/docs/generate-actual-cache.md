# `generate_actual_cache.py`

## Purpose

`scripts/generate_actual_cache.py` is the tracked exporter that converts the local raw dataset under `data/` into the app-ready cache consumed by the Next.js application.

It exists for three reasons:

- to keep normal application runtime independent from raw simulation artifacts
- to reshape raw model outputs into route-specific payloads that the UI can consume directly
- to enforce one stable conversion boundary that can be rebuilt, validated, and debugged explicitly

Normal runtime does **not** read the raw dataset directly. It reads only the generated cache under:

```text
.local/app-data/v1/
```

or another root provided through `APP_CACHE_ROOT` / `APP_DATA_ROOT`.

## Execution Path

The expected repository-owned entry point is:

```powershell
pnpm cache:rebuild
```

That command resolves into this chain:

1. `scripts/cache-rebuild.ts`
2. `lib/server/app-cache-rebuild.ts`
3. `scripts/generate_actual_cache.py`

The TypeScript layer is only a launcher:

- parses `--root` and `--raw-root`
- resolves the Python executable
- passes `APP_CACHE_ROOT` and `RAW_DATA_ROOT`

The Python script performs the actual transformation.

## Responsibility Split By Script

| File | Responsibility |
|---|---|
| `scripts/cache-rebuild.ts` | repository-owned CLI entry point used by `pnpm cache:rebuild` |
| `lib/server/app-cache-rebuild.ts` | argument parsing, Python launcher resolution, and environment wiring |
| `scripts/generate_actual_cache.py` | actual raw-data-to-cache conversion logic |
| `scripts/local/03-rebuild-local-app-data.ps1` | local PowerShell wrapper around the tracked rebuild path |

## Required Raw Inputs

The exporter fails fast if these inputs are missing:

```text
<RAW_DATA_ROOT>/
  conf/qualities.yml
  conf/mto_objects.yml
  05_model_input/sequence.json
  06_models/mt_state.joblib
  08_reporting/
```

It also expects:

- `04_feature/df_transport.pkl` for simulator rate derivation
- the Python packages listed in `scripts/generate_actual_cache.requirements.txt`
- the reference `mineral_tracking` module to be importable when unpickling `mt_state.joblib`

If the reference module is not available in the default fallback path, `REFERENCE_ROOT` must point to the source tree that contains it.

## High-Level Conversion Flow

```text
data/conf/qualities.yml          -> qualities.json
data/conf/mto_objects.yml        -> registry.json, circuit.json, live pile metadata, simulator output config
data/05_model_input/sequence.json -> stageIndex values and staged circuit layout
data/06_models/mt_state.joblib   -> live belts, live piles, live summaries
data/08_reporting/**/history     -> profiler snapshots, profiler manifests, profiler summary
data/08_reporting/**/sims        -> simulator future steps
data/04_feature/df_transport.pkl -> simulator tonsPerStep / tonsPerHour
```

The script then writes:

- top-level manifest and metadata
- circuit graph
- current live MTO payloads
- profiler history payloads
- simulator payloads

## What The App Needs From This Conversion

The exporter is not producing one generic dataset. It is producing four different runtime views over the same raw source tree:

| App area | Why the exported payload exists |
|---|---|
| `Circuit` | the UI needs a staged structural graph with enriched pile anchors instead of raw configuration files |
| `Live` | the UI needs dense current belt blocks and pile cells already normalized into Arrow rows |
| `Profiler` | the UI needs summarized historical snapshots that can be paged and compared efficiently |
| `Simulator` | the UI needs pile-centered future-step payloads plus output projections, not only raw `sims` parquet files |

That is why the exporter builds different shapes for the different workspaces instead of exposing the raw folders directly.

## Shared Metadata Built First

Before the route-specific areas are exported, the script builds the metadata that all routes depend on.

### Quality definitions

`build_quality_definitions()` reads `conf/qualities.yml` and emits:

- numerical quality definitions with min/max and display palette
- categorical quality definitions with categories, colors, and display labels

These become:

```text
qualities.json
```

### Object registry

`build_registry()` reads the loaded `mt_state` together with `mto_objects.yml` and `sequence.json` to produce:

- `objectId`
- `objectType` (`belt` / `pile`)
- `objectRole` (`physical` / `virtual`)
- `displayName`
- `shortDescription`
- `dimension`
- `isProfiled`
- route payload references such as `liveRef`, `livePileRef`, and `profilerRef`
- `stageIndex`

This becomes:

```text
registry.json
```

The registry is the central lookup layer that connects object identity to route-specific files.

### Why registry comes first

The rest of the export depends on a stable object inventory:

- the circuit graph needs object identity and dimensionality
- live summaries need display names and object roles
- profiler and simulator manifests need route references and display metadata

If the registry were inconsistent, every route would drift separately.

## Circuit Export

### Source inputs

Circuit export depends mainly on:

- `registry`
- `conf/mto_objects.yml`
- `05_model_input/sequence.json`

### Main function

```text
build_circuit_graph()
```

### What it derives

For each registered object, the script builds:

- staged circuit nodes
- directed edges
- pile input anchors
- pile output anchors

Anchor geometry is not copied blindly. The exporter normalizes and enriches it:

- `x` and `y` are derived from `col_x` / `col_y`
- non-numeric dynamic anchor coordinates fall back to `0.5`
- `positionMode` becomes `"assumed-center"` when a dynamic value had to be normalized
- `spanX` and `spanY` are derived from configured feed/discharge neighborhood fractions, or from dimension-aware defaults when the config is incomplete

### Output

```text
circuit.json
```

This file is what `/circuit` uses to render:

- stage grouping
- structural connectivity
- feed/discharge anchor context

### Why circuit gets a dedicated export

The raw source data is not already shaped as a UI graph. The app needs:

- one node inventory aligned with route object ids
- explicit edges
- one stable stage index per object
- pile-relative anchor geometry

The exporter turns configuration and sequence data into that graph-ready structure.

## Live Export: Current MTO State

The live export is the current dense state taken from `06_models/mt_state.joblib`.

### Belt export

#### Main function

```text
build_belt_records()
```

#### Source

For each belt, the exporter reads:

```text
belt.mto_current
```

Only rows with positive occupancy are kept:

```text
belt.mto_current[belt.mto_current[:, 0] > 0]
```

Each output row contains:

- `position`
- `massTon`
- `timestampOldestMs`
- `timestampNewestMs`
- one field per quality id

#### Outputs

```text
live/belts/<belt_id>.arrow
live/object-summaries.json
```

The live summary for belts is built with `build_live_summary()` and uses mass-weighted quality averages.

### Why belts are exported this way

The live belt route reads one dense belt snapshot at a time. That route needs:

- rows already ordered by belt position
- mass and represented-material timestamps per block
- route-level summary values that can be shown without loading every dense artifact first

### Pile export

#### Main functions

```text
build_pile_cell_records()
build_surface_records()
build_stockpile_metadata()
```

#### Source

For each pile, the exporter reads:

```text
pile.internal_pile
```

Only occupied cells are emitted. Each output row contains:

- `ix`
- `iy`
- `iz`
- `massTon`
- `timestampOldestMs`
- `timestampNewestMs`
- one field per quality id

#### Metadata derived for the app

The script derives:

- effective dimensionality
- `extents`
- `occupiedCellCount`
- `surfaceCellCount`
- default and available quality ids
- allowed view modes
- `suggestedFullStride`
- `fullModeThreshold`
- mass-weighted `qualityAverages`
- input/output anchors

For `3D` piles it currently emits:

- `surface`
- `shell`
- `full`
- `slice`

as route-supported `viewModes`.

#### Outputs

```text
live/piles/<pile_id>/meta.json
live/piles/<pile_id>/cells.arrow
live/piles/<pile_id>/surface.arrow
live/piles/<pile_id>/shell.arrow
live/object-summaries.json
```

Note:

- `surface.arrow` is derived as the top occupied cell per `(ix, iy)` column
- `shell.arrow` currently reuses `surface_records`

That means the current exporter does **not** build a separate shell extraction algorithm yet; it emits a shell-compatible acceleration artifact using the same outer surface rows.

### Why live summaries exist

`live/object-summaries.json` is a compact overview used by the application alongside the dense per-object payloads. It gives the routes a fast way to display current object status and mass-weighted summary values without loading every heavy Arrow file up front.

### Why live piles are exported this way

The app needs more than a raw 3D tensor. It needs:

- explicit extents
- dimensionality
- supported view modes
- render safety hints such as `suggestedFullStride` and `fullModeThreshold`
- input and output anchors for in-figure context

That extra metadata is what lets the live route render the same pile correctly across `1D`, `2D`, and `3D` modes.

## Profiler Export

Profiler export is built from:

```text
data/08_reporting/<object_id>/<dimension>/
```

### Main functions

```text
pick_profile_files()
summarize_profile_dataframe()
profile_rows_from_dataframe()
```

### File selection

The exporter looks for:

- `profile_latest.parquet`
- `history/profile_*.parquet`

Special case:

- for `pile_stockpile`, historical sampling is downsampled using `PILE_HISTORY_STRIDE = 12`

This is a deliberate performance and volume control for the largest historical pile.

### Summary semantics

For each selected profiler parquet file, the exporter derives:

- one summary row for `profiler/summary.arrow`
- one dense summarized snapshot for `profiler/objects/<object_id>/snapshots/<snapshot_id>.arrow`
- one object manifest

Numerical qualities use:

- weighted average when `mass_ton` is available
- arithmetic mean only as fallback

Categorical qualities use:

- mass-weighted dominant category when weights exist
- first non-null categorical value as fallback

### Outputs

```text
profiler/index.json
profiler/summary.arrow
profiler/objects/<object_id>/manifest.json
profiler/objects/<object_id>/snapshots/<snapshot_id>.arrow
```

These are the files consumed by `/profiler`.

### Why profiler is exported separately from live state

Profiler is not a second live route. It is a historical summarized route. The app therefore needs:

- one compact summary table to drive object/time selection
- one manifest per object
- one normalized snapshot payload per selected historical step

The exporter makes that distinction explicit by separating profiler outputs from `live/`.

## Simulator Export

Simulator export is built only for pile objects that:

- are present in the registry
- have profiler history
- have `profile_latest.parquet`

### Main functions

```text
pick_sim_files()
infer_step_minutes()
build_transport_rate_map()
build_simulator_output_records()
```

### Source inputs

Simulator export combines three raw sources:

1. latest profiler state from `profile_latest.parquet`
2. future simulated steps from `sims/profile_*.parquet`
3. latest transport row from `04_feature/df_transport.pkl`

### Step construction

Each simulator object gets a step list composed of:

- a `"base"` step from `profile_latest.parquet`
- zero or more `"simulated"` steps from `sims/`

For every step, the exporter writes:

- one pile snapshot under `simulator/.../pile.arrow`
- one output snapshot per configured pile output under `simulator/.../outputs/<output_id>.arrow`

### How output rates are derived

`build_transport_rate_map()` calculates:

- `tonsPerStep`
- `tonsPerHour`
- `parentBeltId`

It uses:

- direct `tag_ton` values when the transport dataframe exposes them
- proportional splits through `conf_prop_belts` when virtual feeder outputs inherit from one measured parent belt

### How simulated output blocks are generated

`build_simulator_output_records()` does not read downstream raw belt snapshots.

Instead, it synthesizes output blocks by consuming mass from the simulated pile rows:

- preferred cells are those inside the configured output footprint
- fallback candidates are all remaining pile cells
- candidates are ordered by `iz`, normalized distance to the output anchor, then `ix`/`iy`
- the function removes mass progressively from the remaining pile mass budget while creating output blocks

This means simulator outputs are generated as a projection of the simulated pile state plus configured reclaim rates, not as a separately measured downstream simulation artifact.

### Outputs

```text
simulator/index.json
simulator/objects/<object_id>/manifest.json
simulator/objects/<object_id>/steps/<snapshot_id>/pile.arrow
simulator/objects/<object_id>/steps/<snapshot_id>/outputs/<output_id>.arrow
```

These are the files consumed by `/simulator`.

### Why simulator needs its own export

The simulator route is not reading raw `sims` files directly. It needs:

- one pile-centered manifest
- one ordered list of time steps
- one pile payload per step
- one output projection per configured reclaim/output
- discharge-rate context already converted into `tonsPerStep` and `tonsPerHour`

The exporter packages those decisions into a route-ready shape so the UI can stay focused on reading, not on recomputing scenario structure in the browser.

## Final Top-Level Manifest

After all route payloads are written, the exporter emits:

```text
manifest.json
qualities.json
registry.json
circuit.json
live/object-summaries.json
profiler/index.json
profiler/summary.arrow
simulator/index.json
```

The manifest currently advertises these capabilities:

- `circuit`
- `live`
- `stockpiles`
- `profiler`
- `simulator`

`stockpiles` remains enabled as a compatibility surface even though the active product model treats dense pile reading as part of `Live > Piles / VPiles`.

## Operational Notes

### Destructive behavior at the cache root

The exporter deletes the target app-cache root before rebuilding it:

```python
if APP_ROOT.exists():
    shutil.rmtree(APP_ROOT)
```

That is expected behavior. The script rebuilds the app-ready cache from scratch.

### Version propagation

The generated manifest writes:

```text
appVersion = package.json version
```

through `read_app_version()`.

This is what later allows:

- `/diagnostics`
- `pnpm cache:check`

to detect cache-version drift against the repository.

### Default dataset label

The exporter currently writes:

```text
datasetLabel = "Local converted dataset"
```

If richer dataset labeling is needed later, this is one obvious extension point.

## Extension Guidelines

When changing this exporter, keep these rules in mind:

- preserve the runtime boundary: do not make the UI depend on raw `data/` files
- keep route semantics separated: live, profiler, and simulator should not silently collapse into one generic payload family
- update `docs/app-data-contract.md` if the app-ready contract changes
- update `scripts/docs/generate-actual-cache.md` when conversion rules change materially
- prefer adding small helper functions when a new conversion rule would otherwise duplicate logic across route areas

## Troubleshooting Checklist

If the exporter fails or the rebuilt cache behaves unexpectedly, check these first:

1. `RAW_DATA_ROOT` points to the intended dataset
2. `REFERENCE_ROOT` exposes the `mineral_tracking` module when required
3. the selected Python environment has the packages from `scripts/generate_actual_cache.requirements.txt`
4. `data/08_reporting` contains the expected profiler and `sims` parquet files
5. `pnpm cache:check` or `pnpm cache:check:deep` passes after rebuild

## Practical Summary

If you need to understand the route data sources in one sentence each:

- `Circuit` comes from `registry + sequence + object configuration`
- `Live` comes from the latest `mt_state.joblib`
- `Profiler` comes from `08_reporting/.../history` plus `profile_latest.parquet`
- `Simulator` comes from `profile_latest.parquet + sims/*.parquet + latest transport rates`

That is the conversion boundary between `data/` and the runtime cache used by the app.
