# Changelog

All notable tracked releases for this repository are recorded here.

## Versioning Policy

- Version format uses fixed-width `x.xx.xxx`.
- The rightmost block increments for each merged tracked slice.
- The middle block is reserved for broader product milestones when a larger grouped phase is intentionally declared.
- The leftmost block is reserved for major baseline shifts.

## Release Status

- Closed release baseline: `1.00.000`
- Active tracked version: `1.00.006`

## Release History

### 1.00.006

- Wrapped `pnpm dev` in a repo-managed local server launcher that records one explicit dev-server state file under `.local/` and refuses to silently drift to another port when `3000` is already occupied.
- Added `pnpm dev:status`, `pnpm dev:stop`, and `pnpm dev:restart` so the same repository can inspect, stop, and replace its own local Next dev process without relying on ad-hoc `taskkill` usage.
- Updated the local runtime documentation so the preferred recovery path for duplicated or stale development servers is now part of the documented operator/developer workflow.

### 1.00.005

- Persisted the `3D` pile point of view per workspace, so `Live > Piles / VPiles`, `Profiler`, and `Simulator` now restore their own last-used orbit camera and target on the next browser execution.
- Removed the `3D` pile remount/reset path during historical timestep changes by keeping the current graph visible while the next profiler or simulator snapshot loads, instead of clearing the central dataset first.
- Moved the relevant loading banners into non-layout-shifting overlays, so `play` can keep the `3D` scene stable while the next snapshot is being requested in the background.

### 1.00.004

- Persisted the `3D` pile vertical-compression factor per workspace, so `Live > Piles / VPiles`, `Profiler`, and `Simulator` each restore their own last-used value on the next browser execution.
- Added a shared client-side persistence hook on top of the vertical-compression helper, keeping the stored factor clamped to the supported `1..1000` range before it reaches any renderer.
- Extended component and browser coverage so the persisted vertical-compression behavior is validated both in mocked workspace tests and through a live-route reload flow.

### 1.00.003

- Added a shared vertical-compression control for every `3D` pile view so operators can flatten tall voxel stacks by any integer factor from `1` to `1000` without changing the pile footprint.
- Applied the same vertical scaling path to dense live piles, historical profiler pile snapshots, simulator route-anchor piles, and the complementary `Top Surface` mode so camera framing, grid placement, and colored geometry stay consistent.
- Extracted reusable vertical-compression helpers, added a shared UI control, and extended component coverage across the stockpile/live, profiler, and simulator workspaces.

### 1.00.002

- Added a complementary `Top Surface` view for `3D` piles inside the dense pile workspace, keeping the existing voxel, shell, surface, and slice views intact.
- Added two surface-coloring modes for that view: `Top cell quality` and `Mass-weighted column quality`, so operators can read either the visible skin or one aggregated column value without changing route.
- Extracted reusable pile-surface aggregation logic and extended renderer coverage so the new heightfield-style view stays compatible with the current `three`-based render stack.

### 1.00.001

- Removed `Stockpiles` as a separate operator workspace because its functionality now lives in `Live State > Piles / VPiles`.
- Kept `/stockpiles` only as a compatibility alias that redirects into the live pile subview while preserving the selected object and quality context.
- Removed the dedicated stockpile navigation and cross-route jump target, and updated route copy, browser coverage, and operator documentation to reflect the four active workspaces.

### 1.00.000

- Declared the first stable release baseline for the local-first visualizer after closing the outstanding actionable route, layout, and contract-alignment work tracked through the `0.01.x` line.
- Kept the fixed-width repository versioning scheme by encoding the semantic `1.0.0` release as `1.00.000`, which now becomes the new major baseline for future tracked slices.
- Revalidated the released tree end-to-end on the final baseline with `pnpm test`, `pnpm lint`, `pnpm build`, and `pnpm test:e2e`.

### 0.01.083

