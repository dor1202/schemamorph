# SchemaMorph — Agent Maintenance Guide

## What is SchemaMorph

SchemaMorph is a frontend-only system-design canvas built with React, React Flow
(@xyflow/react), and Zustand. Its defining feature is a dual-view toggle (hotkey
`M`): every node flips between abstract engineering symbols (cylinder = database,
partitioned block = queue) and real vendor logos — positions, arrows, and labels
untouched. There is no backend; all state lives in the browser.
File format: `.schemamorph` (JSON, v1.3.0); legacy `.schemaflip`/`.sysdraw`
extensions are accepted without migration.

---

## Architecture

**State layer** — `src/state/store.ts`: single Zustand store (`useStore`) holds
nodes, edges, viewMode, nodeStyle, layoutDirection, theme, locked, panelSuppressed,
and undo/redo history (100-deep `Snapshot[]`). `setAll` is the canonical bulk-load
entry point (called after file import and autosave restore); it derives boundary
grouping (`parentId`) geometrically from node centers, then normalizes zIndex by
type. Theme and sidebar widths are persisted in localStorage and are NOT part of
the `.schemamorph` format. `locked` IS persisted in the file (`meta.locked`).
`src/state/share-boot.ts` runs at app startup: if a `#v=1,…` hash is present it
decompresses the payload and calls `setAll` (beating autosave restore); the hash
is then stripped from the URL.

**Canvas** — `src/components/canvas/`: React Flow wrapper (`Canvas.tsx`) + six
node renderers (`SysNode`, `NoteNode`, `BoundaryNode`, `StepNode`, `ArrowNode`,
`SysEdge`). Drag-and-drop from palette uses MIME type
`application/sysdraw-node`.

**Sidebar** — `src/components/sidebar/Palette.tsx`: draggable tool rows; palette
search is mode-aware (real mode searches tool labels, minimalist mode searches
archetype labels).

**Toolbar** — `src/components/toolbar/Toolbar.tsx`: mode toggle, node style
selector, file I/O buttons, theme toggle, lock button, and "Copy share link"
IconButton (left of lock). `MermaidDialog.tsx` is a paste / .mmd-file dialog
opened from the settings popover File group (disabled when locked).
Undo/Redo buttons live in the canvas zoom-controls cluster (bottom-left, after
Fit view). Tidy is in the left Palette above the component list.
Lock mode collapses the left palette and hides the config overlay (derived;
unlock restores).

**Config panel** — `src/components/config-panel/ConfigPanel.tsx`: overlay shown on
node selection; edits label, tool, typed archetype attributes (`customProperties`),
and note/boundary-specific fields.

**Catalog** (`src/catalog/`) — data-driven JSON:
- `archetypes.json`: 22 archetypes; each entry has `label`, `brandColor`,
  `symbolViewBox`, `symbolSvg` (inline SVG, stroke-based), `defaultTool`, and an
  optional `attributes[]` array of typed per-archetype metadata pins.
- `tools.json`: 190 tools; each entry has `archetype`, `label`, and at least one of
  `iconSlug` (simple-icons slug) or `svgPath` (raw 24×24 path). Every tool must
  have a visible mark — bare initials are not acceptable for new entries.
- `protocols.json`: grouped edge protocol presets — `Record<groupName, string[]>`
  (e.g. `"HTTP": ["HTTPS", "REST", ...]`); flattened to `protocols[]` in `catalog.ts`.

**Lib** (`src/lib/`):
- `types.ts`: `AppNode` discriminated union
  (`SysNode | NoteNode | BoundaryNode | StepNode | ArrowNode`),
  `SysEdge`, `ViewMode`, `NodeStyle`, `LayoutDirection`.
- `catalog.ts`: `getArchetype`, `getTool` accessors.
- `catalog-schema.ts`: Zod schema for catalog JSON (used by `validate:catalog`).
- `sysdraw-file.ts`: Zod parse/serialize (`parseSysdraw`, `serializeSysdraw`,
  `SYSDRAW_VERSION = "1.3.0"`, `SysdrawFile` type). Internal names keep `sysdraw`
  prefix intentionally — renaming would churn every test with no user-visible gain.
- `icons.ts`: `resolveToolIcon` (iconSlug → svgPath → null) + `toolInitials`
  fallback badge.
