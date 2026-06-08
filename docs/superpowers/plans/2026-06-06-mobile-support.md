# Mobile Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full editing parity on touch devices per `docs/superpowers/specs/2026-06-06-mobile-support-design.md` — phone (<640px) gets bottom-sheet UI, coarse-pointer devices get touch-tuned canvas interactions, desktop stays byte-identical.

**Architecture:** `useMediaQuery`-driven conditional component trees. New transient store state (`armedTool`, `touchSelectMode`) plumbs sheet→canvas interactions. Two desktop-neutral refactors first (shared palette icons, `SelectionConfig` extraction) so phone components reuse existing editors. No store/file-format changes beyond transient UI fields.

**Tech Stack:** React 18, React Flow v12, Zustand, Tailwind classes + CSS vars, Vitest + RTL (jsdom). No new dependencies.

> **⚠️ NO COMMITS.** Dor commits everything himself — never run `git commit`/`git push`. End each task at green verification. Final task runs THE GATE:
> `npm run typecheck && npm run lint && npm run format:check && npm run validate:catalog && npm run test && npm run build`

**Codebase facts (verified):**
- jsdom has NO `matchMedia` — setup.ts must gain a mock; existing 566 tests must stay green with the default mock (fine pointer, desktop width).
- `ConfigPanel.tsx` (974 lines) — module-private inners: `ConfigPanelInner`(sysNode), `EdgeConfigInner`, `NoteConfigInner`, `BoundaryConfigInner`, `StepConfigInner`, `ArrowConfigInner`; router lives in `ConfigPanel()` at ~line 956. Each inner renders its own `<aside data-testid="config-panel">` wrapper.
- `Palette.tsx` (704 lines) — module-private `ArchetypeGlyph` + `ToolIcon` render helpers (lines 22–87); `dangerouslySetInnerHTML` guardrail site (catalog symbolSvg only — moving the component keeps the same single call site, count must stay 2 overall).
- `Canvas.tsx` — current RF props: `panOnDrag={[1, 2]}`, `selectionOnDrag`, `zoomOnPinch`, `onPaneClick={() => setPanelSuppressed(false)}`; `onDrop` switch handles kinds note/title/boundary/step/arrow + archetype/tool.
- `App.tsx` (170 lines) — all hooks at top; boot effect (share-hash → autosave → startAutosave); returns one tree. Branch in the RETURN, never in hooks.
- `index.html:6` — viewport currently `width=device-width, initial-scale=1.0` (no maximum-scale).
- Sidebar defaults 176/208px, already resizable+collapsible.

**Deliberate spec deviation:** tablet (640–1023px) inherits the desktop tree unchanged — defaults are already slim (176px) and user-resizable; tablet-specific width code is YAGNI. Phone is the only new tree.

---

### Task M1: `useMediaQuery` hooks + jsdom matchMedia mock

**Files:**
- Create: `src/hooks/useMediaQuery.ts`
- Test: `src/hooks/useMediaQuery.test.ts`
- Modify: `src/test/setup.ts` (add matchMedia mock)

- [ ] **Step 1: Add configurable matchMedia mock to `src/test/setup.ts`** (append after the existing localStorage polyfill; export nothing — expose via globalThis helper):

```ts
// ---- matchMedia mock (jsdom lacks it) ----
// Tests flip media state via setMockMedia(); default = desktop, fine pointer.
type MediaListener = (e: { matches: boolean }) => void;
const mediaState: { width: number; coarse: boolean } = {
  width: 1280,
  coarse: false,
};
const mediaListeners = new Map<string, Set<MediaListener>>();

function evaluateQuery(query: string): boolean {
  const min = query.match(/min-width:\s*(\d+)px/);
  const max = query.match(/max-width:\s*(\d+)px/);
  if (query.includes("pointer: coarse")) return mediaState.coarse;
  let ok = true;
  if (min) ok = ok && mediaState.width >= Number(min[1]);
  if (max) ok = ok && mediaState.width <= Number(max[1]);
  return ok && Boolean(min || max);
}

window.matchMedia = ((query: string) => {
  const listeners =
    mediaListeners.get(query) ?? mediaListeners.set(query, new Set()).get(query)!;
  return {
    media: query,
    get matches() {
      return evaluateQuery(query);
    },
    addEventListener: (_: "change", cb: MediaListener) => listeners.add(cb),
    removeEventListener: (_: "change", cb: MediaListener) => listeners.delete(cb),
    // legacy API some libs call:
    addListener: (cb: MediaListener) => listeners.add(cb),
    removeListener: (cb: MediaListener) => listeners.delete(cb),
    onchange: null,
    dispatchEvent: () => false,
  } as unknown as MediaQueryList;
}) as typeof window.matchMedia;

/** Test helper: set viewport/pointer state and notify subscribers. */
(globalThis as Record<string, unknown>).setMockMedia = (
  next: Partial<typeof mediaState>,
) => {
  Object.assign(mediaState, next);
  for (const [query, listeners] of mediaListeners) {
    const matches = evaluateQuery(query);
    for (const cb of listeners) cb({ matches });
  }
};
```