- Finished the route-separation pass by keeping the stockpile route structure-first: the stockpile sidebar now prioritizes pile structure, mass distribution, material-time reading, and hovered-cell inspection, while the generic profiled-quality panel stays only in the live dense pile subview.
- Tightened user-facing terminology from `property` to `quality` in the remaining visible panels and selectors, including the profiled-qualities panel and related regression coverage.
- Cleaned the last route-hierarchy rough edges by renaming the circuit inspector around one selected circuit object, moving profiler cross-route jumps into the selected-snapshot evidence section, and aligning live-route browser expectations with the current belt-and-pile wording.

### 0.01.082

- Tightened the simulator around profiler-only route-anchor semantics by removing stale current-state fallback language, renaming the central pile controls and disclosures around one selected route anchor, and making the active reclaim path the primary evidence block.
- Reworked stage-component packing so disconnected downstream groups are pulled toward upstream feeder positions, which makes grouped reclaim outputs align more naturally with their feeding belts in the shared circuit presentation.
- Compactified the diagram node cards and rewired diagram vertical placement to inherit the presentation model's y-ordering instead of redistributing every stage column uniformly, making `Diagram`, `2D`, and `3D` read more coherently as one stage board.

### 0.01.081

- Separated `Live > Piles / VPiles` from the structure-first `Stockpiles` route while still reusing the same dense pile renderer and dataset loader.
- Added a live dense pile variant of the pile workspace that removes the stockpile-only structure profile, route basis, and cross-route jump emphasis, leaving the subview focused on current dense pile evidence from `06_models`.
- Added regression coverage so the live dense pile variant keeps its lighter evidence hierarchy without regressing the stockpile route back toward a duplicated layout.

### 0.01.080

- Reordered the app-ready dense-state contract so current pile datasets now live under `live/piles/` alongside `live/belts/`, while profiler history remains isolated under `profiler/`.
- Added explicit `Belts / VBelts` and `Piles / VPiles` subviews to the live route so `/live` now reads as the dense current-state workspace from `06_models` instead of a belt-only route.
- Rebuilt the default local cache under `.local/app-data/v1/` with the corrected dense pile paths, verified `belt_cv200.arrow` and `live/piles/pile_stockpile/meta.json`, and kept the legacy stockpile API route only as a compatibility alias while the runtime shifts to the new layout.

### 0.01.079

- Reframed the live route as a dense current-belt workspace instead of a circuit-context workspace, removing the embedded circuit view and keeping the route centered on one selected live belt, its ordered block strip, and its mass-weighted histogram.
- Rebuilt the profiler route into an object-and-time explorer: it now keeps one profiled object in view, removes the old circuit/detail mode split, and adds a historical quality series directly under the summarized object representation.
- Tightened operator-facing terminology from `property` toward `quality` in the touched history and distribution surfaces, and added reusable historical-quality-series logic plus regression coverage for the new live/profiler reading model.

### 0.01.078

- Extended the shared anchor contract so pile and virtual-pile inputs and outputs now carry relative footprint spans and anchor position-mode metadata, which lets the circuit and stockpile renderers use the geometry already present in `data/conf` instead of collapsing everything into point markers.
- Corrected the app-ready cache conversion flow so profiled pile dimensionality now follows reporting/config reality, including `vpile_ch1` as `2D`, configured XY extents for empty live piles, and anchor spans derived from configured feed/discharge neighborhoods or pile-relative defaults when the configuration stays simple.
- Reworked the circuit illustration layer so virtual piles render as taller accumulation objects in both `2D` and `3D`, pile anchors render as real feed/discharge footprints, and the simulator now stays profiler-only for historical playback instead of mixing downstream live fallbacks into selected profiler timesteps.

### 0.01.077

