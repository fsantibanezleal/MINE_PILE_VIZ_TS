# Changelog

All notable tracked releases for this repository are recorded here.

## Versioning Policy

- Version format uses fixed-width `x.xx.xxx`.
- The rightmost block increments for each merged tracked slice.
- The middle block is reserved for broader product milestones when a larger grouped phase is intentionally declared.
- The leftmost block is reserved for major baseline shifts.

## Release Status

- Closed release baseline: `0.01.056`
- Active tracked version: `0.01.057`

## Release History

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