- `icons.generated.ts`: generated icon subset — NEVER hand-edit; regenerate with
  `npm run generate:icons` after changing any `iconSlug`.
- `layout.ts`: `layoutPositions(nodes, edges, direction)` wrapping dagre.
- `color.ts`: luminance utilities for brand-color legibility.
- `sidebar-prefs.ts`: read/write sidebar widths from localStorage.
- `autosave.ts`: localStorage autosave with debounce; restored on boot.
- `mermaid-import.ts`: regex flowchart parser; maps Mermaid node shapes to
  archetypes and builds `SysNode`/`SysEdge` arrays ready for `setAll`.
- `share-url.ts`: deflate-raw + base64url encode/decode; writes/reads `#v=1,<payload>`
  hash; enforces 8 KB cap with a user-facing warning.
- `grouping.ts`: `absolutizeAll` / `applyGrouping`; computes `parentId` by
  center-inside membership; boundaries-first ordering for React Flow.

**Mobile** — `src/components/mobile/`: `BottomSheet` primitive (3-detent drag-to-expand), `PaletteSheet` (arm-and-tap placement via `store.armedTool`; mode-aware: minimalist = archetype-level arm with compact bar, real = chips→tool grid), `ConfigSheet` (reuses `SelectionConfig` from ConfigPanel), `PhoneTopBar` (mode toggle, marquee-select toggle, lock, overflow menu with all file I/O, app version footer in settings popover). `DeleteBin` (drag node onto it to delete; appears while dragging, replaces the always-visible palette peek bar). `CanvasHint` (state-aware hint line, both desktop and phone). `ZoomIndicator` (transient % pill, coarse-pointer only). Phone ⋯ menu accessible via `__APP_VERSION__` Vite define (package.json version, now 0.1.0). `App.tsx` branches on `useIsPhone()` in the return path (all hooks stay unconditional). `Canvas.tsx` flips `panOnDrag`/`selectionOnDrag` props dynamically when `useIsCoarsePointer()` is true, and handles `armedTool` placement in `onPaneClick`.

**Hooks** (`src/hooks/`):
- `useFileIO.ts`: export/import `.schemamorph` files and PNG; `importSysdrawText`
  is the pure testable import core; `shareLink` generates and copies a share URL.
- `useKeyboardShortcuts.ts`: global hotkeys; lock-aware variants tested separately.
- `useMediaQuery.ts`: `useMediaQuery(query)` — `useSyncExternalStore` over `matchMedia`; `useIsPhone()` (<640 px), `useIsTablet()`, `useIsCoarsePointer()` derived helpers.

**Scripts** (`scripts/`):
- `validate-catalog.ts`: checks catalog integrity and icon-subset freshness.
- `generate-icons.ts`: rebuilds `icons.generated.ts` from `tools.json` iconSlugs.

---

## Directory Map