- Reworked same-stage circuit placement so disconnected subgraphs are now treated as separate vertical groups instead of one mixed ordering pass, which improves branch readability in the shared parametric layout used by the circuit views.
- Preserved strong vertical separation for fully connected same-stage branches while keeping the new grouping behavior for truly disconnected stage clusters, and extended layout regression coverage in both the presentation and diagram projections.
- Added a live-route-specific belt context panel so `/live` reads more clearly around the currently inspected belt and its immediate upstream, downstream, and same-stage neighborhood instead of leaning on the generic transport semantics panel as the default explanation.

### 0.01.076

- Added a reusable profiler-belt normalization layer so profiled downstream conveyor snapshots can be turned into the same dense belt-strip contract used by the live route without duplicating simulator-only parsing logic.
- Updated the simulator to load downstream physical belts from the selected profiler timestep when that historical snapshot exists locally, while falling back to the current live cache for unprofiled or unresolved route belts.
- Made the simulator route basis explicit at both card and route-summary level, so operators can see when a discharge path is fully profiler-aligned, fully live, or hybrid across mixed historical and current belt content.

### 0.01.075

- Reframed the simulator sidebar around discharge-route reading by moving central-pile internals, material-time reading, visible-cell counts, hovered-cell inspection, and route jumps into a dedicated secondary inspection section.
- Kept the active output route, route semantics, direct/merge/downstream hierarchy, and route basis as the default simulator reading so the route behaves more like discharge-decision support than another stockpile inspector.
- Extended simulator regression coverage to preserve the new route-first hierarchy while keeping central pile inspection available on demand.

### 0.01.074

- Reframed profiler detail mode so the primary sidebar stays historical and comparative, while material-time reading, mass distribution, profiled properties, hovered-cell inspection, and route jumps move into an explicit secondary snapshot-inspection section.
- Kept the dense summarized snapshot view available without removing capability, but made the route read more clearly as historical summary analysis instead of another stockpile-detail workspace.
- Added disclosure styling and updated profiler regression coverage to preserve the new history-first hierarchy.

### 0.01.073

- Reworked stage-local ordering so same-stage branches now keep connection-specific sort hints instead of relying only on generic node defaults, which preserves left-to-right fanout intent better when a stage contains deeper dependency columns.
- Switched stage placement from per-column vertical centering to a shared stage-wide band ordering, so downstream descendants keep a more stable top-to-bottom reading as the circuit grows across columns inside one stage.
- Added regression coverage for same-stage branch descendants in both the presentation model and the diagram layout, advancing `#101` beyond simple containment into clearer intra-stage flow ordering.

### 0.01.072

- Reframed the circuit inspector around structural reading by moving live-summary values behind a collapsed cross-route context disclosure instead of making them part of the default object reading.
- Kept the circuit route focused on stage role, transport semantics, configured anchors, and route switching, which advances `#94` by separating `Circuit` more clearly from the runtime inspection routes.
- Added regression coverage so the circuit inspector keeps the new structural-first reading while still exposing optional cross-route runtime reference when available.

### 0.01.071

- Added an explicit historical-delta panel to the profiler route so the selected snapshot can be compared against the previous stored step and against the beginning of available history instead of reading only as one isolated summary state.
- Added shared profiler-delta logic for numerical and categorical profiled values, including mapped categorical change states and snapshot-interval tracking, which pushes `#94` further by making `Profiler` more clearly historical and comparative than `Stockpiles`.
- Extended profiler regression coverage so the route keeps its new snapshot-to-snapshot comparison surface alongside the existing timeline and summarized detail views.

### 0.01.070

- Added a stockpile-only structure profile panel that summarizes fill ratio, footprint use, axis coverage, mass center, and mass-by-layer profile from the current dense pile cells instead of repeating generic route metadata.
- Reframed the stockpile route around current internal structure more explicitly in both page-level copy and the workspace sidebar, which pushes `#94` further by separating `Stockpiles` from the simulator and profiler reading surfaces.
- Added shared structural-summary logic and regression coverage so current pile structure remains a reusable route capability rather than one-off UI text.

### 0.01.069

