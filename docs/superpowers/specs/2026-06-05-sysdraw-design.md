# SysDraw — Design Spec

**Date:** 2026-06-05
**Status:** Approved (brainstorming complete)

> **Historical note:** This spec predates two later amendments (see the plan's "Plan Amendments" section): the product was renamed **SchemaMorph** (file extension `.schemamorph`, legacy `.schemaflip` and `.sysdraw` still accepted) and protocols became a grouped structure (6 groups, 16 protocols). Catalog shipped with 11 archetypes / 32 tools.

## Overview

SysDraw is a frontend-only, open-source web app: an interactive canvas optimized for system design interviews and architectural planning. Killer feature: a dual-mode visibility toggle that hot-swaps every node between abstract engineering symbols ("Minimalist") and recognizable vendor logos ("Real Tools") while preserving positions, configuration, and connections.

No backend, no database. Client-side state, local file persistence, free static hosting.

The project is community-maintained open source: adding a new tool (or archetype) must require **zero code changes** — JSON catalog entries only.

## Stack

| Concern | Choice | Rationale |
|---|---|---|
| Build | Vite + React 18 + TypeScript | Pure static SPA, fastest path to GitHub Pages/Vercel |
| Canvas | React Flow (`@xyflow/react` v12) | Custom node rendering makes the dual-mode swap a conditional render; built-in edges, handles, zoom/pan, minimap |
| State | Zustand | Clean React Flow integration; snapshot history middleware for undo/redo |
| Styling | Tailwind CSS + shadcn/ui | Dark-mode-first design |
| Icons | `simple-icons` (CC0) | 3000+ brand SVGs, no trademark risk in an OSS repo, monochrome paths tinted with brand colors, runtime lookup by slug |
| Validation | zod | `.sysdraw` import validation + catalog CI validation |
| Auto-layout | dagre | Layered hierarchical layout fits system diagrams; tiny, sync; layout is a pure function so engines are swappable |
| Testing | Vitest + React Testing Library | TDD throughout |

## Project Structure

```
sysdraw/
├── src/
│   ├── components/
│   │   ├── canvas/        # React Flow wrapper, custom node + edge components
│   │   ├── sidebar/       # palette: archetypes, expandable tool variants, drag/click spawn
│   │   ├── toolbar/       # mode toggle, file I/O, settings, undo/redo, PNG export, tidy
│   │   └── config-panel/  # right panel: selected node editing
│   ├── catalog/           # archetypes.json, tools.json, protocols.json (community-editable)
│   ├── nodes/             # catalog loading, icon resolution, fallback rendering
│   ├── state/             # Zustand store (nodes, edges, viewMode, nodeStyle, selection, history)
│   ├── hooks/             # useFileIO, useAutoSave, useUndoRedo, useKeyboardShortcuts
│   └── lib/               # .sysdraw zod schema, serialization, dagre layout module
├── docs/
└── .github/workflows/     # CI: typecheck, lint, test, catalog validation, build
```

## Community Tool Catalog (no-code extensibility)

### tools.json

```jsonc
{
  "mysql": {
    "archetype": "database",
    "label": "MySQL",
    "iconSlug": "mysql",        // simple-icons slug, resolved at runtime
    "brandColor": "#4479A1"
  }
}
```

- Adding a tool = adding one JSON entry. No imports, no components, no TS.
- Icon resolution is dynamic by `iconSlug`.
- Tool missing from simple-icons → optional `"svgPath"` field (inline SVG path data); otherwise fallback rendering: archetype symbol + tool-initials badge. Rendering never crashes on a bad icon.

### archetypes.json

Archetypes are also data-driven: `{ key, label, brandColor, symbolSvg (inline SVG string), defaultTool }`. Community can add new archetypes (CDN, storage, search…) without code.

Initial archetypes and tools:

| Archetype | Minimalist symbol | Initial tools |
|---|---|---|
| database | cylinder | MySQL, PostgreSQL, MongoDB |
| queue | horizontal partitioned block | Apache Kafka, RabbitMQ, AWS SQS |
| compute | rectangle | Docker, Kubernetes, AWS EC2 |
| cache | shallow stacked blocks | Redis, Memcached |
| gateway | splitting-arrow block | NGINX, AWS ALB |

### protocols.json

Edge protocol presets: `HTTPS, gRPC, WebSocket, TCP, CDC Stream`. Plain JSON list; free-text labels also allowed.

### Guardrails

- CI validates both catalogs with zod and verifies every `iconSlug` exists in simple-icons; a bad entry fails the PR with a clear message.
- `CONTRIBUTING.md` documents the "add a tool = 4-line JSON entry" flow.

## Data Model

```ts
type SysNode = {
  id: string;
  type: 'sysNode';                    // single React Flow custom node type for all archetypes
  position: { x: number; y: number };
  data: {
    archetype: string;                // key into archetypes.json — open string, validated at runtime
    concreteTool: string;             // key into tools.json
    label: string;
    customProperties?: Record<string, string>;
  };
};

type SysEdge = {
  id: string;
  source: string;
  target: string;
  data: { label?: string; protocol?: string };  // protocol from presets or free text
};
```

`archetype`/`concreteTool` are open strings (not closed unions) — required for no-code catalog extensibility. Validation happens against the loaded catalog at runtime, not at the type level.

## Dual-View Mode

Global `viewMode: 'minimalist' | 'real'` in the store, toggled from a segmented control centered in the toolbar (hotkey `M`).

- **Minimalist:** node icon = archetype `symbolSvg`; sublabel = archetype name.
- **Real Tools:** node icon = simple-icons logo tinted `brandColor`; sublabel = tool label. Palette category icons swap to a representative tool logo.
- Swap touches rendering only — positions, edges, labels, selection, and config are untouched.

## Node Style Setting

`nodeStyle: 'symbol' | 'card' | 'plate'` — global setting (settings menu), default **`card`**:

- `symbol` — bare symbol/logo with label below (textbook diagram look)
- `card` — rounded card: icon + label + sublabel (default; chosen in brainstorming)
- `plate` — large symbol on faint tinted plate, label below

Same SVG assets in all three; only the container differs. Persisted in localStorage and `.sysdraw` meta.

## UI Layout

- **Top toolbar:** logo · mode toggle (center) · undo/redo · Tidy (auto-layout) · Load · Export `.sysdraw` · PNG export · settings · GitHub repo link (icon button, opens repo in new tab — repo URL from a single config constant)
- **Left palette:** 5+ archetype rows; click `▸` expands tool-variant submenu (available in both modes); click or drag spawns a node
- **Canvas:** React Flow viewport — zoom, pan, connect via handles; dotted background
- **Right config panel:** slides in on node selection — label, archetype dropdown, concrete tool dropdown, custom key/value properties. Hidden when nothing selected. Changing archetype resets `concreteTool` to that archetype's `defaultTool`.
- **Edges:** drag between handles; click label → inline edit + protocol preset chips

## Auto-Layout ("Tidy")

- dagre layered layout; toolbar button recomputes all positions
- Direction: left→right default; top→bottom available in settings
- Animated transition to new positions
- One history entry — Ctrl+Z restores the exact previous layout
- Implemented as a pure function `(nodes, edges, options) → positions` in `lib/` so the community can add other engines later

## Persistence

### .sysdraw file format (v1.0.0)

```jsonc
{
  "version": "1.0.0",
  "meta": { "title": "...", "lastModified": "ISO-8601", "viewMode": "minimalist", "nodeStyle": "card" },
  "nodes": [ /* SysNode[] */ ],
  "edges": [ /* SysEdge[] */ ]
}
```

- **Export:** serialize state → Blob → anchor download (`<title>.sysdraw`)
- **Import:** FileReader → JSON.parse → zod validation → hydrate store
- Invalid file → toast with the specific error ("missing `nodes`", "node 3: missing position"); current state untouched
- Unknown `concreteTool`/`archetype` (catalog drift) → node renders fallback symbol + warning badge; file still loads
- Forward compatibility: unknown extra fields ignored

### Auto-save

localStorage (state is small JSON; IndexedDB unnecessary), debounced 500 ms, key `sysdraw:autosave`. Restored on load. "New canvas" clears it. Corrupt stored state → discard, start fresh, toast.

## Undo/Redo

Snapshot-based history in Zustand over `nodes` + `edges` only (not viewMode/nodeStyle). Capped at 100 entries. Drag = one entry (snapshot on drag-end). Ctrl+Z / Ctrl+Shift+Z.

## Keyboard Shortcuts

Delete/Backspace (delete selection), Cmd/Ctrl+D (duplicate), Cmd/Ctrl+A (select all), arrow keys (nudge), Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z (undo/redo), `M` (mode toggle).

## PNG Export

`html-to-image` on the React Flow viewport; respects current view mode and node style.

## Error Handling Summary

| Failure | Behavior |
|---|---|
| Invalid `.sysdraw` import | Specific toast, state untouched |
| Unknown archetype/tool in file | Fallback symbol + warning badge, file loads |
| Missing/bad icon slug | Initials-badge fallback, never crash |
| Corrupt localStorage | Discard, fresh start, toast |
| Bad catalog entry in PR | CI fails with clear message |

## Testing (TDD)

- **Unit:** `.sysdraw` serialization round-trip; zod validation cases (valid, missing fields, unknown archetype, extra fields); history stack (push/undo/redo/cap/drag coalescing); catalog validation; layout function determinism
- **Component (RTL):** node renders per mode × style; toggle swaps icon/sublabel without moving nodes; palette spawns nodes; config panel edits propagate; edge label editing
- **CI (GitHub Actions):** typecheck + lint + test + catalog validation + build

## Hosting & Deployment

- **Vercel** (Hobby tier — free for OSS/non-commercial): zero-config Vite deploys, global CDN, custom domain.
- **PR preview deploys** are a core part of the community workflow: a contributor adding a tool to the JSON catalog gets a live preview link so reviewers can see the rendered logo before merging.
- Deploy on push to `main`; CI (typecheck/lint/test/catalog validation/build) must pass first.

## Security

Frontend-only app — no backend, no auth, no user data leaves the browser. Remaining surface:

- **File import is the attack vector.** `.sysdraw` files may come from strangers:
  - All user-supplied strings (labels, properties, protocols) rendered via React's default escaping — `dangerouslySetInnerHTML` is never used on imported content.
  - zod schema strips unexpected fields on import (consistent with forward compatibility: unknown fields ignored, never executed).
  - File size cap (5 MB) prevents parse-freeze DoS.
  - Imported nodes reference catalog entries **by key only** — imported files can never carry SVG or executable content.
- **Catalog `symbolSvg`** is repo-controlled inline SVG, rendered only from the bundled catalog, gated by PR review + CI validation.
- **CSP** via `vercel.json` headers: `default-src 'self'`; simple-icons bundled at build time (no runtime CDN), so a strict policy holds. Single exception: the analytics script domain.
- **Supply chain:** committed lockfile, Dependabot, `npm audit` in CI.
- **Privacy:** no cookies, no accounts, diagrams stay in the browser (localStorage only) — no consent banner required.

## Analytics

- **Vercel Web Analytics** (free on Hobby): cookieless, GDPR-friendly, one-line setup.
- Page views only. Canvas content is never transmitted anywhere.

## Out of Scope (v1)

Real-time collaboration, cloud storage, freehand drawing, mobile/touch optimization, multiple pages/tabs per document, image/SVG export beyond PNG.