```
src/
  App.tsx                        # root component; sidebar resize logic
  catalog/
    archetypes.json              # 22 archetypes with symbolSvg + attributes
    tools.json                   # 190 tools (iconSlug / svgPath)
    protocols.json               # edge protocol presets
  components/
    canvas/
      Canvas.tsx                 # React Flow wrapper, DnD drop target
      SysNode.tsx                # component node (symbol / card / plate)
      NoteNode.tsx               # sticky-note annotation (with size variant)
      BoundaryNode.tsx           # resizable dashed grouping region
      StepNode.tsx               # numbered step marker circle / free-text pill
      ArrowNode.tsx              # resizable free-form diagonal arrow
      SysEdge.tsx                # custom edge with label + protocol color
      CanvasHint.tsx             # state-aware hint line (desktop + phone)
      ZoomIndicator.tsx          # transient zoom % pill (coarse-pointer only)
    config-panel/
      ConfigPanel.tsx            # overlay for node/edge editing; exports SelectionConfig
    mobile/
      BottomSheet.tsx            # 3-detent drag sheet primitive
      PaletteSheet.tsx           # phone palette (arm-and-tap placement, mode-aware)
      ConfigSheet.tsx            # phone config editor (wraps SelectionConfig)
      PhoneTopBar.tsx            # phone top bar (mode toggle, file I/O menu)
      DeleteBin.tsx              # drag-to-delete target (appears while dragging)
    sidebar/
      Palette.tsx                # draggable tool palette; Tidy button at top
      palette-icons.tsx          # ArchetypeGlyph + ToolIcon shared renderers (dangerouslySetInnerHTML site)
    toolbar/
      Toolbar.tsx                # top toolbar with all action buttons
      MermaidDialog.tsx          # paste / .mmd-file import dialog
    ui.tsx                       # shared primitive UI components
  hooks/
    useFileIO.ts                 # file export/import/PNG/shareLink
    useKeyboardShortcuts.ts      # global hotkeys
    useMediaQuery.ts             # useMediaQuery, useIsPhone, useIsTablet, useIsCoarsePointer
  lib/
    types.ts                     # TypeScript types
    catalog.ts                   # catalog accessors
    catalog-schema.ts            # Zod schemas for catalog JSON
    sysdraw-file.ts              # file parse/serialize (Zod)
    icons.ts                     # icon resolution
    icons.generated.ts           # GENERATED — do not edit by hand
    layout.ts                    # dagre layout wrapper
    color.ts                     # luminance utilities
    sidebar-prefs.ts             # sidebar width localStorage persistence
    autosave.ts                  # localStorage autosave
    mermaid-import.ts            # regex Mermaid flowchart parser → nodes/edges
    share-url.ts                 # deflate-raw + base64url encode/decode; #v=1,…
    grouping.ts                  # parentId derivation (center-inside membership)
  state/
    store.ts                     # Zustand store (single source of truth)
    autosave.ts                  # autosave subscriber + restore
    share-boot.ts                # boot: decode #v=1,… hash → setAll; strips hash
  test/
    setup.ts                     # jsdom mocks: RF, ResizeObserver, localStorage
  config.ts                      # constants (HISTORY_CAP, GITHUB_REPO_URL, etc.)
scripts/
  validate-catalog.ts            # catalog CI gate
  generate-icons.ts              # regenerates icons.generated.ts
docs/
  file-format.md                 # .schemamorph format spec (versioned)
  ROADMAP.md                     # specced deferred features
  superpowers/                   # historical design-trail specs/plans
```

---

## Commands

```bash
npm run dev               # Vite dev server → http://localhost:5173
npm run test              # vitest run (~670 tests)
npm run test:watch        # vitest watch mode
npm run typecheck         # tsc -b --noEmit
npm run lint              # eslint .
npm run format:check      # prettier --check src scripts
npm run format            # prettier --write src scripts
npm run validate:catalog  # catalog integrity + icon-subset freshness check
npm run generate:icons    # regenerate src/lib/icons.generated.ts
npm run build             # tsc -b && vite build → dist/
npm run preview           # preview production build
```

### THE GATE — must pass before any handoff

```bash
npm run typecheck && npm run lint && npm run format:check && npm run validate:catalog && npm run test && npm run build
```

No exceptions. CI runs the same seven checks plus PR-title lint.

---

## Conventions

**TDD is mandatory.** Write the failing test first, implement, confirm green.
No behavior change ships without a test.

**Formatting.** Prettier with default settings (double quotes, 2-space indent).
Run `npm run format` to fix; `npm run format:check` is a gate.

**Dependencies.** No new runtime dependency without a justification comment in the
PR description. The current bundle is ~600 KB min / ~195 KB gzip — keep it lean.

**Commit / PR titles.** Conventional Commits:
`feat | fix | docs | catalog | chore | refactor | test | ci | perf | style | build`
followed by `: <summary>`. CI rejects non-conforming PR titles.

**TypeScript.** Strict mode. No `any` without an explanatory comment.

---

## Catalog Rules

Adding a tool:
1. Add a JSON entry to `src/catalog/tools.json`:
   `"slug": { "archetype": "...", "label": "...", "iconSlug": "slug", "brandColor": "#HEX" }`
   Current catalog has **190 tools**.
2. Every tool MUST have a visible mark. Priority: `iconSlug` (simple-icons) →
   `svgPath` (inline 24×24 path) → family glyph (use a sibling tool's svgPath that
   represents the product family). Bare initials are never acceptable for new entries.
3. If you added or changed an `iconSlug`, run `npm run generate:icons` to regenerate
   `icons.generated.ts`. CI will fail if the file is stale.
4. Run `npm run validate:catalog`. Fix everything it flags.

Adding an archetype:
- Add to `archetypes.json` with `label`, `brandColor`, `symbolViewBox`, `symbolSvg`
  (inline SVG, `stroke="currentColor"`), `defaultTool`, and optional `attributes[]`.