- Replaced the fragile instanced-color `3D` stockpile path with a merged visible-voxel mesh, so the currently rendered pile cells now appear as real colored voxels instead of disappearing or collapsing into a black silhouette.
- Preserved hover inspection for the `3D` pile by mapping raycast triangle hits back to the originating rendered cell, keeping the `Cell Focus` panel usable after the render-path change.
- Added updated issue evidence for both numerical and categorical `3D` pile coloring so the open rendering issue can track the visible voxel result against the real local cache.

### 0.01.068

- Replaced the collapsed pseudo-histogram rendering with a literal SVG numerical histogram that exposes explicit x-axis value bins and y-axis represented mass per bin.
- Kept the underlying mass-weighted binning model intact, so each numerical bar still aggregates the property values of the represented blocks or cells weighted by their mass instead of their raw record count.
- Added reproducible visual evidence under `docs/issue-evidence/2026-04-03/` so the open `3D` voxel-color issue can show the before-black and after-visible rendering states from the real local cache.

### 0.01.067

- Replaced the `3D` pile voxel material path with an explicit shader-driven instance-color pipeline so dense stockpile views stop collapsing into black silhouettes when the selected property should color visible voxels.
- Added visual issue evidence for the stockpile `3D` color regression under `docs/issue-evidence/2026-04-03/` so the GitHub issue can reference reproducible before/after captures from the local cache.
- Tightened renderer coverage around the new shader path in the `Pile3DCanvas` component tests while keeping the dense instanced mesh rendering route intact.

### 0.01.066

- Added an explicit historical timeline panel to the profiler route so snapshot position, coverage span, peak mass, and snapshot-to-snapshot mass change become visible without leaving the page.
- Made the profiler timeline directly selectable, which keeps the route centered on historical navigation instead of relying only on the range slider and making detail mode feel too close to the stockpile workspace.
- Reduced content overlap in the profiler sidebar by keeping `History coverage` only in circuit mode while using the new timeline panel as the shared historical context block across both profiler modes.

### 0.01.065

- Reworked the shared circuit presentation around fixed-height stage columns so the diagram, `2D`, and `3D` views now read as one left-to-right stage board instead of mixing separate lane heuristics and post-hoc graph offsets.
- Changed within-stage placement to a simple dependency rule set: disconnected objects share the same stage column and distribute vertically, while same-stage receivers move one column to the right and keep sibling branches vertically separated.
- Rebuilt the diagram from that shared geometry and changed the `3D` circuit camera to a centered top-down start view so the first `3D` reading matches the `2D` board layout more closely.

### 0.01.064

- Reframed the live route around one inspected belt at a time so dense strip, histogram, material-time summary, and profiled-property evidence stay tied to the selected live belt instead of drifting with any non-belt graph focus.
- Kept graph selection available only as contextual reading inside the live workspace, with an explicit context panel when the focused object differs from the inspected belt.
- Added component coverage to lock the belt-first semantics and pushed `#94` further by separating live transport evidence from stockpile-style object inspection.

### 0.01.063

- Reworked the shared circuit stage-sizing pass so slot budgets now seed themselves from real anchor-driven flow and band hints instead of only from generic default lane assumptions.
- Strengthened branch-cluster spacing in the common presentation model so multi-output stages reserve more width, padding, vertical spread, and `3D` depth before the three circuit views are projected.
- Propagated the richer placement into `Diagram`, and tightened layout coverage so high-fanout stages must keep distinct downstream branch separation instead of letting sibling routes collapse onto the same projected slot.

### 0.01.062

- Reframed the profiler sidebar so `circuit` mode now reads as historical coverage and selected-timestep context instead of another dense object inspection surface.
- Reserved summarized rows, bands, cells, mass distribution, and profiled-property panels for `detail` mode, which makes the route separation between `Profiler` and `Stockpiles` more explicit.
- Advanced `#94` again by tightening the semantic boundary between historical comparison mode and object-detail mode inside the profiler route itself.