- [ ] **Step 2: Write the failing hook tests**

```ts
// src/hooks/useMediaQuery.test.ts
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useMediaQuery,
  useIsPhone,
  useIsCoarsePointer,
} from "./useMediaQuery";

const setMockMedia = (globalThis as Record<string, unknown>)
  .setMockMedia as (next: { width?: number; coarse?: boolean }) => void;

describe("useMediaQuery", () => {
  it("reflects current media state and updates on change", () => {
    setMockMedia({ width: 1280, coarse: false });
    const { result } = renderHook(() => useMediaQuery("(max-width: 639px)"));
    expect(result.current).toBe(false);
    act(() => setMockMedia({ width: 480 }));
    expect(result.current).toBe(true);
  });

  it("useIsPhone true below 640px, false at 640px", () => {
    setMockMedia({ width: 639 });
    const { result, rerender } = renderHook(() => useIsPhone());
    expect(result.current).toBe(true);
    act(() => setMockMedia({ width: 640 }));
    rerender();
    expect(result.current).toBe(false);
  });

  it("useIsCoarsePointer tracks pointer coarseness", () => {
    setMockMedia({ coarse: true });
    const { result } = renderHook(() => useIsCoarsePointer());
    expect(result.current).toBe(true);
    act(() => setMockMedia({ coarse: false }));
    expect(result.current).toBe(false);
  });
});
```

- [ ] **Step 3: Run to verify FAIL** — `npx vitest run src/hooks/useMediaQuery.test.ts` → module not found.

- [ ] **Step 4: Implement**

```ts
// src/hooks/useMediaQuery.ts
import { useSyncExternalStore } from "react";

/** Subscribes to a CSS media query. SSR/jsdom-safe (false when matchMedia missing). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const mql = window.matchMedia(query);
      const cb = () => onChange();
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () =>
      typeof window.matchMedia === "function"
        ? window.matchMedia(query).matches
        : false,
  );
}

export const useIsPhone = () => useMediaQuery("(max-width: 639px)");
export const useIsTablet = () =>
  useMediaQuery("(min-width: 640px) and (max-width: 1023px)");
export const useIsCoarsePointer = () => useMediaQuery("(pointer: coarse)");
```

- [ ] **Step 5: Run hook tests → PASS, then FULL suite** — `npx vitest run` → all 566+ green (mock default must not change existing behavior).
- [ ] **Step 6:** `npm run typecheck && npm run lint && npm run format` → clean.

### Task M2: store transient UI state (`armedTool`, `touchSelectMode`)

**Files:**
- Modify: `src/state/store.ts`
- Test: `src/state/store.test.ts` (add cases)

- [ ] **Step 1: Failing tests**

```ts
describe("mobile transient UI state", () => {
  it("armTool sets and clears the armed tool", () => {
    useStore.getState().armTool({ kind: "tool", archetype: "database", tool: "postgresql" });
    expect(useStore.getState().armedTool).toEqual({
      kind: "tool",
      archetype: "database",
      tool: "postgresql",
    });
    useStore.getState().armTool(null);
    expect(useStore.getState().armedTool).toBeNull();
  });

  it("touchSelectMode toggles", () => {
    useStore.getState().setTouchSelectMode(true);
    expect(useStore.getState().touchSelectMode).toBe(true);
    useStore.getState().setTouchSelectMode(false);
    expect(useStore.getState().touchSelectMode).toBe(false);
  });

  it("reset clears transient mobile state", () => {
    useStore.getState().armTool({ kind: "note" });
    useStore.getState().setTouchSelectMode(true);
    useStore.getState().reset();
    expect(useStore.getState().armedTool).toBeNull();
    expect(useStore.getState().touchSelectMode).toBe(false);
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement in `store.ts`** — add type + fields + actions:

```ts
/** Tool armed from the phone palette sheet; next canvas tap places it. */
export type ArmedTool =
  | { kind: "tool"; archetype: string; tool: string }
  | { kind: "note" }
  | { kind: "title" }
  | { kind: "boundary" }
  | { kind: "step" }
  | { kind: "arrow" };