- Each attribute: `key` (lowercase-hyphenated), `label`, `type`
  (`enum | number | text | boolean`). Enum requires non-empty `options[]`; text
  may include `suggestions[]`.

---

## Hard Guardrails

**`dangerouslySetInnerHTML`** is used in exactly 2 places for catalog `symbolSvg`
(SVG from archetypes.json, not user data): `palette-icons.tsx` and `SysNode.tsx`.
Never add new call sites. Never pass user-supplied strings to it.

**Imported file strings** are always React-escaped (zod parse strips unknown fields;
rendered via JSX text nodes, not innerHTML).

**`.schemamorph` format changes** require: bump `SYSDRAW_VERSION` in
`src/lib/sysdraw-file.ts`, add a migration note in `docs/file-format.md`, maintain
backward-compatibility (v1.0 → v1.1 → v1.2 → v1.3 were all additive).
Current version: **1.3.0**.

**`parentId` is runtime-only, never serialized.** `grouping.ts` derives it on
every `setAll` call from node-center geometry; the `.schemamorph` format stores
only absolute positions.

**`icons.generated.ts` is generated.** Never hand-edit it. Run
`npm run generate:icons` instead.

**localStorage vs. file format:**
- localStorage only (never in `.schemamorph`): theme (`schemamorph:theme`), sidebar
  widths, autosave draft.
- File format only (in `meta`): `viewMode`, `nodeStyle`, `locked`.

**`locked`** is stored in `meta.locked` in the `.schemamorph` file. When `locked` is
true, editing operations are blocked; the Toolbar and keyboard shortcuts respect it.

---

## Z-Order Policy

| Node type                               | zIndex      |
|-----------------------------------------|-------------|
| `boundaryNode`                          | -1 (back)   |
| `sysNode`                               | 0 (RF default) |
| `noteNode`, `stepNode`, `arrowNode`     | 1 (front) |

Set at creation (`addBoundary`/`addNote`/`addStep`/`addArrow` in
`store.ts`) and NORMALIZED by type in `setAll` on every file import/restore —
zIndex is derived policy, never stored in the file format. Boundaries use RF
parent-child grouping (`parentId`) derived geometrically by `grouping.ts`;
boundaries are always ordered before children in the `nodes` array so RF renders
them correctly. The -1 zIndex is preserved even for boundary nodes that have
children. `parentId` is NOT stored in the file — `setAll` re-derives it on every
load from absolute positions. Tidy layout absolutizes child positions before
computing post-layout bounding boxes, then re-applies grouping.

`Canvas.tsx` sets `elevateNodesOnSelect={false}` on the `<ReactFlow>` component to
prevent React Flow's default behaviour of bumping a selected node's zIndex above all
others — which would break the boundary-at-back / note-at-front policy above.

---

## Testing Notes

- Test framework: Vitest + @testing-library/react, jsdom environment.
- `src/test/setup.ts` provides: `@testing-library/jest-dom` matchers, jsdom mocks
  for React Flow (`ResizeObserver`, `DOMMatrixReadOnly`, `HTMLElement` geometry
  stubs), and a Node 25 localStorage polyfill (native Node 25 `localStorage` lacks
  `.clear()`).
- React Flow edge geometry cannot be tested in jsdom — edge tests (`SysEdge.test.tsx`)
  render the component directly without a full RF graph.
- Lock-aware tests are in separate `*-lock.test.ts(x)` files.
- ~670 tests as of this revision — exact count drifts; `npm run test` is the source of truth.

---

## Internal Naming Note

The following identifiers intentionally keep the `sysdraw` prefix (original project
name). Renaming would churn every test for zero user-visible gain:
`sysdraw-file.ts`, `serializeSysdraw`, `parseSysdraw`, `sysdrawFileSchema`,
`SysdrawFile`, `SYSDRAW_VERSION`, `DND_MIME = 'application/sysdraw-node'`,
`importSysdrawText`.

---

## Key Reference Docs

- `docs/file-format.md` — `.schemamorph` format spec (current: v1.3.0)
- `docs/ROADMAP.md` — specced deferred features (Mermaid import, share-by-URL, etc.)
- `NEXT_STEPS.md` — deployment and community ops checklist
- `docs/superpowers/` — historical design trail (specs/plans from build session)
- `CONTRIBUTING.md` — contributor guide (tool/archetype addition flow)