### 0.01.061

- Reframed the simulator sidebar around active discharge-route context instead of repeating a generic pile summary, which makes the route read more clearly as discharge interpretation rather than a second stockpile workspace.
- Removed duplicated central-pile property summary emphasis from the simulator inspector while keeping the central pile only as route anchor and hover context.
- Advanced `#94` by tightening the semantic boundary between the `Simulator` and `Stockpiles` routes.

### 0.01.060

- Added a shared material-time inspection layer so live belts, dense stockpiles, profiler detail snapshots, and simulator routes can switch from tracked-property reading to oldest-age, newest-age, or represented-span reading without duplicating renderer logic.
- Reworked the shared pile and belt renderers to accept reusable inspection-value accessors, which keeps voxel colors, strip colors, and mass-weighted histograms aligned under one inspection mode instead of splitting timestamp logic per page.
- Closed the remaining core gap in `#72` by turning represented material time into a first-class inspection mode across the routes that expose dense block or cell detail.

### 0.01.059

- Added a shared route-intent panel so every routed workspace now states its primary operator question, unique evidence, appropriate usage context, and route-switch boundary explicitly.
- Reworked route hero metrics so the circuit, live, stockpile, profiler, and simulator pages stop repeating the same headline context and instead emphasize route-specific reading purpose.
- Strengthened `#94` by making route semantics visible in the product itself instead of leaving the differentiation only in README copy.

### 0.01.058

- Reworked stage padding in the shared circuit presentation so automatic stage width, side breathing room, and minimum `3D` stage depth now scale with fanout and branch-cluster complexity instead of relying on one fixed frame.
- Propagated that richer stage sizing into the `Diagram` route so its stage boxes inherit stronger horizontal containment from the same parametric presentation model used by `2D` and `3D`.
- Tightened layout regression coverage to require meaningful inner stage margins and wider stage frames for fanout-heavy downstream stages.

### 0.01.057

- Reduced duplicated state blocks inside the live workspace by keeping the left column focused on selection/control context instead of repeating belt mass and timestamp that already exist in the inspector and content view.
- Reframed the simulator right sidebar around central-object detail instead of echoing the active-route summary that already exists in the main content column.
- Tightened the live/simulator column responsibilities so each route reads with a clearer control-to-content-to-inspection hierarchy.

### 0.01.056

- Reframed the circuit route back toward structural reading by removing detailed quality-value blocks from the circuit inspector.
- Added anchor-count and structural-reference emphasis in the circuit inspector so the route now prioritizes stage placement, modeled anchors, and flow roles over live-state inspection.
- Tightened circuit-route copy to make it explicit that detailed material content belongs to the live, stockpile, profiler, and simulator routes.

### 0.01.055

- Added a shared flow-semantics layer that derives operator-facing transport roles directly from the circuit graph instead of repeating route-specific ad hoc text.
- Reused that semantics in the circuit inspector, live-state sidebar, and simulator sidebar so virtual discharge contributors, measured transport, and merge accumulation nodes now read consistently across routes.
- Added grouped discharge-route semantics in the simulator so one selected output can explicitly read as part of a larger grouped reclaim structure when multiple outputs converge on the same merge or downstream conveyor context.

### 0.01.054

- Added a shared represented-material time layer so dense belts, stockpiles, profiler detail snapshots, and simulator routes can surface oldest/newest material timestamps from the current cache contract.
- Added reusable operator panels for material span and age, plus cell-level timestamp-span inspection in pile-centric views.
- Integrated central-object and active-route material-time summaries into the simulator without introducing duplicated timestamp logic across workspaces.

### 0.01.053

- Reworked grouped branch spacing so high-fanout discharge stages now reserve explicit inter-route gaps instead of reading like one uniform output strip.
- Added a flow-aware `3D` depth baseline that follows predecessor route zones, keeping downstream physical conveyors closer to the discharge path instead of snapping back to one fixed belt plane.
- Extended circuit layout coverage with grouped-pair spacing and downstream route-zone continuity assertions.

