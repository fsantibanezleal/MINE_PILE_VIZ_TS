# App Data Contract

This repository does **not** keep or expose serializers for the original trace artifacts. The application only reads a sanitized, app-ready cache rooted at:

```text
.local/app-data/v1/
```

That cache is local-only and ignored by Git.

## Goals

- keep the runtime independent from raw engine formats
- make local serving fast and predictable
- allow the upstream exporter to evolve independently from this UI
- support dense voxel and block datasets with Arrow IPC files

## Folder Layout

```text
.local/app-data/v1/
  manifest.json
  qualities.json
  registry.json
  circuit.json
  live/
    object-summaries.json
    belts/
      <belt_id>.arrow
  stockpiles/
    <pile_id>/
      meta.json
      cells.arrow
      surface.arrow        # optional but strongly recommended for 3D
      shell.arrow          # optional acceleration artifact
  profiler/
    index.json
    summary.arrow
    objects/
      <object_id>/
        manifest.json
        snapshots/
          <snapshot_id>.arrow
```

## JSON Files

### `manifest.json`

Required fields:

- `schemaVersion`: string
- `appVersion`: string
- `datasetLabel`: string
- `generatedAt`: ISO timestamp
- `latestTimestamp`: ISO timestamp
- `paths`: relative paths to `qualities`, `registry`, `circuit`, `liveSummaries`, `profilerIndex`, and `profilerSummary`
- `capabilities`: booleans for `circuit`, `live`, `stockpiles`, `profiler`
- `objectCounts`: totals for `total`, `belts`, `piles`, `profiled`

### `qualities.json`

Array of quality definitions.

Required fields per item:

- `id`
- `kind`: `numerical` or `categorical`
- `label`
- `description`
- `palette`: array of hex colors

Numerical qualities should also provide:

- `min`
- `max`

Categorical qualities should also provide:

- `categories[]`
- each category needs `value`, `label`, `color`

Categorical `value` may be either a numeric code or a string token. The runtime treats these as
categorical identities, not as numerical quantities.

Qualitative distribution channels may also be emitted as additional numerical quality definitions
when the exporter has access to categorical proportion outputs.

Naming convention:

- main qualitative key: `q_cat_<source>_main`
- proportion keys: `q_cat_<source>_prop_<token>`
- residual channel: `q_cat_<source>_prop_other`

Recommended characteristics for these proportion qualities:

- `kind: numerical`
- `min: 0`
- `max: 1`
- `label` should be the human-readable token name (for example `Oxide 1`)
- `palette` should contain the display color for that token

When these proportion channels are present, the UI will use them to derive dominant qualitative
categories and histogram-style qualitative distributions. When they are absent, the UI falls back
to estimates based on block or cell-level `*_main` labels when detail rows are available.

### `registry.json`

Array of object descriptors.

Required fields per item:

- `objectId`
- `objectType`: `belt` or `pile`
- `objectRole`: `physical` or `virtual`
- `displayName`
- `shortDescription`
- `stageIndex`
- `dimension`: `1 | 2 | 3`
- `isProfiled`

Optional references:

- `liveRef`
- `stockpileRef`
- `profilerRef`

All references are paths relative to `.local/app-data/v1/`.
References must remain inside the configured cache root. Absolute paths or escaping relative paths are treated as contract errors.

### `circuit.json`

Required top-level fields:

- `stages[]`
- `nodes[]`
- `edges[]`

Each node must include:

- `id`
- `objectId`
- `objectType`
- `objectRole`
- `label`
- `stageIndex`
- `dimension`
- `isProfiled`
- `shortDescription`
- `inputs[]`
- `outputs[]`

Each anchor under `inputs[]` or `outputs[]` must include:

- `id`
- `label`
- `kind`
- `x`
- `y`
- `spanX` (recommended)
- `spanY` (recommended)
- `positionMode` (recommended)
- `relatedObjectId`

Coordinates are normalized in `[0, 1]`.

Anchor semantics:

