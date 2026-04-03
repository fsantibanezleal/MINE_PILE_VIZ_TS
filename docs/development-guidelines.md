# Development Guidelines

This repository is intended to grow through small tracked slices without turning route workspaces into isolated islands. The baseline expectation is that shared semantics, formatting rules, and inspection patterns are implemented once and reused across routes.

## Reuse Strategy

- Extract a shared component when the same operator-facing pattern appears in two or more workspaces with the same semantics.
- Keep route-local orchestration local. Data fetching order, route query state, and workspace-specific flow logic should stay inside the route workspace unless another route needs the same behavior.
- Prefer extracting shared formatting and aggregation helpers before copying display logic between routes.

## Existing Shared Building Blocks

- `components/ui/route-basis-panel.tsx`
  Declares source, resolution, and time basis for a route or inspector section.
- `components/ui/profiled-properties-panel.tsx`
  Renders quantitative, dominant categorical, and proportional property summaries from the shared quality contract.
- `components/ui/mass-distribution-chart.tsx`
  Renders mass-weighted numerical histograms and categorical proportion charts from the shared distribution model.
- `components/ui/cell-focus-panel.tsx`
  Renders hovered-cell coordinates, mass, selected-property value, and supporting quality values across pile-centric workspaces.
- `lib/quality-display.ts`
  Central source for operator-facing quality labels and value formatting.

## Shared Quality Rules

- Never expose raw technical ids such as `q_num_*` or `q_cat_*` directly in the UI when the quality definition provides a usable label.
- Numerical and categorical values must always go through the shared quality-formatting helpers so mapped category labels stay consistent.
- Mass-distribution views must remain mass-weighted. If a new route needs a distribution, build it from shared distribution helpers instead of inventing a new chart contract.

## Documentation And Docstrings

- Keep all tracked documentation in English.
- Add docstrings to shared helpers and reusable UI components when their purpose is not obvious from the name alone.
- Avoid noise comments. Prefer a short docstring on the reusable module over repeating inline comments inside every caller.
- When a route has important operator-facing assumptions about source, resolution, or time basis, document them in the route and in `README.md`.

## Testing Expectations

- New shared components should get at least one focused component test.
- When extracting logic from a route workspace, preserve or extend the existing route tests instead of only testing the helper in isolation.
- Keep `pnpm lint`, `pnpm test`, and `pnpm build` green before opening the PR.