### 0.01.052

- Added an explicit profiler semantic layer that distinguishes circuit summary rows from detail-mode summary rows, summary bands, and summary cells.
- Reframed profiler side panels and histogram labels so historical summarized content stops reading like dense live state.
- Added profiler-focused unit and component coverage for the new summary-vs-dense semantics.

### 0.01.051

- Extracted a shared mass-weighted quality-summary module so numerical averages and dominant categorical values stop being recomputed with duplicated logic in server loaders, simulator lane aggregation, and profiler-backed simulator pile summaries.
- Rewired simulator lane snapshots and profiler-backed simulator summaries to reuse that shared quality-summary path, reducing the risk that one workspace drifts from another when categorical or weighted-mean semantics change.
- Added unit coverage for shared numerical and categorical mass-weighted summaries, including string-valued qualitative categories.

### 0.01.050

- Added a second branch-separation axis to the circuit presentation so high-fanout stages stop reading as one compact single row and instead occupy clearer parallel bands in `2D` and `3D`.
- Preserved downstream branch ordering by assigning stage-local slots monotonically from flow hints, which keeps multi-output pile routes stable from left to right instead of scrambling sibling outputs.
- Fed the shared circuit presentation back into diagram-mode node offsets so the abstract graph stops ignoring the same fanout/spatial logic used by the illustrative modes.

### 0.01.049

- Reworked the circuit presentation layout so stage widths expand from node/fanout demand instead of using one fixed width for every stage.
- Replaced the old visual-kind lane indexing with a flow-aware stage placement pass that uses graph sequence and anchor hints to spread downstream branches more coherently.
- Fed the new stage depth back into the `3D` illustration so stage boxes and ground extents follow the actual node spread instead of one fixed depth strip.

### 0.01.048

- Reframed the `3D` pile camera to fit dense real stockpile scenes more tightly so colored voxels occupy more of the visible canvas instead of reading as a distant dark mass.
- Disabled scene-axis clutter in the operator-facing pile canvas and slightly increased voxel fill so the selected property colors are easier to perceive on large piles.
- Hardened the instanced mesh update path with explicit bounds recomputation and no frustum culling so large remapped voxel scenes stay stable while their colors update.

### 0.01.047

- Removed repeated introductory inspector paragraphs from the `live`, `stockpiles`, `profiler`, and `simulator` workspaces where the same route semantics were already explained again by the adjacent `RouteBasisPanel`.
- Tightened the sidebar reading order so object identity leads directly into metrics and one explicit interpretation block instead of two overlapping explanations.
- Continued the intra-page duplication cleanup with a second narrow child slice under the broader page-content review.

### 0.01.046

- Removed duplicated `Source`, `Resolution`, and `Time basis` metrics from the `live`, `stockpiles`, `profiler`, and `simulator` page heroes when the same semantics were already explained again inside the workspace inspector.
- Kept route-entry hero metrics focused on dataset-level context while leaving route interpretation guidance in the reusable `RouteBasisPanel`.
- Narrowed one concrete overlap pattern identified under the broader page-differentiation and intra-page duplication review issues.

### 0.01.045

- Extracted a shared `Cell Focus` inspector so stockpile, profiler, and simulator routes stop duplicating hovered-cell rendering and selected-property formatting.
- Reused the shared quality-display formatter inside that inspector so mapped categorical labels and numerical formatting stay aligned across pile-centric workspaces.
- Added lightweight tracked development guidelines to document reuse, docstring, and testing expectations for future slices.

### 0.01.044

- Reframed each routed workspace around an explicit source-of-truth statement so live, stockpile, profiler, and simulator views stop reading like equivalent data products.
- Added route-basis summaries in page headers and workspaces to declare source, resolution, and time basis directly next to the active content.
- Clarified profiler history as reduced historical summary and simulator state as a mixed central-pile-plus-live-route view.