```

StoreState additions: `armedTool: ArmedTool | null;`, `touchSelectMode: boolean;`, `armTool: (t: ArmedTool | null) => void;`, `setTouchSelectMode: (v: boolean) => void;`
Initial values `armedTool: null`, `touchSelectMode: false`. Implementations:

```ts
armTool: (armedTool) => set({ armedTool }),
setTouchSelectMode: (touchSelectMode) => set({ touchSelectMode }),
```

In `reset`: add `armedTool: null, touchSelectMode: false,`. NOT in snapshots (snapshots cover nodes/edges only — unchanged), NOT serialized (serializer reads explicit fields only — unchanged).

- [ ] **Step 4: Run store tests + full suite → green.** `npm run typecheck && npm run lint && npm run format`.

### Task M3: Canvas touch interactions + handle CSS

**Files:**
- Modify: `src/components/canvas/Canvas.tsx`
- Modify: `src/index.css` (coarse-pointer handle enlargement)
- Test: `src/components/canvas/Canvas.test.tsx` (add cases; reuse the file's RF prop-capture mock)

- [ ] **Step 1: Failing tests** (adapt to the file's prop-capture idiom; `setMockMedia` helper from M1):

```tsx
describe("coarse-pointer canvas behavior", () => {
  it("coarse pointer: one-finger pan, no selection drag", () => {
    setMockMedia({ coarse: true });
    // render Canvas, read captured RF props:
    expect(capturedProps.panOnDrag).toBe(true);
    expect(capturedProps.selectionOnDrag).toBe(false);
  });

  it("fine pointer keeps desktop props", () => {
    setMockMedia({ coarse: false });
    expect(capturedProps.panOnDrag).toEqual([1, 2]);
    expect(capturedProps.selectionOnDrag).toBe(true);
  });

  it("touchSelectMode flips to marquee and exits after one selection", () => {
    setMockMedia({ coarse: true });
    useStore.getState().setTouchSelectMode(true);
    // re-render / re-read props:
    expect(capturedProps.selectionOnDrag).toBe(true);
    expect(capturedProps.panOnDrag).toBe(false);
    capturedProps.onSelectionEnd?.();
    expect(useStore.getState().touchSelectMode).toBe(false);
  });

  it("armed tool places node on pane click and disarms", () => {
    setMockMedia({ coarse: true });
    useStore.getState().armTool({ kind: "tool", archetype: "database", tool: "postgresql" });
    capturedProps.onPaneClick?.({ clientX: 100, clientY: 100 });
    expect(useStore.getState().nodes).toHaveLength(1);
    expect(useStore.getState().armedTool).toBeNull();
  });

  it("armed tool ignored when locked", () => {
    useStore.setState({ locked: true });
    useStore.getState().armTool({ kind: "step" });
    capturedProps.onPaneClick?.({ clientX: 50, clientY: 50 });
    expect(useStore.getState().nodes).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement in `Canvas.tsx`:**

```tsx
import { useIsCoarsePointer } from "@/hooks/useMediaQuery";
// inside Canvas():
const isCoarse = useIsCoarsePointer();
const touchSelectMode = useStore((s) => s.touchSelectMode);
const setTouchSelectMode = useStore((s) => s.setTouchSelectMode);
const armedTool = useStore((s) => s.armedTool);
const armTool = useStore((s) => s.armTool);
```

RF prop changes (replace the current literals):

```tsx
panOnDrag={isCoarse ? !touchSelectMode : [1, 2]}
selectionOnDrag={isCoarse ? touchSelectMode : true}
onSelectionEnd={() => {
  if (isCoarse && touchSelectMode) setTouchSelectMode(false);
}}
onPaneClick={(e) => {
  setPanelSuppressed(false);
  if (!armedTool || locked) return;
  const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
  switch (armedTool.kind) {
    case "tool":
      addNode(armedTool.archetype, armedTool.tool, position);
      break;
    case "note":
      addNote(position);
      break;
    case "title":
      addNote(position, { size: "title", text: "Title" });
      break;
    case "boundary":
      addBoundary(position);
      break;
    case "step":
      addStep(position);
      break;
    case "arrow":
      addArrow(position);
      break;
  }
  armTool(null);
}}
```

(`panOnDrag` boolean form: `true` = pan with any button/finger; `!touchSelectMode` so marquee mode disables pan.)

- [ ] **Step 4: Handle enlargement in `src/index.css`** (append):

```css
/* Touch: ≥44px effective connection-handle targets; visual dot grows slightly */
@media (pointer: coarse) {
  .react-flow__handle {
    width: 14px;
    height: 14px;
  }
  .react-flow__handle::after {
    content: "";
    position: absolute;
    inset: -16px;
  }
}
```

- [ ] **Step 5: Run canvas tests + full suite + lint/format/typecheck → green.**

### Task M4: extract shared palette icons (desktop-neutral refactor)

**Files:**
- Create: `src/components/sidebar/palette-icons.tsx`
- Modify: `src/components/sidebar/Palette.tsx` (import instead of define)

- [ ] **Step 1:** Move `ArchetypeGlyph` and `ToolIcon` (Palette.tsx lines ~22–87) VERBATIM into `src/components/sidebar/palette-icons.tsx`; add `export` to both; copy the imports they need (`archetypes`, `getTool`, `resolveToolIcon`, `toolInitials`, `useStore`, `themedColor`). The `dangerouslySetInnerHTML` call site MOVES with `ArchetypeGlyph` — total call-site count in repo stays 2 (this file + SysNode.tsx); update the guardrail wording in AGENTS.md in the final task.
- [ ] **Step 2:** In `Palette.tsx`: delete the two local definitions, add `import { ArchetypeGlyph, ToolIcon } from "./palette-icons";`, prune now-unused imports.
- [ ] **Step 3:** `npx vitest run src/components/sidebar/ && npm run typecheck && npm run lint && npm run format` → all green, zero test changes (pure move).

### Task M5: extract `SelectionConfig` router (desktop-neutral refactor)

**Files:**
- Modify: `src/components/config-panel/ConfigPanel.tsx`
- Test: existing `ConfigPanel.test.tsx` must stay green unchanged

- [ ] **Step 1:** Read `ConfigPanel()` (line ~956). Extract its type-routing into a new EXPORTED component in the same file, keeping `ConfigPanel` as the selection-finder + wrapper:

```tsx
/** Routes a selected node/edge to its type-specific editor. Reused by the mobile ConfigSheet. */
export function SelectionConfig({
  node,
  edge,
}: {
  node?: AppNode;
  edge?: SysEdge;
}) {
  if (edge) return <EdgeConfigInner key={edge.id} edge={edge} />;
  if (!node) return null;
  if (node.type === "sysNode") return <ConfigPanelInner key={node.id} node={node} />;
  if (node.type === "noteNode") return <NoteConfigInner key={node.id} node={node} />;
  if (node.type === "boundaryNode")
    return <BoundaryConfigInner key={node.id} node={node} />;
  if (node.type === "stepNode") return <StepConfigInner key={node.id} node={node} />;
  return <ArrowConfigInner key={node.id} node={node as ArrowNode} />;
}
```

Adapt to the ACTUAL existing routing (read it first — keep `key={...}` props and casts exactly as the current `ConfigPanel` body does; if current body differs from the sketch above, current body wins). `ConfigPanel()` becomes: find selected node/edge from store (existing logic) → `return <SelectionConfig node={node} edge={edge} />;`

- [ ] **Step 2:** `npx vitest run src/components/config-panel/ && npm run test` → green with ZERO test edits (pure refactor).

### Task M6: `BottomSheet` primitive

**Files:**
- Create: `src/components/mobile/BottomSheet.tsx`
- Test: `src/components/mobile/BottomSheet.test.tsx`

- [ ] **Step 1: Failing tests**

```tsx
// src/components/mobile/BottomSheet.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BottomSheet } from "./BottomSheet";

describe("BottomSheet", () => {
  it("renders children and drag handle at given detent", () => {
    render(
      <BottomSheet detent="half" onDetentChange={() => {}}>
        <p>sheet content</p>
      </BottomSheet>,
    );
    expect(screen.getByText("sheet content")).toBeInTheDocument();
    expect(screen.getByTestId("sheet-handle")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-sheet").dataset.detent).toBe("half");
  });

  it("drag up past threshold promotes detent (peek → half)", () => {
    const onDetentChange = vi.fn();
    render(
      <BottomSheet detent="peek" onDetentChange={onDetentChange}>
        <p>x</p>
      </BottomSheet>,
    );
    const handle = screen.getByTestId("sheet-handle");
    handle.setPointerCapture = vi.fn();
    handle.releasePointerCapture = vi.fn();
    fireEvent.pointerDown(handle, { clientY: 800, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 700, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 700, pointerId: 1 });
    expect(onDetentChange).toHaveBeenCalledWith("half");
  });

  it("drag down past threshold demotes detent (half → peek)", () => {
    const onDetentChange = vi.fn();
    render(
      <BottomSheet detent="half" onDetentChange={onDetentChange}>
        <p>x</p>
      </BottomSheet>,
    );
    const handle = screen.getByTestId("sheet-handle");
    handle.setPointerCapture = vi.fn();
    handle.releasePointerCapture = vi.fn();
    fireEvent.pointerDown(handle, { clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 620, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 620, pointerId: 1 });
    expect(onDetentChange).toHaveBeenCalledWith("peek");
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement**

```tsx
// src/components/mobile/BottomSheet.tsx
import { useRef, type ReactNode } from "react";

export type SheetDetent = "peek" | "half" | "full";

const DETENT_HEIGHT: Record<SheetDetent, string> = {
  peek: "56px",
  half: "45vh",
  full: "88vh",
};
const ORDER: SheetDetent[] = ["peek", "half", "full"];
/** Vertical drag (px) needed to move one detent step. */
const STEP_THRESHOLD = 60;

/**
 * Minimal 3-detent bottom sheet. No animation library, no velocity physics —
 * a drag past the threshold moves exactly one detent step (spec: keep it simple).
 */
export function BottomSheet({
  detent,
  onDetentChange,
  children,
}: {
  detent: SheetDetent;
  onDetentChange: (d: SheetDetent) => void;
  children: ReactNode;
}) {
  const startY = useRef<number | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (startY.current === null) return;
    const dy = e.clientY - startY.current; // negative = dragged up
    startY.current = null;
    const idx = ORDER.indexOf(detent);
    if (dy <= -STEP_THRESHOLD && idx < ORDER.length - 1) {
      onDetentChange(ORDER[idx + 1]);
    } else if (dy >= STEP_THRESHOLD && idx > 0) {
      onDetentChange(ORDER[idx - 1]);
    }
  };

  return (
    <div
      data-testid="bottom-sheet"
      data-detent={detent}
      className="fixed bottom-0 left-0 right-0 z-40 flex flex-col rounded-t-xl border-t border-x border-[var(--border)] bg-[var(--panel)] shadow-2xl transition-[height] duration-200"
      style={{ height: DETENT_HEIGHT[detent], touchAction: "none" }}
    >
      <div
        data-testid="sheet-handle"
        className="flex shrink-0 cursor-grab justify-center py-2"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <div className="h-1 w-9 rounded-full bg-[var(--muted)]" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">{children}</div>
    </div>
  );
}
```

Note: `onPointerMove` isn't needed — decision happens at pointer-up from total delta. jsdom lacks `setPointerCapture`; tests stub it per-element (shown above).

- [ ] **Step 4: Run → PASS (3 tests). Lint/format/typecheck.**

### Task M7: `PaletteSheet`

**Files:**
- Create: `src/components/mobile/PaletteSheet.tsx`
- Test: `src/components/mobile/PaletteSheet.test.tsx`

- [ ] **Step 1: Failing tests**

```tsx
// src/components/mobile/PaletteSheet.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PaletteSheet } from "./PaletteSheet";
import { useStore } from "@/state/store";

describe("PaletteSheet", () => {
  beforeEach(() => useStore.getState().reset());

  it("renders archetype chips and arms a tool on tap", () => {
    render(<PaletteSheet />);
    fireEvent.click(screen.getByRole("button", { name: "Database" }));
    // expanding a chip shows its tools; tap the default tool entry
    fireEvent.click(screen.getByRole("button", { name: /PostgreSQL/ }));
    expect(useStore.getState().armedTool).toEqual({
      kind: "tool",
      archetype: "database",
      tool: "postgresql",
    });
  });

  it("tapping the armed tool again disarms", () => {
    render(<PaletteSheet />);
    fireEvent.click(screen.getByRole("button", { name: "Database" }));
    const pg = screen.getByRole("button", { name: /PostgreSQL/ });
    fireEvent.click(pg);
    fireEvent.click(pg);
    expect(useStore.getState().armedTool).toBeNull();
  });

  it("arms annotation tools", () => {
    render(<PaletteSheet />);
    fireEvent.click(screen.getByRole("button", { name: "Note" }));
    expect(useStore.getState().armedTool).toEqual({ kind: "note" });
  });

  it("search filters tools (real mode searches tool labels)", () => {
    useStore.setState({ viewMode: "real" });
    render(<PaletteSheet />);
    fireEvent.change(screen.getByPlaceholderText("Search"), {
      target: { value: "postgre" },
    });
    expect(screen.getByRole("button", { name: /PostgreSQL/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Kafka/ })).toBeNull();
  });

  it("renders nothing when locked", () => {
    useStore.setState({ locked: true });
    render(<PaletteSheet />);
    expect(screen.queryByTestId("bottom-sheet")).toBeNull();
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement**

```tsx
// src/components/mobile/PaletteSheet.tsx
import { useState } from "react";
import { archetypes, toolsForArchetype } from "@/lib/catalog";
import { useStore, type ArmedTool } from "@/state/store";
import { ArchetypeGlyph, ToolIcon } from "@/components/sidebar/palette-icons";
import { BottomSheet, type SheetDetent } from "./BottomSheet";
import {
  StickyNote,
  Heading,
  BoxSelect,
  CircleDot,
  MoveUpRight,
} from "lucide-react";

const ANNOTATIONS: Array<{ kind: ArmedTool["kind"]; label: string; Icon: typeof StickyNote }> = [
  { kind: "note", label: "Note", Icon: StickyNote },
  { kind: "title", label: "Title", Icon: Heading },
  { kind: "boundary", label: "Boundary", Icon: BoxSelect },
  { kind: "step", label: "Step", Icon: CircleDot },
  { kind: "arrow", label: "Arrow", Icon: MoveUpRight },
];

export function PaletteSheet() {
  const [detent, setDetent] = useState<SheetDetent>("peek");
  const [activeArchetype, setActiveArchetype] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const armedTool = useStore((s) => s.armedTool);
  const armTool = useStore((s) => s.armTool);
  const viewMode = useStore((s) => s.viewMode);
  const locked = useStore((s) => s.locked);

  if (locked) return null;

  const q = query.trim().toLowerCase();
  const allTools = Object.keys(archetypes).flatMap((key) =>
    toolsForArchetype(key).map(([slug, tool]) => ({ slug, tool, archetype: key })),
  );
  const searchResults = q
    ? allTools.filter(({ slug, tool, archetype }) =>
        viewMode === "real"
          ? tool.label.toLowerCase().includes(q) || slug.includes(q)
          : (archetypes[archetype]?.label.toLowerCase().includes(q) ?? false),
      )
    : null;

  const armToolEntry = (archetype: string, slug: string) => {
    const already =
      armedTool?.kind === "tool" && armedTool.tool === slug ? null : null;
    if (armedTool?.kind === "tool" && armedTool.tool === slug) {
      armTool(null);
    } else {
      armTool({ kind: "tool", archetype, tool: slug });
      setDetent("peek"); // drop so the canvas is visible for the placement tap
    }
    void already;
  };

  const armAnnotation = (kind: Exclude<ArmedTool["kind"], "tool">) => {
    if (armedTool?.kind === kind) armTool(null);
    else {
      armTool({ kind } as ArmedTool);
      setDetent("peek");
    }
  };

  const toolButton = ({ slug, tool, archetype }: (typeof allTools)[number]) => {
    const isArmed = armedTool?.kind === "tool" && armedTool.tool === slug;
    return (
      <button
        key={slug}
        aria-label={tool.label}
        onClick={() => armToolEntry(archetype, slug)}
        className={`flex items-center gap-2 rounded-md border px-2 py-2 text-xs ${
          isArmed
            ? "border-[var(--accent)] text-[var(--accent)]"
            : "border-[var(--border)] text-[var(--text)]"
        }`}
      >
        <ToolIcon toolKey={slug} size={18} />
        {tool.label}
      </button>
    );
  };

  return (
    <BottomSheet detent={detent} onDetentChange={setDetent}>
      <input
        placeholder="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => detent === "peek" && setDetent("half")}
        className="mb-2 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm text-[var(--text)]"
      />
      {searchResults ? (
        <div className="grid grid-cols-2 gap-2">{searchResults.map(toolButton)}</div>
      ) : (
        <>
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {ANNOTATIONS.map(({ kind, label, Icon }) => (
              <button
                key={kind}
                aria-label={label}
                onClick={() => armAnnotation(kind as Exclude<ArmedTool["kind"], "tool">)}
                className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs ${
                  armedTool?.kind === kind
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--text)]"
                }`}
              >
                <Icon size={13} strokeWidth={2} /> {label}
              </button>
            ))}
          </div>
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {Object.entries(archetypes).map(([key, a]) => (
              <button
                key={key}
                aria-label={a.label}
                onClick={() => {
                  setActiveArchetype(activeArchetype === key ? null : key);
                  if (detent === "peek") setDetent("half");
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
                  activeArchetype === key
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--text)]"
                }`}
              >
                <ArchetypeGlyph archetypeKey={key} size={14} />
                {a.label}
              </button>
            ))}
          </div>
          {activeArchetype && (
            <div className="grid grid-cols-2 gap-2">
              {toolsForArchetype(activeArchetype).map(([slug, tool]) =>
                toolButton({ slug, tool, archetype: activeArchetype }),
              )}
            </div>
          )}
        </>
      )}
    </BottomSheet>
  );
}
```

Clean up the leftover `already`/`void` lines if lint flags them (artifact guard — implement the toggle cleanly).

- [ ] **Step 4: Run → PASS (5 tests). Lint/format/typecheck + full suite.**

### Task M8: `ConfigSheet`

**Files:**
- Create: `src/components/mobile/ConfigSheet.tsx`
- Test: `src/components/mobile/ConfigSheet.test.tsx`

- [ ] **Step 1: Failing tests**

```tsx
// src/components/mobile/ConfigSheet.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfigSheet } from "./ConfigSheet";
import { useStore } from "@/state/store";

describe("ConfigSheet", () => {
  beforeEach(() => useStore.getState().reset());

  it("renders nothing without a selection", () => {
    render(<ConfigSheet />);
    expect(screen.queryByTestId("bottom-sheet")).toBeNull();
  });

  it("opens with the node editor when a node is selected", () => {
    useStore.getState().addNode("database", "postgresql", { x: 0, y: 0 });
    useStore.setState({
      nodes: useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
    });
    render(<ConfigSheet />);
    expect(screen.getByTestId("bottom-sheet")).toBeInTheDocument();
    expect(screen.getByTestId("config-panel")).toBeInTheDocument();
  });

  it("editing inside the sheet writes to the store (step label)", () => {
    useStore.getState().addStep({ x: 0, y: 0 });
    useStore.setState({
      nodes: useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
    });
    render(<ConfigSheet />);
    const input = screen.getByLabelText("Step label");
    fireEvent.change(input, { target: { value: "2a" } });
    fireEvent.blur(input);
    const step = useStore.getState().nodes[0];
    expect(step.type === "stepNode" && step.data.label).toBe("2a");
  });

  it("close button clears selection", () => {
    useStore.getState().addNode("database", "postgresql", { x: 0, y: 0 });
    useStore.setState({
      nodes: useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
    });
    render(<ConfigSheet />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(useStore.getState().nodes.every((n) => !n.selected)).toBe(true);
  });

  it("renders nothing when locked even with selection", () => {
    useStore.getState().addNode("database", "postgresql", { x: 0, y: 0 });
    useStore.setState({
      nodes: useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      locked: true,
    });
    render(<ConfigSheet />);
    expect(screen.queryByTestId("bottom-sheet")).toBeNull();
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement**

```tsx
// src/components/mobile/ConfigSheet.tsx
import { useState } from "react";
import { X } from "lucide-react";
import { useStore } from "@/state/store";
import { SelectionConfig } from "@/components/config-panel/ConfigPanel";
import { BottomSheet, type SheetDetent } from "./BottomSheet";

export function ConfigSheet() {
  const [detent, setDetent] = useState<SheetDetent>("half");
  const locked = useStore((s) => s.locked);
  const node = useStore((s) => s.nodes.find((n) => n.selected));
  const edge = useStore((s) => s.edges.find((e) => e.selected));
  const setNodes = useStore((s) => s.setNodes);
  const setEdges = useStore((s) => s.setEdges);

  if (locked || (!node && !edge)) return null;

  const clearSelection = () => {
    setNodes(useStore.getState().nodes.map((n) => ({ ...n, selected: false })));
    setEdges(useStore.getState().edges.map((e) => ({ ...e, selected: false })));
  };

  return (
    <BottomSheet detent={detent} onDetentChange={setDetent}>
      <div className="flex justify-end">
        <button
          aria-label="Close"
          onClick={clearSelection}
          className="rounded-md border border-[var(--border)] p-1 text-[var(--muted)]"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>
      <SelectionConfig node={node} edge={edge} />
    </BottomSheet>
  );
}
```

Note: `SelectionConfig` inners render their own `<aside data-testid="config-panel">` with a `border-l` — acceptable inside the sheet (visual nit, not worth forking the editors).

- [ ] **Step 4: Run → PASS (5 tests). Lint/format/typecheck + full suite.**

### Task M9: `PhoneTopBar` + App branching + viewport + docs + GATE

**Files:**
- Create: `src/components/mobile/PhoneTopBar.tsx`
- Modify: `src/App.tsx` (phone tree branch)
- Modify: `index.html:6` (viewport meta)
- Modify: `README.md`, `AGENTS.md` (docs)
- Test: `src/App-mobile.test.tsx`

- [ ] **Step 1: Failing tests**

```tsx
// src/App-mobile.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";
import { useStore } from "@/state/store";

const setMockMedia = (globalThis as Record<string, unknown>)
  .setMockMedia as (next: { width?: number; coarse?: boolean }) => void;

describe("App phone layout", () => {
  beforeEach(() => {
    useStore.getState().reset();
    localStorage.clear();
  });

  it("phone width mounts sheets and no desktop sidebars", () => {
    setMockMedia({ width: 390, coarse: true });
    render(<App />);
    expect(screen.getByTestId("phone-top-bar")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-sheet")).toBeInTheDocument(); // palette sheet
    expect(screen.queryByTestId("config-panel-overlay")).toBeNull();
  });

  it("desktop width keeps the existing tree", () => {
    setMockMedia({ width: 1280, coarse: false });
    render(<App />);
    expect(screen.queryByTestId("phone-top-bar")).toBeNull();
    expect(screen.getByTestId("config-panel-overlay")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement `PhoneTopBar`**

```tsx
// src/components/mobile/PhoneTopBar.tsx
import { useState } from "react";
import { useStore } from "@/state/store";
import { useFileIO } from "@/hooks/useFileIO";
import { Segmented, IconButton } from "@/components/ui";
import { MermaidDialog } from "@/components/toolbar/MermaidDialog";
import {
  BoxSelect,
  Link,
  Lock,
  LockOpen,
  MoreVertical,
  Sun,
  Moon,
  FolderOpen,
  Save,
  Image,
  FileCode2,
} from "lucide-react";
import { useRef } from "react";

export function PhoneTopBar() {
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const locked = useStore((s) => s.locked);
  const toggleLocked = useStore((s) => s.toggleLocked);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const touchSelectMode = useStore((s) => s.touchSelectMode);
  const setTouchSelectMode = useStore((s) => s.setTouchSelectMode);
  const { exportFile, importFile, exportPng, shareLink } = useFileIO();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mermaidOpen, setMermaidOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const menuItemCls =
    "flex w-full items-center gap-2 rounded-md border border-[var(--border)] px-2 py-2 text-xs text-[var(--text)] hover:bg-[var(--card)] disabled:opacity-50 mb-1";

  return (
    <header
      data-testid="phone-top-bar"
      className="relative flex items-center gap-2 border-b border-[var(--border)] bg-[var(--panel)] px-2 py-1.5"
    >
      <img src="/favicon.svg" alt="SchemaMorph" className="h-5 w-5" />
      <span className="flex-1" />
      <Segmented
        value={viewMode}
        onChange={setViewMode}
        options={[
          { value: "minimalist", label: "Min" },
          { value: "real", label: "Real" },
        ]}
      />
      <span className="flex-1" />
      <IconButton
        label="Toggle marquee select"
        onClick={() => setTouchSelectMode(!touchSelectMode)}
        style={
          touchSelectMode
            ? { color: "var(--accent)", borderColor: "var(--accent)" }
            : undefined
        }
      >
        <BoxSelect size={14} strokeWidth={2} />
      </IconButton>
      <IconButton
        label="Toggle lock"
        onClick={toggleLocked}
        style={
          locked
            ? { color: "var(--accent)", borderColor: "var(--accent)" }
            : undefined
        }
      >
        {locked ? <Lock size={14} strokeWidth={2} /> : <LockOpen size={14} strokeWidth={2} />}
      </IconButton>
      <IconButton label="More" onClick={() => setMenuOpen(!menuOpen)}>
        <MoreVertical size={14} strokeWidth={2} />
      </IconButton>
      <input
        ref={fileInput}
        type="file"
        accept=".schemamorph,.schemaflip,.sysdraw,application/json"
        className="hidden"
        data-testid="phone-file-input"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importFile(f);
          e.target.value = "";
          setMenuOpen(false);
        }}
      />
      {menuOpen && (
        <div className="absolute right-2 top-11 z-50 w-52 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-2 shadow-xl">
          <button aria-label="Load file" className={menuItemCls} onClick={() => fileInput.current?.click()}>
            <FolderOpen size={14} strokeWidth={2} /> Load file…
          </button>
          <button
            aria-label="Import Mermaid"
            className={menuItemCls}
            disabled={locked}
            onClick={() => {
              setMermaidOpen(true);
              setMenuOpen(false);
            }}
          >
            <FileCode2 size={14} strokeWidth={2} /> Import Mermaid…
          </button>
          <button
            aria-label="Export .schemamorph"
            className={menuItemCls}
            onClick={() => {
              exportFile();
              setMenuOpen(false);
            }}
          >
            <Save size={14} strokeWidth={2} /> Export .schemamorph
          </button>
          <button
            aria-label="Export PNG"
            className={menuItemCls}
            onClick={() => {
              void exportPng();
              setMenuOpen(false);
            }}
          >
            <Image size={14} strokeWidth={2} /> Export PNG
          </button>
          <button
            aria-label="Copy share link"
            className={menuItemCls}
            onClick={() => {
              void shareLink();
              setMenuOpen(false);
            }}
          >
            <Link size={14} strokeWidth={2} /> Copy share link
          </button>
          <button
            aria-label="Toggle theme"
            className={menuItemCls}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun size={14} strokeWidth={2} /> : <Moon size={14} strokeWidth={2} />}
            Theme
          </button>
        </div>
      )}
      <MermaidDialog open={mermaidOpen} onClose={() => setMermaidOpen(false)} />
    </header>
  );
}
```

(IconButton/Segmented: verify export names in `src/components/ui.tsx` and match its prop API — adapt if different.)

- [ ] **Step 4: App branching** — in `src/App.tsx`, keep ALL hooks unconditional; add:

```tsx
import { useIsPhone } from "@/hooks/useMediaQuery";
import { PhoneTopBar } from "@/components/mobile/PhoneTopBar";
import { PaletteSheet } from "@/components/mobile/PaletteSheet";
import { ConfigSheet } from "@/components/mobile/ConfigSheet";
// inside App(), after existing hooks:
const isPhone = useIsPhone();
```

Then in the return, branch the JSX (boot effect/hooks untouched above):

```tsx
if (isPhone) {
  return (
    <ReactFlowProvider>
      <div className="flex h-full flex-col">
        <PhoneTopBar />
        <div className="relative min-h-0 flex-1">
          <Canvas />
        </div>
        <PaletteSheet />
        <ConfigSheet />
      </div>
      <Toaster theme={theme} position="top-center" />
    </ReactFlowProvider>
  );
}
return ( /* existing desktop tree unchanged */ );
```

(Toaster `top-center` on phone — bottom is occupied by sheets.)

- [ ] **Step 5: Viewport meta** — `index.html:6` becomes:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
```

(Prevents iOS input-focus auto-zoom; page pinch-zoom intentionally ceded to canvas pinch — standard for canvas apps.)

- [ ] **Step 6: Run App tests + FULL suite → green.**
- [ ] **Step 7: Docs.**
  - `README.md` Features: add mobile bullet under Canvas: `- **Touch & mobile** — full editing on phones/tablets: bottom-sheet palette (tap to arm, tap canvas to place), touch-sized connection handles, one-finger pan + pinch zoom`.
  - `AGENTS.md`: Architecture gains `**Mobile** — src/components/mobile/: BottomSheet primitive, PaletteSheet (arm-and-tap placement via store.armedTool), ConfigSheet (reuses SelectionConfig), PhoneTopBar; App branches on useIsPhone(); Canvas flips pan/selection props on coarse pointers.` Update guardrail wording: `dangerouslySetInnerHTML` sites = `palette-icons.tsx` + `SysNode.tsx` (still exactly 2). Directory map: add `components/mobile/` + `hooks/useMediaQuery.ts`. Test-count line refresh.
- [ ] **Step 8: THE GATE** — all seven checks. Report changed-file list grouped for Dor's commits (suggested: `refactor: extract palette icons + SelectionConfig` / `feat: mobile support`).

---

## Self-review notes

- Spec coverage: detection (M1), shell (M9), PaletteSheet (M7), ConfigSheet (M8), placement (M2+M3), pan/select (M3), handles CSS (M3), select toggle (M3+M9), viewport (M9), lock-hides-sheets (M7/M8 locked tests), tablet = deliberate deviation (documented top). Desktop-neutral refactors isolated (M4, M5).
- Type consistency: `ArmedTool` defined M2, used M3/M7; `SheetDetent` defined M6, used M7/M8; `SelectionConfig` defined M5, used M8; `setMockMedia` defined M1, used M3/M9.
- No placeholders; all code complete. Implementer adapts only where marked (ui.tsx API, existing ConfigPanel routing body).