- `x` and `y` are relative coordinates in the local pile footprint.
- Numeric values must stay in `[0, 1]`.
- When the upstream configuration provides a non-numeric dynamic token, the current UI contract assumes `0.5` for that axis and should emit `positionMode: "assumed-center"`.
- `spanX` and `spanY` are relative footprint sizes in `[0, 1]` for the anchor area, not absolute block counts.
- For physical stockpiles, feed and discharge neighborhood fractions from configuration are appropriate source values for `spanX` and `spanY`.
- For simplified virtual piles where explicit footprint widths are not configured, the exporter may emit reasonable relative defaults so the UI can still draw representative feed/discharge areas instead of point markers.

### `live/object-summaries.json`

Array of current object summaries.

Required fields per item:

- `objectId`
- `objectType`
- `displayName`
- `timestamp`
- `massTon`
- `status`
- `qualityValues`

`qualityValues` is a JSON object keyed by quality id.

- numerical qualities should emit finite numbers
- categorical qualities may emit either numeric codes or string tokens, as long as they match one
  of the configured category definitions

### `stockpiles/<pile_id>/meta.json`

Required fields:

- `objectId`
- `displayName`
- `objectRole`
- `timestamp`
- `dimension`
- `extents`: `{ x, y, z }`
- `occupiedCellCount`
- `surfaceCellCount`
- `defaultQualityId`
- `availableQualityIds[]`
- `viewModes[]`
- `suggestedFullStride`
- `fullModeThreshold`
- `qualityAverages`
- `inputs[]`
- `outputs[]`
- `files`

`files.cells` is required. `files.surface` and `files.shell` are optional acceleration artifacts.
If `files.surface` or `files.shell` are omitted, unavailable, or unusable, the runtime will fall back to derived layers from `cells.arrow`.

`qualityAverages` follows the same rules as `qualityValues`: numerical entries must be numeric,
while qualitative `*_main` entries may be numeric codes or string tokens.

### `profiler/index.json`

Required fields:

- `defaultObjectId`
- `objects[]`

Each object entry needs:

- `objectId`
- `displayName`
- `objectType`
- `dimension`
- `manifestRef`

### `profiler/objects/<object_id>/manifest.json`

Required fields:

- `objectId`
- `objectType`
- `displayName`
- `dimension`
- `defaultQualityId`
- `availableQualityIds[]`
- `latestSnapshotId`
- `snapshotIds[]`
- `snapshotPathTemplate`

The template must use `[snapshotId]` as placeholder.

## Arrow IPC Files

Use Arrow IPC file format with `.arrow` extension.

### Live belt blocks

Required columns:

- `position`
- `massTon`
- `timestampOldestMs`
- `timestampNewestMs`
- one column per quality id

Rows must already be ordered by belt position.

### Stockpile cells

Required columns:

- `ix`
- `iy`
- `iz`
- `massTon`
- `timestampOldestMs`
- `timestampNewestMs`
- one column per quality id

Rules:

- indices are zero-based
- `dimension = 1` still uses `ix`, `iy`, `iz`, with singleton axes set to `0`
- `dimension = 2` still uses `ix`, `iy`, `iz`, with the unused axis set to `0`
- only occupied cells should be emitted

### Profiler summary

Required columns:

- `snapshotId`
- `timestamp`
- `objectId`
- `objectType`
- `displayName`
- `dimension`
- `massTon`
- one column per quality id

This file is the circuit-mode backbone for the profiler page.

### Profiler object snapshots

Required columns:

- `timestamp`
- `ix`
- `iy`
- `iz`
- `massTon`
- `timestampOldestMs`
- `timestampNewestMs`
- one column per quality id

## Recommended Characteristics

- Use UTF-8 for JSON files.
- Keep JSON small and structural; put dense tabular data into Arrow.
- Emit `surface.arrow` for large 3D piles so the default stockpile view remains responsive.
- Emit `shell.arrow` when possible for a denser but still bounded 3D mode.
- Keep quality ids stable across all files in the dataset.
- Use ISO timestamps in JSON and snapshot identifiers that sort lexicographically by time.

## Runtime Assumptions

- The application reads only from `.local/app-data/v1/`.
- Missing required files should be treated as contract errors.
- Optional acceleration files may be omitted; the UI will fall back to `cells.arrow`.
- Manifest capabilities decide whether the corresponding routed workspace should be considered available.
- When a route cannot load its required contract inputs, the UI should surface a route-level unavailable state instead of crashing the whole application.