### 0.01.043

- Reworked simulator discharge routing so each selected pile output now reads as a staged route: direct reclaim belts first, virtual merge nodes second, and downstream conveyors last.
- Removed the repeated per-output lane stacks and replaced them with one direct-output selector plus one focused active-route workspace.
- Added active-output highlighting on the central pile anchors so the selected reclaim point stays visually tied to the route being inspected.

### 0.01.042

- Added a reusable mass-distribution builder and shared chart surface so live, stockpile, profiler, and simulator routes stop carrying divergent histogram logic.
- Corrected numerical bin assignment at interval boundaries so mass-weighted histograms keep stable operator meaning instead of drifting on floating-point edge cases.
- Extended categorical distribution views with proportional category charts and inspector-side distribution panels backed by the same mass-weighted aggregation path.

### 0.01.041

- Centralized operator-facing quality display labels so selectors, legends, inspectors, and profiled-property panels stop leaking technical ids when a definition arrives with a weak or broken label.
- Added shared fallback logic that humanizes technical quality ids instead of exposing raw `q_num_*` or `q_cat_*` keys in the UI.
- Added regression coverage for configured-label preservation and fallback display formatting.

### 0.01.040

- Switched stockpile `3D` voxel rendering to an unlit material so rendered colors stay faithful to the selected property instead of being distorted by scene lighting.
- Added component coverage to keep the `3D` pile renderer on the exact-color material path.
- Revalidated the stockpile `3D` property-switch browser flow in isolated Playwright execution on `3001`.

### 0.01.039

- Extended qualitative value handling so profiled properties, histograms, legends, and hover inspectors support both numeric-coded categories and string-valued category tokens.
- Changed dominant qualitative aggregation to stay mass-weighted across live, stockpile, profiler, and simulator views without collapsing categorical values into numeric assumptions.
- Added regression coverage for string-valued categorical summaries, distributions, and histograms, and tightened the runtime contract typing around mixed quality-value payloads.

### 0.01.038

- Fixed stack overflows caused by spreading large profiler row collections into `Math.max`, which could leave the simulator stuck in the `Pile content loads on demand` fallback state.
- Fixed the same overflow pattern in numerical color-domain derivation so dense simulator and stockpile views can still color voxels and cells safely.
- Replaced large-collection extrema calculations with iterative reducers and added regression coverage for high-cardinality row and value collections.

### 0.01.037

- Added an aggregated active-lane summary block to the simulator so the selected discharge route can be read as one reclaim path instead of only as separate downstream belt cards.
- Added one combined mass-weighted histogram per selected discharge lane, built from the downstream live belt content already loaded by the simulator.
- Added explicit release-status tracking so the last closed version and the currently active version are visible in tracked documentation.

### 0.01.036

- Rebuilt the simulator route around piles and virtual piles instead of a circuit-wide summary-first view.
- Added a central pile workspace that loads either profiler snapshots or current pile state, preserves dimensional rendering, and keeps pile anchors visible in the simulator itself.
- Added one discharge lane column per configured pile output, with downstream live belt block strips and mass-weighted histograms for each reachable belt on that route.
- Added simulator topology and workspace coverage so pile-centric discharge routing stays validated.

### 0.01.035

- Added an optional application-wide dark and light theme toggle with persistent local preference.
- Extended theme-aware surfaces across the routed shell, shared panels, diagram canvas, and `3D` views so light mode remains coherent instead of partial.
- Added component and browser coverage for theme switching and persistence across route navigation.

### 0.01.034

- Aligned qualitative dominant-category handling with categorical proportion semantics instead of relying only on `*_main` label counts.
- Added support for qualitative distribution groups driven by `q_cat_<src>_prop_<token>` and `..._prop_other` channels when the app-ready cache exposes them.
- Replaced the qualitative proportions tab with a histogram-style distribution view and added fallback messaging when the cache only carries predominant labels.

