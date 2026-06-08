# Mobile Support — Design Spec

**Date:** 2026-06-06
**Status:** Approved (brainstorming complete)
**Scope:** Full editing parity on touch devices, tablet-leaning. Phone gets a bottom-sheet UI; tablet keeps slim sidebars; desktop is byte-identical.

---

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Capability scope | **Full editing parity** — create, connect, configure, group, import, share on touch |
| Device priority | **Both, tablet-leaning** — breakpoints: phone `<640px`, tablet `640–1023px`, desktop `≥1024px` |
| Phone chrome model | **Bottom sheets** (option A of three mocked): palette = swipe-up sheet, config = on-select sheet, slim top bar |
| Edge creation | **Enlarged touch handles** — ≥44px hit targets via `(pointer: coarse)` CSS; drag node→node as on desktop |
| One-finger canvas drag | **Pan** (coarse pointer); marquee multi-select via explicit Select toggle |

## Approach

`useMediaQuery`-driven conditional component trees, NOT CSS-only responsive. Phone/tablet/desktop differ structurally (bottom sheets exist only on phone); hooks keep the desktop tree untouched (zero regression risk) and are jsdom-testable via `matchMedia` mocks. CSS-only was rejected: cannot conditionally mount React components, bloats desktop DOM with hidden mobile chrome.

---

## 1. Detection + layout shell

**`src/hooks/useMediaQuery.ts`** (new):

```ts
useMediaQuery(query: string): boolean        // subscribes to matchMedia, SSR-safe default false
useIsPhone(): boolean                        // (max-width: 639px)
useIsTablet(): boolean                       // (min-width: 640px) and (max-width: 1023px)
useIsCoarsePointer(): boolean                // (pointer: coarse)
```

**`App.tsx`** branches on these:

- **Desktop (≥1024px):** today's tree, untouched.
- **Tablet (640–1023px):** today's sidebars with narrower default widths; config overlay unchanged; everything else as desktop.
- **Phone (<640px):** no sidebars. Slim top bar: logo, mode `Segmented`, overflow menu `⋯` (settings popover contents: file I/O, Mermaid import, share, theme, lock, minimap, new canvas). Canvas full-bleed. Two new components mounted:
  - **`src/components/mobile/PaletteSheet.tsx`** — swipe-up bottom sheet with 3 detents (peek 56px / half / full). Contents: category chips (archetype groups) + tool grid + search input (mode-aware like desktop palette) + annotation tools + Tidy button. Drag handle + snap.
  - **`src/components/mobile/ConfigSheet.tsx`** — opens on node/edge selection, half-height detent, drag-dismiss (clears selection). Reuses the existing per-type config inner components (extracted from `ConfigPanel.tsx` if not already importable — extraction is part of this work, desktop panel keeps using the same inners).

**`index.html`:** ensure viewport meta is `width=device-width, initial-scale=1, maximum-scale=1` (prevents iOS auto-zoom on input focus).

**Lock mode on phone:** lock hides both sheets entirely (parallel to desktop's collapse behavior); top bar lock button stays accessible.

## 2. Touch interactions

**Node placement (phone):** drag-from-palette is replaced by **arm-and-tap**: tap a tool in PaletteSheet → tool is "armed" (chip highlighted, sheet drops to peek detent) → tap canvas → node created at `screenToFlowPosition(tap)`, tool disarms. Tapping the armed chip again disarms without placing. Desktop drag-and-drop untouched.

**Pan/zoom (coarse pointer):** `<ReactFlow>` props switch: `panOnDrag={true}`, `selectionOnDrag={false}`; `zoomOnPinch` already enabled. Fine-pointer (desktop) props unchanged.

**Select toggle (phone top bar):** marquee icon toggles a one-shot selection mode — while active, one-finger drag draws a selection box (`selectionOnDrag={true}`, `panOnDrag={false}`); exits automatically after one marquee completes or on toggle-off.

**Edge creation:** `@media (pointer: coarse)` CSS enlarges `.react-flow__handle` hit area to ≥44×44px (pseudo-element/padding expands the target; visible dot unchanged). Drag finger from handle to target node as on desktop.

**Boundary resize / arrow grips:** NodeResizer and the arrow grip handlers already use pointer events — functional on touch as-is; their hit areas also get the coarse-pointer enlargement treatment.

**Touch-action:** canvas container gets `touch-action: none` where RF requires it (RF sets this on its pane already — verify, don't duplicate).

## 3. Testing

- jsdom `matchMedia` mock helper (per-test breakpoint control) in `src/test/setup.ts` or a local test util.
- `useMediaQuery` hook unit tests (subscribe/unsubscribe, value changes).
- `PaletteSheet`: renders detents, arm → canvas-tap places node (store assertion), disarm, search filtering, lock hides sheet.
- `ConfigSheet`: opens on selection, reuses inner editors (label edit propagates to store), dismiss clears selection.
- `Canvas`: coarse-pointer prop branching (`panOnDrag`/`selectionOnDrag` flip), select-toggle one-shot behavior.
- `App`: phone tree mounts sheets + no sidebars; desktop tree unchanged (snapshot of structure or presence assertions).
- Invariant: all existing tests stay green with default (fine-pointer, desktop-width) mocks.

## Out of scope (YAGNI)

- PWA manifest / offline / install prompts
- Haptics, gesture customization, swipe-between-modes
- Landscape-specific phone layouts
- Keyboard-shortcut changes (no-op on phone naturally)
- Store/file-format changes — purely presentation + interaction layer

## Open risks

- React Flow touch behavior quirks (handle drag on iOS Safari) — mitigated by enlarged targets; fallback plan if real-device testing shows misfires: add "connect mode" tool later (was option B, deliberately deferred).
- Bottom-sheet gesture physics in plain React (no new dependency allowed without justification): implement with pointer events + CSS transforms; keep detent logic simple (3 snap points, velocity-free).
