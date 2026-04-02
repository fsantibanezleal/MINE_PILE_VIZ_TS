# Changelog

All notable tracked releases for this repository are recorded here.

## Versioning Policy

- Version format uses fixed-width `x.xx.xxx`.
- The rightmost block increments for each merged tracked slice.
- The middle block is reserved for broader product milestones when a larger grouped phase is intentionally declared.
- The leftmost block is reserved for major baseline shifts.

## Release History

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