### 0.01.033

- Added stage boxes to the circuit diagram view so the staged structure remains visible in the graph representation.
- Derived diagram stage frames from the same staged circuit metadata used by the rest of the circuit workspace.
- Added diagram-stage coverage in graph layout tests and browser validation.

### 0.01.032

- Added one ground-level stage box per stage in the `3D` circuit illustration.
- Aligned the new stage footprints with the circuit presentation stage spans so they match the staged layout.
- Added regression coverage for the 3D stage footprint mapping.

### 0.01.031

- Expanded the vertical stage frame in the `2D` circuit illustration so each stage uses more of the available canvas height.
- Redistributed illustration lanes over the taller frame so belts, piles, and virtual objects occupy the vertical space more clearly.
- Added layout coverage to keep the taller stage frame and lane spread from regressing.

### 0.01.030

- Replaced the flat averaged-property list with a tabbed profiled-property panel in live, stockpile, and profiler workspaces.
- Added categorical dominant-name reporting using category maps, with mass-weighted dominance when raw block or cell detail is available.
- Added a selector-driven categorical proportion pie view with mass shares and labels for mapped categories.

### 0.01.029

- Switched pile property coloring to an adaptive local domain when visible values occupy only a narrow slice of the configured range.
- Added explicit legend and workspace notices when pile views use view-scaled contrast.
- Hardened runtime quality value coercion so numeric-like quality payloads do not silently collapse to fallback voxel colors.

### 0.01.028

- Added a second in-figure stockpile anchor layer for `2D` and `3D` pile views.
- Kept the fixed external feed and discharge tracks while adding near-pile feed and discharge markers at their horizontal anchor positions.
- Extended stockpile and profiler component coverage so the new in-figure anchor layer stays gated to dimensional pile views.

### 0.01.027

- Improved spatial separation in the illustrative 2D and 3D circuit layouts.
- Separated belts, piles, and virtual objects into clearer spatial lanes with distinct depth placement.
- Added layout coverage so mixed-stage belt and pile nodes no longer collapse into the same local area.

### 0.01.026

- Added a tracked `CHANGELOG.md` and linked release history from the README.
- Clarified how fixed-width version progression maps to merged delivery slices.

### 0.01.025

- Added a simulator-specific mass-weighted histogram for the active timestep.
- Added histogram bin controls for numerical properties in the simulator workspace.
- Added unit and component coverage for simulator histogram behavior.

### 0.01.024

- Added the new `/simulator` routed workspace for timestep-oriented scenario exploration.
- Extended navigation and workspace jumps so profiled objects can open the simulator route directly.

### 0.01.023

- Completed profiler detail-mode pile anchors and hovered cell inspection.
- Added component coverage for profiler detail interaction.

### 0.01.022

- Compressed the hero metric summary layout so route-level runtime cards use horizontal space more efficiently.

### 0.01.021

- Added hovered stockpile cell inspection across pile views.

### 0.01.020

- Rendered feed and discharge anchors directly on stockpile views.

### 0.01.019

- Exposed configured anchor inventories in the circuit inspector.

### 0.01.018

- Added connected upstream and downstream sequence highlighting in the circuit views.

### 0.01.017

- Rendered multiple configured pile anchors in the circuit illustrations.

### 0.01.016

- Added cross-workspace inspection jump links with context-preserving navigation.

### 0.01.015

- Preserved object and property context across route transitions.

### 0.01.014

- Stabilized runtime behavior and warning handling around local rendering and validation flows.

### 0.01.013

- Expanded runtime coverage and local operator guidance.

### 0.01.012

- Deferred heavy stockpile and profiler loads to improve initial route responsiveness.

### 0.01.011

- Added mass-weighted live belt histograms.

### 0.01.010

- Reflected pile anchors in circuit illustrations.

### 0.01.009

- Added illustrative circuit overview modes.

### 0.01.008

- Adopted the fixed-width application versioning scheme.
