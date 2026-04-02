# Mine Pile Visualizer

Local-first web application for visualizing circuit topology, live runtime state, stockpile content, and profiler history produced by a mineral tracking simulation engine.

## Overview

This repository contains a full-stack web application built with:

- Next.js
- React
- TypeScript
- Node.js
- pnpm
- React Flow
- React Three Fiber

The application is intentionally decoupled from original trace artifacts. At runtime it only consumes a sanitized app-ready cache under `.local/app-data/v1/`.

## Routes

- `/circuit`: staged circuit topology and object inspection
- `/live`: current belt state and block strip inspection
- `/stockpiles`: 1D, 2D, and 3D pile views with property selection
- `/profiler`: history playback in circuit mode or object-detail mode

## Repository Boundaries

- `data/` is local-only and ignored by Git.
- `.local/` is local-only and ignored by Git.
- This repository does **not** keep source-trace serializers.
- The tracked code documents and consumes the app-ready contract only.
- Any temporary conversion from source data into `.local/app-data/v1/` must stay outside tracked code.

## App Data Contract

The runtime expects a local cache rooted at:

```text
.local/app-data/v1/
```

The required folder layout, JSON files, Arrow schemas, and semantics are documented in:

```text
docs/app-data-contract.md
```

## Quick Start

### 1. Install dependencies

```powershell
pnpm install
```

### 2. Generate or place the local app-ready cache

```text
.local/app-data/v1/
```

The cache must follow `docs/app-data-contract.md`.

### 3. Run the app

```powershell
pnpm dev
```

Open:

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

### End-to-end tests

```powershell
pnpm test:e2e
```

### Production build

```powershell
pnpm build
```

## Project Structure

```text
app/
components/
docs/
lib/
tests/
types/
```

## Current Version

`0.1.0`
