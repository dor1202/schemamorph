# Task 34: Annotation Nodes + Boundary Boxes + Minimalist Spawn Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add text note nodes (sticky-note annotations), boundary box nodes (dashed grouping regions), and fix minimalist-mode spawn labels to use archetype label instead of tool label.

**Architecture:** Widen `AppNode = SysNode | NoteNode | BoundaryNode` union in types.ts; the store arrays, snapshot type, and all React Flow calls switch from `SysNode[]` to `AppNode[]`. File schema becomes a discriminated union with per-type z.union schemas. Three new custom node components (NoteNode, BoundaryNode — NoteNode has inline edit, BoundaryNode has NodeResizer). Palette gets an "Annotations" section below Components. ConfigPanel gets two new inner panels gated on node type. Layout dagre excludes non-sysNode nodes. File format version bumps to 1.1.0.

**Tech Stack:** React 19, @xyflow/react ^12, Zustand ^5, Zod ^4, Tailwind 4, Vitest 4, @testing-library/react, lucide-react

---

## File Map

**Created:**
- `src/components/canvas/NoteNode.tsx` — sticky-note component with double-click inline edit
- `src/components/canvas/NoteNode.test.tsx` — tests for NoteNode
- `src/components/canvas/BoundaryNode.tsx` — dashed resizable boundary box component
- `src/components/canvas/BoundaryNode.test.tsx` — tests for BoundaryNode

**Modified:**
- `src/lib/types.ts` — add `NoteNode`, `BoundaryNode`, `AppNode` union; keep `SysNode`
- `src/state/store.ts` — widen all arrays/types to `AppNode`, add `addNote`, `addBoundary`, fix `addNode` for minimalist label, fix `duplicateSelection` type
- `src/lib/sysdraw-file.ts` — widen schemas to union, bump version to 1.1.0, update `serializeSysdraw` signature
- `src/lib/layout.ts` — filter to `sysNode` only before dagre
- `src/components/canvas/Canvas.tsx` — register NoteNode/BoundaryNode types, branch onDrop for `kind`
- `src/components/config-panel/ConfigPanel.tsx` — add NoteConfigInner and BoundaryConfigInner panels
- `src/components/sidebar/Palette.tsx` — add Annotations section with Note + Boundary items
- `src/hooks/useFileIO.ts` — widen cast from `SysNode[]` to `AppNode[]`
- `docs/file-format.md` — document new node types, version bump
- **Test files** (existing tests updated): `src/state/store.test.ts`, `src/lib/sysdraw-file.test.ts`, `src/components/sidebar/Palette.test.tsx`, `src/components/config-panel/ConfigPanel.test.tsx`, `src/lib/layout.test.ts`

---

## Task 1: Widen types.ts — add NoteNode, BoundaryNode, AppNode

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Write the failing test** — add a type-level assertion in a new test block in `src/state/store.test.ts` (compile-time only, no runtime test needed; just confirm AppNode import works). Actually, skip runtime test here — types are checked by `tsc`. Instead write the failing typecheck-driven unit test in `src/state/store.test.ts` for step 3 below. For now just add the type definitions.

- [ ] **Step 2: Edit `src/lib/types.ts`**

Replace the entire file with:

```ts
import type { Node, Edge } from "@xyflow/react";

export type ViewMode = "minimalist" | "real";
export type NodeStyle = "symbol" | "card" | "plate";
export type LayoutDirection = "LR" | "TB";

export type SysNodeData = {
  archetype: string;
  concreteTool: string;
  label: string;
  customProperties?: Record<string, string>;
};

export type NoteNodeData = {
  text: string;
};

export type BoundaryNodeData = {
  label: string;
};

export type SysEdgeData = {
  label?: string;
  protocol?: string;
  customProperties?: Record<string, string>;
};

export type SysNode = Node<SysNodeData, "sysNode">;
export type NoteNode = Node<NoteNodeData, "noteNode">;
export type BoundaryNode = Node<BoundaryNodeData, "boundaryNode">;
export type AppNode = SysNode | NoteNode | BoundaryNode;
export type SysEdge = Edge<SysEdgeData>;
```

- [ ] **Step 3: Run typecheck — expect it to fail** (store.ts still uses `SysNode[]`)

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx tsc -b --noEmit 2>&1 | head -40
```

Expected: errors about `SysNode[]` vs `AppNode[]` in store.ts, layout.ts, etc.

---

## Task 2: Widen store.ts — AppNode arrays, addNote, addBoundary, minimalist label

**Files:**
- Modify: `src/state/store.ts`

This is the highest-impact change. Work carefully: change `SysNode[]` → `AppNode[]` everywhere, update `Snapshot`, update `onNodesChange`, `updateNodeData`, `duplicateSelection`.

- [ ] **Step 1: Write failing tests first** in `src/state/store.test.ts`

Add these tests at the end of the existing `describe("store", ...)` block:

```ts
it("addNode in minimalist mode uses archetype label (not tool label)", () => {
  useStore.setState({ viewMode: "minimalist" });
  fresh().addNode("database", "postgresql", { x: 0, y: 0 });
  // archetype "database" label is "Database" (from catalog)
  expect(fresh().nodes[0].data.label).toBe("Database");
});

it("addNode in real mode uses tool label", () => {
  useStore.setState({ viewMode: "real" });
  fresh().addNode("database", "postgresql", { x: 0, y: 0 });
  expect(fresh().nodes[0].data.label).toBe("PostgreSQL");
});

it("addNote creates a noteNode with default text, is undoable", () => {
  fresh().addNote({ x: 50, y: 60 });
  expect(fresh().nodes).toHaveLength(1);
  const n = fresh().nodes[0];
  expect(n.type).toBe("noteNode");
  expect((n as import("@/lib/types").NoteNode).data.text).toBe("Note");
  fresh().undo();
  expect(fresh().nodes).toHaveLength(0);
});

it("addBoundary creates a boundaryNode with default label and size, is undoable", () => {
  fresh().addBoundary({ x: 10, y: 20 });
  expect(fresh().nodes).toHaveLength(1);
  const n = fresh().nodes[0];
  expect(n.type).toBe("boundaryNode");
  expect(n.width).toBe(320);
  expect(n.height).toBe(220);
  expect((n as import("@/lib/types").BoundaryNode).data.label).toBe("Boundary");
  expect(n.zIndex).toBe(-1);
  fresh().undo();
  expect(fresh().nodes).toHaveLength(0);
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx vitest run src/state/store.test.ts 2>&1 | tail -20
```

Expected: test failures for the 4 new tests.

- [ ] **Step 3: Update store.ts**

Replace the entire store.ts with the widened version. Key changes:
1. Import `AppNode`, `NoteNode`, `BoundaryNode` from types
2. `Snapshot` uses `AppNode[]`
3. All `nodes: SysNode[]` → `nodes: AppNode[]`
4. `onNodesChange` signature: `NodeChange<AppNode>[]`
5. `setNodes` signature: `nodes: AppNode[]`
6. `addNode` uses `getArchetype(archetype)?.label` when `viewMode === 'minimalist'`
7. Add `addNote(position)` and `addBoundary(position)` actions
8. `duplicateSelection` copies `AppNode`
9. `updateNodeData`: keep loosely typed — `data: Record<string, unknown>` internally; type signature stays pragmatic
10. `setAll` signature accepts `AppNode[]`

```ts
import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import type {
  AppNode,
  SysNode,
  NoteNode,
  BoundaryNode,
  SysEdge,
  ViewMode,
  NodeStyle,
  LayoutDirection,
  SysNodeData,
} from "@/lib/types";
import { getArchetype, getTool } from "@/lib/catalog";
import { HISTORY_CAP } from "@/config";

type Snapshot = { nodes: AppNode[]; edges: SysEdge[] };

export type Theme = "dark" | "light";

const THEME_KEY = "schemamorph:theme";

function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // ignore — e.g. storage disabled
  }
  return "dark";
}

export type StoreState = {
  nodes: AppNode[];
  edges: SysEdge[];
  viewMode: ViewMode;
  nodeStyle: NodeStyle;
  layoutDirection: LayoutDirection;
  theme: Theme;
  locked: boolean;
  panelSuppressed: boolean;
  past: Snapshot[];
  future: Snapshot[];

  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<SysEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: SysEdge[]) => void;

  addNode: (
    archetype: string,
    concreteTool: string,
    position: { x: number; y: number },
  ) => void;
  addNote: (position: { x: number; y: number }) => void;
  addBoundary: (position: { x: number; y: number }) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  updateEdgeData: (
    id: string,
    data: Partial<NonNullable<SysEdge["data"]>>,
  ) => void;
  toggleEdgeAnimated: (id: string) => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  selectAll: () => void;
  nudgeSelection: (dx: number, dy: number) => void;
  applyPositions: (positions: Map<string, { x: number; y: number }>) => void;

  setViewMode: (m: ViewMode) => void;
  toggleViewMode: () => void;
  setNodeStyle: (s: NodeStyle) => void;
  setLayoutDirection: (d: LayoutDirection) => void;
  setTheme: (t: Theme) => void;
  toggleLocked: () => void;
  setPanelSuppressed: (v: boolean) => void;

  snapshot: () => void;
  undo: () => void;
  redo: () => void;
  setAll: (
    nodes: AppNode[],
    edges: SysEdge[],
    meta?: { viewMode?: ViewMode; nodeStyle?: NodeStyle; locked?: boolean },
  ) => void;
  reset: () => void;
};

const clone = <T>(v: T): T => structuredClone(v);

const _initialTheme = loadTheme();
if (typeof document !== "undefined") {
  document.documentElement.dataset.theme = _initialTheme;
}

export const useStore = create<StoreState>((set, get) => ({
  nodes: [],
  edges: [],
  viewMode: "minimalist",
  nodeStyle: "card",
  layoutDirection: "LR",
  theme: _initialTheme,
  locked: false,
  panelSuppressed: false,
  past: [],
  future: [],

  snapshot: () => {
    const { nodes, edges, past } = get();
    set({
      past: [...past, clone({ nodes, edges })].slice(-HISTORY_CAP),
      future: [],
    });
  },

  undo: () => {
    const { past, future, nodes, edges } = get();
    const prev = past[past.length - 1];
    if (!prev) return;
    set({
      nodes: prev.nodes,
      edges: prev.edges,
      past: past.slice(0, -1),
      future: [...future, clone({ nodes, edges })],
    });
  },

  redo: () => {
    const { past, future, nodes, edges } = get();
    const next = future[future.length - 1];
    if (!next) return;
    set({
      nodes: next.nodes,
      edges: next.edges,
      future: future.slice(0, -1),
      past: [...past, clone({ nodes, edges })],
    });
  },

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),
  onConnect: (connection) => {
    get().snapshot();
    set({
      edges: addEdge({ ...connection, type: "sysEdge", data: {} }, get().edges),
    });
  },
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (archetype, concreteTool, position) => {
    get().snapshot();
    const tool = getTool(concreteTool);
    const { viewMode } = get();
    const label =
      viewMode === "minimalist"
        ? (getArchetype(archetype)?.label ?? tool?.label ?? concreteTool)
        : (tool?.label ?? concreteTool);
    const node: SysNode = {
      id: crypto.randomUUID(),
      type: "sysNode",
      position,
      data: { archetype, concreteTool, label },
    };
    set({ nodes: [...get().nodes, node] });
  },

  addNote: (position) => {
    get().snapshot();
    const node: NoteNode = {
      id: crypto.randomUUID(),
      type: "noteNode",
      position,
      data: { text: "Note" },
    };
    set({ nodes: [...get().nodes, node] });
  },

  addBoundary: (position) => {
    get().snapshot();
    const node: BoundaryNode = {
      id: crypto.randomUUID(),
      type: "boundaryNode",
      position,
      width: 320,
      height: 220,
      zIndex: -1,
      data: { label: "Boundary" },
    };
    set({ nodes: [...get().nodes, node] });
  },

  updateNodeData: (id, data) => {
    get().snapshot();
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...(data as Partial<typeof n.data>) } } : n,
      ),
    });
  },

  updateEdgeData: (id, data) => {
    get().snapshot();
    set({
      edges: get().edges.map((e) =>
        e.id === id ? { ...e, data: { ...e.data, ...data } } : e,
      ),
    });
  },

  toggleEdgeAnimated: (id) => {
    get().snapshot();
    set({
      edges: get().edges.map((e) =>
        e.id === id ? { ...e, animated: !e.animated } : e,
      ),
    });
  },

  deleteSelection: () => {
    const { nodes, edges } = get();
    const doomed = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    const doomedEdges = new Set(
      edges.filter((e) => e.selected).map((e) => e.id),
    );
    if (!doomed.size && !doomedEdges.size) return;
    get().snapshot();
    set({
      nodes: nodes.filter((n) => !doomed.has(n.id)),
      edges: edges.filter(
        (e) =>
          !doomedEdges.has(e.id) &&
          !doomed.has(e.source) &&
          !doomed.has(e.target),
      ),
    });
  },

  duplicateSelection: () => {
    const selected = get().nodes.filter((n) => n.selected);
    if (!selected.length) return;
    get().snapshot();
    const copies: AppNode[] = selected.map((n) => ({
      ...clone(n),
      id: crypto.randomUUID(),
      position: { x: n.position.x + 24, y: n.position.y + 24 },
      selected: true,
    }));
    set({
      nodes: [
        ...get().nodes.map((n) => ({ ...n, selected: false })),
        ...copies,
      ],
    });
  },

  selectAll: () =>
    set({
      nodes: get().nodes.map((n) => ({ ...n, selected: true })),
      edges: get().edges.map((e) => ({ ...e, selected: true })),
    }),

  nudgeSelection: (dx, dy) =>
    set({
      nodes: get().nodes.map((n) =>
        n.selected
          ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
          : n,
      ),
    }),

  applyPositions: (positions) => {
    get().snapshot();
    set({
      nodes: get().nodes.map((n) => {
        const p = positions.get(n.id);
        return p ? { ...n, position: p } : n;
      }),
    });
  },

  setViewMode: (viewMode) => set({ viewMode }),
  toggleViewMode: () =>
    set({ viewMode: get().viewMode === "minimalist" ? "real" : "minimalist" }),
  setNodeStyle: (nodeStyle) => set({ nodeStyle }),
  setLayoutDirection: (layoutDirection) => set({ layoutDirection }),
  toggleLocked: () => set({ locked: !get().locked }),
  setPanelSuppressed: (v) => set({ panelSuppressed: v }),
  setTheme: (theme) => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore — e.g. storage disabled
    }
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme;
    }
    set({ theme });
  },

  setAll: (nodes, edges, meta) =>
    set({
      nodes,
      edges,
      past: [],
      future: [],
      ...(meta?.viewMode ? { viewMode: meta.viewMode } : {}),
      ...(meta?.nodeStyle ? { nodeStyle: meta.nodeStyle } : {}),
      locked: meta?.locked ?? false,
    }),

  reset: () =>
    set({
      nodes: [],
      edges: [],
      past: [],
      future: [],
      viewMode: "minimalist",
      nodeStyle: "card",
      layoutDirection: "LR",
      locked: false,
    }),
}));
```

**Note on `updateNodeData` typing:** The signature becomes `(id: string, data: Record<string, unknown>)`. This is a deliberate pragmatic loosening — the internal merge `{ ...n.data, ...(data as ...) }` is sound because callers always pass partial data for the correct node type. ConfigPanel's existing `Partial<SysNodeData>` calls remain valid since `Partial<SysNodeData>` is assignable to `Record<string, unknown>`. The existing `updateNodeData` callers in ConfigPanel (which reference `SysNodeData`) are also updated in Task 6.

- [ ] **Step 4: Fix the existing store test that checks `duplicateSelection` offset**

The existing test checks `copy.position` equals `{ x: 29, y: 29 }` for an initial position of `{ x: 5, y: 5 }` (5+24=29). This should still pass — verify nothing changed.

- [ ] **Step 5: Run store tests**

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx vitest run src/state/store.test.ts 2>&1 | tail -30
```

Expected: all tests pass including the 4 new ones.

---

## Task 3: Update sysdraw-file.ts — union schema + version 1.1.0

**Files:**
- Modify: `src/lib/sysdraw-file.ts`
- Modify: `docs/file-format.md`

- [ ] **Step 1: Write failing tests** in `src/lib/sysdraw-file.test.ts`

Add these tests at the end of the existing `describe("sysdraw file", ...)` block:

```ts
it("round-trips a noteNode (text preserved)", () => {
  const noteNode: import("./types").NoteNode = {
    id: "note1",
    type: "noteNode",
    position: { x: 10, y: 20 },
    data: { text: "100M DAU" },
  };
  const text = serializeSysdraw({
    nodes: [noteNode],
    edges: [],
    viewMode: "minimalist",
    nodeStyle: "card",
  });
  const result = parseSysdraw(text);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.data.nodes[0].type).toBe("noteNode");
  expect((result.data.nodes[0] as { data: { text: string } }).data.text).toBe(
    "100M DAU",
  );
});

it("round-trips a boundaryNode (label + width/height preserved)", () => {
  const boundary: import("./types").BoundaryNode = {
    id: "b1",
    type: "boundaryNode",
    position: { x: 0, y: 0 },
    width: 320,
    height: 220,
    data: { label: "VPC" },
  };
  const text = serializeSysdraw({
    nodes: [boundary],
    edges: [],
    viewMode: "minimalist",
    nodeStyle: "card",
  });
  const result = parseSysdraw(text);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const n = result.data.nodes[0];
  expect(n.type).toBe("boundaryNode");
  expect((n as { data: { label: string }; width?: number }).data.label).toBe("VPC");
  expect((n as { width?: number }).width).toBe(320);
  expect((n as { height?: number }).height).toBe(220);
});

it("v1.0 file (all sysNode) still parses correctly — backward compatible", () => {
  const oldFile = JSON.stringify({
    version: "1.0.0",
    meta: { viewMode: "minimalist" },
    nodes: [
      {
        id: "n1",
        type: "sysNode",
        position: { x: 0, y: 0 },
        data: { archetype: "database", concreteTool: "mysql", label: "DB" },
      },
    ],
    edges: [],
  });
  const result = parseSysdraw(oldFile);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.data.nodes[0].type).toBe("sysNode");
});

it("version is 1.1.0 after bump", () => {
  const text = serializeSysdraw({
    nodes: [],
    edges: [],
    viewMode: "minimalist",
    nodeStyle: "card",
  });
  const parsed = JSON.parse(text) as { version: string };
  expect(parsed.version).toBe("1.1.0");
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx vitest run src/lib/sysdraw-file.test.ts 2>&1 | tail -20
```

Expected: 4 new tests fail (version still 1.0.0, noteNode/boundaryNode not in schema).

- [ ] **Step 3: Update `src/lib/sysdraw-file.ts`**

Replace the entire file:

```ts
import { z } from "zod";
import type { AppNode, SysEdge, ViewMode, NodeStyle } from "./types";

export const SYSDRAW_VERSION = "1.1.0";

const positionSchema = z.object({ x: z.number(), y: z.number() });

// --- Per-type node schemas ---

const sysNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("sysNode").catch("sysNode"),
  position: positionSchema,
  data: z.object({
    archetype: z.string().min(1),
    concreteTool: z.string().min(1),
    label: z.string(),
    customProperties: z.record(z.string(), z.string()).optional(),
  }),
});

const noteNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("noteNode"),
  position: positionSchema,
  data: z.object({
    text: z.string(),
  }),
});

const boundaryNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("boundaryNode"),
  position: positionSchema,
  width: z.number().optional(),
  height: z.number().optional(),
  data: z.object({
    label: z.string(),
  }),
});

// Union: items failing all three schemas are rejected (index path in error)
const anyNodeSchema = z.union([sysNodeSchema, noteNodeSchema, boundaryNodeSchema]);

const edgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  type: z.literal("sysEdge").catch("sysEdge"),
  animated: z.boolean().optional(),
  data: z
    .object({
      label: z.string().optional(),
      protocol: z.string().optional(),
      customProperties: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
});

const metaSchema = z
  .object({
    title: z.string().optional(),
    lastModified: z.string().optional(),
    viewMode: z.enum(["minimalist", "real"]).optional(),
    nodeStyle: z.enum(["symbol", "card", "plate"]).optional(),
    locked: z.boolean().optional(),
  })
  .catch({});

export const sysdrawFileSchema = z.object({
  version: z.string(),
  meta: metaSchema.default({}),
  nodes: z.array(anyNodeSchema),
  edges: z.array(edgeSchema),
});

export type SysdrawFile = z.infer<typeof sysdrawFileSchema>;

export function serializeSysdraw(state: {
  nodes: AppNode[];
  edges: SysEdge[];
  viewMode: ViewMode;
  nodeStyle: NodeStyle;
  title?: string;
  locked?: boolean;
}): string {
  const serializedNodes = state.nodes.map((n) => {
    if (n.type === "noteNode") {
      return {
        id: n.id,
        type: "noteNode" as const,
        position: n.position,
        data: { text: n.data.text },
      };
    }
    if (n.type === "boundaryNode") {
      return {
        id: n.id,
        type: "boundaryNode" as const,
        position: n.position,
        ...(n.width !== undefined ? { width: n.width } : {}),
        ...(n.height !== undefined ? { height: n.height } : {}),
        data: { label: n.data.label },
      };
    }
    // sysNode
    const sn = n as import("./types").SysNode;
    return {
      id: sn.id,
      type: "sysNode" as const,
      position: sn.position,
      data: {
        archetype: sn.data.archetype,
        concreteTool: sn.data.concreteTool,
        label: sn.data.label,
        ...(sn.data.customProperties
          ? { customProperties: sn.data.customProperties }
          : {}),
      },
    };
  });

  const file = {
    version: SYSDRAW_VERSION,
    meta: {
      title: state.title ?? "architecture",
      lastModified: new Date().toISOString(),
      viewMode: state.viewMode,
      nodeStyle: state.nodeStyle,
      ...(state.locked ? { locked: true } : {}),
    },
    nodes: serializedNodes,
    edges: state.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "sysEdge" as const,
      ...(e.animated ? { animated: true } : {}),
      data: {
        ...(e.data?.label !== undefined ? { label: e.data.label } : {}),
        ...(e.data?.protocol !== undefined ? { protocol: e.data.protocol } : {}),
        ...(e.data?.customProperties !== undefined
          ? { customProperties: e.data.customProperties }
          : {}),
      },
    })),
  };
  return JSON.stringify(file, null, 2);
}

export type ParseResult =
  | { ok: true; data: SysdrawFile }
  | { ok: false; error: string };

export function parseSysdraw(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "File is not valid JSON." };
  }
  const result = sysdrawFileSchema.safeParse(json);
  if (!result.success) {
    const issue = result.error.issues[0];
    return {
      ok: false,
      error: `Invalid file — ${issue.path.join(".") || "root"}: ${issue.message}`,
    };
  }
  return { ok: true, data: result.data };
}
```

**Important note on existing version test:** The existing test `expect(result.data.version).toBe("1.0.0")` in `sysdraw-file.test.ts` must be updated to `"1.1.0"` since the version bumped.

- [ ] **Step 4: Update existing version test in `src/lib/sysdraw-file.test.ts`**

Change line `expect(result.data.version).toBe("1.0.0");` to `expect(result.data.version).toBe("1.1.0");`

- [ ] **Step 5: Update `useFileIO.ts` cast** — `importSysdrawText` casts `result.data.nodes as SysNode[]` — change to `AppNode[]`:

In `src/hooks/useFileIO.ts`, change:
```ts
import type { SysNode, SysEdge } from "@/lib/types";
```
to:
```ts
import type { AppNode, SysEdge } from "@/lib/types";
```

And change:
```ts
useStore.getState().setAll(result.data.nodes as SysNode[], result.data.edges as SysEdge[], {
```
to:
```ts
useStore.getState().setAll(result.data.nodes as AppNode[], result.data.edges as SysEdge[], {
```

- [ ] **Step 6: Run sysdraw-file tests**

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx vitest run src/lib/sysdraw-file.test.ts 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 7: Update docs/file-format.md**

Replace the entire file:

```markdown
# .schemamorph File Format

Format version: **1.1.0** (independent of app releases)

A `.schemamorph` file is JSON:

| Field | Type | Notes |
|---|---|---|
| `version` | string | format version, currently `1.1.0` |
| `meta.title` | string? | diagram name, used for filenames |
| `meta.lastModified` | string? | ISO-8601 |
| `meta.viewMode` | `minimalist` \| `real`? | restored on load |
| `meta.nodeStyle` | `symbol` \| `card` \| `plate`? | restored on load |
| `nodes[]` | discriminated union on `type` | see node types table below |
| `edges[]` | `{ id, source, target, type: 'sysEdge', data?, animated? }` | `data: { label?, protocol? }`; `animated?: boolean` |

## Node Types (v1.1.0)

| `type` | Required fields | Optional fields | Notes |
|---|---|---|---|
| `sysNode` | `id, type, position, data.{archetype, concreteTool, label}` | `data.customProperties` | Component nodes (databases, queues, etc.) |
| `noteNode` | `id, type, position, data.{text}` | — | Sticky-note annotation (e.g. "100M DAU") |
| `boundaryNode` | `id, type, position, data.{label}` | `width, height` | Dashed grouping region (e.g. "VPC") |

Compatibility rules:
- **v1.0 → v1.1:** Old files (all `sysNode`) parse fine — backward compatible. New node types are additive.
- Unknown extra fields are stripped on import (forward compatible).
- Unknown `archetype`/`concreteTool` values load with a fallback badge — files survive catalog changes.
- Any breaking change bumps the major version and gets a migration note here.
- **Metadata pins** (typed per-archetype attributes) are stored in `customProperties` — no format change.

## Legacy extensions

Files with a `.schemaflip` or `.sysdraw` extension created before the SchemaMorph rename open
without any migration step — the JSON format is identical. The Load dialog
accepts `.schemamorph`, `.schemaflip`, and `.sysdraw` extensions.
```

---

## Task 4: Update layout.ts — exclude non-sysNode from dagre

**Files:**
- Modify: `src/lib/layout.ts`
- Modify: `src/lib/layout.test.ts`

- [ ] **Step 1: Write a failing test** in `src/lib/layout.test.ts`

Add after the existing tests:

```ts
it("excludes noteNode and boundaryNode from dagre layout (only sysNode positioned)", () => {
  const sysA: import("./types").SysNode = {
    id: "a",
    type: "sysNode",
    position: { x: 0, y: 0 },
    data: { archetype: "compute", concreteTool: "docker", label: "a" },
  };
  const note: import("./types").NoteNode = {
    id: "note1",
    type: "noteNode",
    position: { x: 999, y: 999 },
    data: { text: "annotation" },
  };
  const boundary: import("./types").BoundaryNode = {
    id: "bnd1",
    type: "boundaryNode",
    position: { x: 500, y: 500 },
    data: { label: "VPC" },
  };
  const allNodes: import("./types").AppNode[] = [sysA, note, boundary];
  const edges: import("./types").SysEdge[] = [];
  const positions = layoutPositions(allNodes, edges, "LR");
  // sysNode gets a position
  expect(positions.has("a")).toBe(true);
  // noteNode and boundaryNode are NOT in the returned map
  expect(positions.has("note1")).toBe(false);
  expect(positions.has("bnd1")).toBe(false);
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx vitest run src/lib/layout.test.ts 2>&1 | tail -20
```

Expected: the new test fails because `layoutPositions` currently accepts `SysNode[]` and doesn't filter.

- [ ] **Step 3: Update `src/lib/layout.ts`**

Replace the entire file:

```ts
import dagre from "@dagrejs/dagre";
import type { AppNode, SysNode, SysEdge, LayoutDirection } from "./types";

const FALLBACK_WIDTH = 180;
const FALLBACK_HEIGHT = 60;

/** Pure layout function — only positions sysNodes; noteNode/boundaryNode positions untouched. */
export function layoutPositions(
  nodes: AppNode[],
  edges: SysEdge[],
  direction: LayoutDirection = "LR",
): Map<string, { x: number; y: number }> {
  // Only dagre-layout component nodes; annotations/boundaries float freely
  const sysNodes = nodes.filter((n): n is SysNode => n.type === "sysNode");

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 90 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of sysNodes) {
    g.setNode(node.id, {
      width: node.measured?.width ?? FALLBACK_WIDTH,
      height: node.measured?.height ?? FALLBACK_HEIGHT,
    });
  }
  for (const edge of edges) g.setEdge(edge.source, edge.target);

  dagre.layout(g);

  return new Map(
    sysNodes.map((node) => {
      const { x, y, width, height } = g.node(node.id);
      return [node.id, { x: x - width / 2, y: y - height / 2 }];
    }),
  );
}
```

- [ ] **Step 4: Run layout tests**

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx vitest run src/lib/layout.test.ts 2>&1 | tail -20
```

Expected: all tests pass.

---

## Task 5: Create NoteNode component + tests

**Files:**
- Create: `src/components/canvas/NoteNode.tsx`
- Create: `src/components/canvas/NoteNode.test.tsx`

- [ ] **Step 1: Write failing tests** in `src/components/canvas/NoteNode.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { NoteNodeComponent } from "./NoteNode";
import { useStore } from "@/state/store";
import type { NoteNode } from "@/lib/types";

const nodeTypes = { noteNode: NoteNodeComponent };

function renderNote(data: NoteNode["data"], id = "note1") {
  const nodes: NoteNode[] = [
    { id, type: "noteNode", position: { x: 0, y: 0 }, data },
  ];
  return render(
    <ReactFlowProvider>
      <div style={{ width: 800, height: 600 }}>
        <ReactFlow nodes={nodes} edges={[]} nodeTypes={nodeTypes} />
      </div>
    </ReactFlowProvider>,
  );
}

beforeEach(() => useStore.getState().reset());

describe("NoteNode", () => {
  it("renders the text content", () => {
    renderNote({ text: "100M DAU" });
    expect(screen.getByText("100M DAU")).toBeInTheDocument();
  });

  it("has amber tinted appearance (amber class or style)", () => {
    renderNote({ text: "p95 < 200ms" });
    // The note container should have a data-testid we can target
    const el = screen.getByTestId("note-node");
    expect(el).toBeInTheDocument();
  });

  it("double-click enters edit mode — shows textarea", () => {
    renderNote({ text: "hello" });
    const el = screen.getByTestId("note-node");
    fireEvent.dblClick(el);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("textarea commit on blur updates store", () => {
    // Seed a noteNode in the store so updateNodeData works
    useStore.getState().addNote({ x: 0, y: 0 });
    const id = useStore.getState().nodes[0].id;
    useStore
      .getState()
      .setNodes(useStore.getState().nodes.map((n) => ({ ...n, selected: false })));

    const nodes: NoteNode[] = [
      {
        id,
        type: "noteNode",
        position: { x: 0, y: 0 },
        data: { text: "hello" },
      },
    ];
    render(
      <ReactFlowProvider>
        <div style={{ width: 800, height: 600 }}>
          <ReactFlow nodes={nodes} edges={[]} nodeTypes={nodeTypes} />
        </div>
      </ReactFlowProvider>,
    );

    const el = screen.getByTestId("note-node");
    fireEvent.dblClick(el);
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "updated note" } });
    fireEvent.blur(ta);

    const noteNode = useStore
      .getState()
      .nodes.find((n) => n.id === id) as NoteNode;
    expect(noteNode.data.text).toBe("updated note");
  });

  it("Escape cancels edit without updating", () => {
    useStore.getState().addNote({ x: 0, y: 0 });
    const id = useStore.getState().nodes[0].id;
    const nodes: NoteNode[] = [
      {
        id,
        type: "noteNode",
        position: { x: 0, y: 0 },
        data: { text: "original" },
      },
    ];
    render(
      <ReactFlowProvider>
        <div style={{ width: 800, height: 600 }}>
          <ReactFlow nodes={nodes} edges={[]} nodeTypes={nodeTypes} />
        </div>
      </ReactFlowProvider>,
    );

    fireEvent.dblClick(screen.getByTestId("note-node"));
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "discarded" } });
    fireEvent.keyDown(ta, { key: "Escape" });

    const noteNode = useStore
      .getState()
      .nodes.find((n) => n.id === id) as NoteNode;
    expect(noteNode.data.text).toBe("Note"); // default, unchanged
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — expect failure** (component doesn't exist yet)

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx vitest run src/components/canvas/NoteNode.test.tsx 2>&1 | tail -20
```

Expected: import error / file not found.

- [ ] **Step 3: Create `src/components/canvas/NoteNode.tsx`**

```tsx
import { memo, useState, useRef, useEffect } from "react";
import type { NodeProps } from "@xyflow/react";
import { useStore } from "@/state/store";
import type { NoteNode } from "@/lib/types";

export const NoteNodeComponent = memo(({ id, data, selected }: NodeProps<NoteNode>) => {
  const locked = useStore((s) => s.locked);
  const updateNodeData = useStore((s) => s.updateNodeData);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.text);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Keep draft in sync with data.text when not editing (e.g. ConfigPanel update)
  useEffect(() => {
    if (!editing) setDraft(data.text);
  }, [data.text, editing]);

  const startEdit = () => {
    if (locked) return;
    setDraft(data.text);
    setEditing(true);
  };

  const commit = () => {
    updateNodeData(id, { text: draft });
    setEditing(false);
  };

  const cancel = () => {
    setDraft(data.text);
    setEditing(false);
  };

  const ring = selected
    ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)]"
    : "";

  return (
    <div
      data-testid="note-node"
      onDoubleClick={startEdit}
      className={`relative min-w-[120px] min-h-[60px] rounded-md border p-2 text-xs ${ring}`}
      style={{
        background: "#fbbf2415",
        borderColor: "#fbbf2440",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {editing ? (
        <textarea
          ref={taRef}
          autoFocus
          className="w-full min-h-[48px] resize-none bg-transparent text-xs text-[var(--text)] outline-none"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
        />
      ) : (
        <span className="text-[var(--text)]">{data.text}</span>
      )}
    </div>
  );
});
NoteNodeComponent.displayName = "NoteNodeComponent";
```

- [ ] **Step 4: Run NoteNode tests**

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx vitest run src/components/canvas/NoteNode.test.tsx 2>&1 | tail -30
```

Expected: all tests pass.

---

## Task 6: Create BoundaryNode component + tests

**Files:**
- Create: `src/components/canvas/BoundaryNode.tsx`
- Create: `src/components/canvas/BoundaryNode.test.tsx`

- [ ] **Step 1: Write failing tests** in `src/components/canvas/BoundaryNode.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { BoundaryNodeComponent } from "./BoundaryNode";
import { useStore } from "@/state/store";
import type { BoundaryNode } from "@/lib/types";

const nodeTypes = { boundaryNode: BoundaryNodeComponent };

function renderBoundary(data: BoundaryNode["data"], selected = false) {
  const nodes: BoundaryNode[] = [
    {
      id: "b1",
      type: "boundaryNode",
      position: { x: 0, y: 0 },
      width: 320,
      height: 220,
      selected,
      data,
    },
  ];
  return render(
    <ReactFlowProvider>
      <div style={{ width: 800, height: 600 }}>
        <ReactFlow nodes={nodes} edges={[]} nodeTypes={nodeTypes} />
      </div>
    </ReactFlowProvider>,
  );
}

beforeEach(() => useStore.getState().reset());

describe("BoundaryNode", () => {
  it("renders the label text", () => {
    renderBoundary({ label: "VPC" });
    expect(screen.getByText("VPC")).toBeInTheDocument();
  });

  it("has dashed border style", () => {
    renderBoundary({ label: "Region A" });
    const el = screen.getByTestId("boundary-node");
    // Check for dashed class or inline style
    const style = window.getComputedStyle(el);
    // The component applies borderStyle dashed via class; check class contains 'dashed'
    expect(el.className).toMatch(/dashed/);
  });

  it("renders label in top-left area (muted text-xs)", () => {
    renderBoundary({ label: "K8s cluster" });
    const label = screen.getByText("K8s cluster");
    // Should have muted/small styling — just verify it renders correctly
    expect(label).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx vitest run src/components/canvas/BoundaryNode.test.tsx 2>&1 | tail -20
```

Expected: import error.

- [ ] **Step 3: Create `src/components/canvas/BoundaryNode.tsx`**

```tsx
import { memo } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { useStore } from "@/state/store";
import type { BoundaryNode } from "@/lib/types";

export const BoundaryNodeComponent = memo(
  ({ data, selected }: NodeProps<BoundaryNode>) => {
    const locked = useStore((s) => s.locked);
    const ring = selected
      ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)]"
      : "";

    return (
      <div
        data-testid="boundary-node"
        className={`relative h-full w-full rounded-xl border border-dashed ${ring}`}
        style={{
          borderColor: "var(--muted)",
          background: "color-mix(in srgb, var(--muted) 4%, transparent)",
          minWidth: 160,
          minHeight: 120,
        }}
      >
        <NodeResizer
          isVisible={selected && !locked}
          minWidth={160}
          minHeight={120}
        />
        <span className="absolute left-2 top-1.5 text-xs text-[var(--muted)]">
          {data.label}
        </span>
      </div>
    );
  },
);
BoundaryNodeComponent.displayName = "BoundaryNodeComponent";
```

- [ ] **Step 4: Run BoundaryNode tests**

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx vitest run src/components/canvas/BoundaryNode.test.tsx 2>&1 | tail -20
```

Expected: all tests pass.

---

## Task 7: Register new node types in Canvas.tsx + update onDrop

**Files:**
- Modify: `src/components/canvas/Canvas.tsx`

No new test file needed — Canvas integration tested via Palette tests. Update Canvas to:
1. Import and register `NoteNodeComponent` and `BoundaryNodeComponent`
2. Branch `onDrop` on `kind` field in the JSON payload

- [ ] **Step 1: Update `src/components/canvas/Canvas.tsx`**

```tsx
import { useCallback } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  SelectionMode,
  useReactFlow,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useStore } from "@/state/store";
import { SysNodeComponent } from "./SysNode";
import { NoteNodeComponent } from "./NoteNode";
import { BoundaryNodeComponent } from "./BoundaryNode";
import { SysEdgeComponent } from "./SysEdge";
import { getArchetype } from "@/lib/catalog";

const nodeTypes = {
  sysNode: SysNodeComponent,
  noteNode: NoteNodeComponent,
  boundaryNode: BoundaryNodeComponent,
};
const edgeTypes: EdgeTypes = { sysEdge: SysEdgeComponent };

export const DND_MIME = "application/sysdraw-node";

export function Canvas() {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const onNodesChange = useStore((s) => s.onNodesChange);
  const onEdgesChange = useStore((s) => s.onEdgesChange);
  const onConnect = useStore((s) => s.onConnect);
  const snapshot = useStore((s) => s.snapshot);
  const addNode = useStore((s) => s.addNode);
  const addNote = useStore((s) => s.addNote);
  const addBoundary = useStore((s) => s.addBoundary);
  const theme = useStore((s) => s.theme);
  const locked = useStore((s) => s.locked);
  const setPanelSuppressed = useStore((s) => s.setPanelSuppressed);
  const { screenToFlowPosition } = useReactFlow();

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (locked) return;
      const raw = event.dataTransfer.getData(DND_MIME);
      if (!raw) return;
      const payload = JSON.parse(raw) as {
        kind?: "note" | "boundary";
        archetype?: string;
        tool?: string;
      };
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      if (payload.kind === "note") {
        addNote(position);
        return;
      }
      if (payload.kind === "boundary") {
        addBoundary(position);
        return;
      }
      const { archetype = "", tool = "" } = payload;
      const concreteTool = tool || getArchetype(archetype)?.defaultTool || "";
      addNode(archetype, concreteTool, position);
    },
    [screenToFlowPosition, addNode, addNote, addBoundary, locked],
  );

  return (
    <div className="h-full w-full" data-testid="canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodesDraggable={!locked}
        nodesConnectable={!locked}
        onNodeDragStart={() => {
          if (!locked) {
            snapshot();
            setPanelSuppressed(true);
          }
        }}
        onNodeClick={() => setPanelSuppressed(false)}
        onPaneClick={() => setPanelSuppressed(false)}
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        deleteKeyCode={null}
        fitView
        proOptions={{ hideAttribution: false }}
        colorMode={theme === "light" ? "light" : "dark"}
        panOnScroll
        panOnScrollSpeed={0.8}
        zoomOnPinch
        zoomOnScroll={false}
        selectionOnDrag
        panOnDrag={[1, 2]}
        selectionMode={SelectionMode.Partial}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1}
          color="var(--canvas-dot)"
        />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx tsc -b --noEmit 2>&1 | head -40
```

Expected: no errors (or only errors in files not yet updated).

---

## Task 8: Update ConfigPanel — NoteConfigInner + BoundaryConfigInner

**Files:**
- Modify: `src/components/config-panel/ConfigPanel.tsx`
- Modify: `src/components/config-panel/ConfigPanel.test.tsx`

- [ ] **Step 1: Write failing tests** — add to `ConfigPanel.test.tsx` at the end of the describe block:

```tsx
// --- NoteNode config ---
it("noteNode selected → shows Note panel with textarea", () => {
  useStore.getState().addNote({ x: 0, y: 0 });
  useStore
    .getState()
    .setNodes(useStore.getState().nodes.map((n) => ({ ...n, selected: true })));
  render(<ConfigPanel />);
  expect(screen.getByText("Note")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: /note text/i })).toBeInTheDocument();
});

it("noteNode textarea commit on blur updates store", async () => {
  const user = userEvent.setup();
  useStore.getState().addNote({ x: 0, y: 0 });
  useStore
    .getState()
    .setNodes(useStore.getState().nodes.map((n) => ({ ...n, selected: true })));
  render(<ConfigPanel />);
  const ta = screen.getByRole("textbox", { name: /note text/i });
  await user.clear(ta);
  await user.type(ta, "p95 < 200ms");
  await user.tab();
  const noteNode = useStore.getState().nodes[0] as import("@/lib/types").NoteNode;
  expect(noteNode.data.text).toBe("p95 < 200ms");
});

// --- BoundaryNode config ---
it("boundaryNode selected → shows Boundary panel with label input", () => {
  useStore.getState().addBoundary({ x: 0, y: 0 });
  useStore
    .getState()
    .setNodes(useStore.getState().nodes.map((n) => ({ ...n, selected: true })));
  render(<ConfigPanel />);
  expect(screen.getByText("Boundary")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: /boundary label/i })).toBeInTheDocument();
});

it("boundary label commit updates store", async () => {
  const user = userEvent.setup();
  useStore.getState().addBoundary({ x: 0, y: 0 });
  useStore
    .getState()
    .setNodes(useStore.getState().nodes.map((n) => ({ ...n, selected: true })));
  render(<ConfigPanel />);
  const input = screen.getByRole("textbox", { name: /boundary label/i });
  await user.clear(input);
  await user.type(input, "VPC");
  await user.tab();
  const bn = useStore.getState().nodes[0] as import("@/lib/types").BoundaryNode;
  expect(bn.data.label).toBe("VPC");
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx vitest run src/components/config-panel/ConfigPanel.test.tsx 2>&1 | tail -30
```

Expected: 4 new tests fail.

- [ ] **Step 3: Update `src/components/config-panel/ConfigPanel.tsx`**

Add imports at top (update the existing type imports):
```tsx
import type { SysNode, SysEdge, NoteNode, BoundaryNode } from "@/lib/types";
```

Add two new inner components before the `ConfigPanel` export function:

```tsx
function NoteConfigInner({ node }: { node: NoteNode }) {
  const updateNodeData = useStore((s) => s.updateNodeData);
  const locked = useStore((s) => s.locked);
  const [draft, setDraft] = useState<string | null>(null);

  const { data } = node;

  const commit = () => {
    if (draft !== null && draft !== data.text) {
      updateNodeData(node.id, { text: draft });
    }
    setDraft(null);
  };

  return (
    <aside
      data-testid="config-panel"
      className="h-full w-full overflow-y-auto border-l border-[var(--border)] bg-[var(--panel)] p-3"
    >
      <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">
        Note
      </div>
      <label className={labelCls} htmlFor="cfg-note-text">
        Note text
      </label>
      <textarea
        id="cfg-note-text"
        aria-label="Note text"
        className={`${inputCls} min-h-[80px] resize-y`}
        value={draft ?? data.text}
        disabled={locked}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
      />
    </aside>
  );
}

function BoundaryConfigInner({ node }: { node: BoundaryNode }) {
  const updateNodeData = useStore((s) => s.updateNodeData);
  const locked = useStore((s) => s.locked);
  const [labelDraft, setLabelDraft] = useState<string | null>(null);

  const { data } = node;

  const commitLabel = () => {
    if (labelDraft !== null && labelDraft !== data.label) {
      updateNodeData(node.id, { label: labelDraft });
    }
    setLabelDraft(null);
  };

  return (
    <aside
      data-testid="config-panel"
      className="h-full w-full overflow-y-auto border-l border-[var(--border)] bg-[var(--panel)] p-3"
    >
      <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">
        Boundary
      </div>
      <label className={labelCls} htmlFor="cfg-boundary-label">
        Boundary label
      </label>
      <input
        id="cfg-boundary-label"
        aria-label="Boundary label"
        className={inputCls}
        value={labelDraft ?? data.label}
        disabled={locked}
        onChange={(e) => setLabelDraft(e.target.value)}
        onBlur={commitLabel}
        onKeyDown={(e) => e.key === "Enter" && commitLabel()}
      />
    </aside>
  );
}
```

Update the `ConfigPanel` export function to branch on node type:

```tsx
export function ConfigPanel() {
  const node = useStore((s) => s.nodes.find((n) => n.selected));
  const edge = useStore((s) => s.edges.find((e) => e.selected));
  const panelSuppressed = useStore((s) => s.panelSuppressed);

  if (node && !panelSuppressed) {
    if (node.type === "noteNode")
      return <NoteConfigInner key={node.id} node={node as NoteNode} />;
    if (node.type === "boundaryNode")
      return <BoundaryConfigInner key={node.id} node={node as BoundaryNode} />;
    return <ConfigPanelInner key={node.id} node={node as SysNode} />;
  }
  if (edge) return <EdgeConfigInner key={edge.id} edge={edge} />;
  return null;
}
```

Also update `ConfigPanelInner`'s `updateNodeData` call to use the relaxed signature. The existing call `updateNodeData(node.id, { label: labelDraft })` is fine since `string` is assignable to `unknown`. No change needed there.

- [ ] **Step 4: Run ConfigPanel tests**

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx vitest run src/components/config-panel/ConfigPanel.test.tsx 2>&1 | tail -30
```

Expected: all tests pass.

---

## Task 9: Update Palette — Annotations section + spawn handlers

**Files:**
- Modify: `src/components/sidebar/Palette.tsx`
- Modify: `src/components/sidebar/Palette.test.tsx`

- [ ] **Step 1: Write failing tests** — add to `Palette.test.tsx` at the end of the describe block:

```tsx
describe("Annotations section", () => {
  it("renders Annotations heading", () => {
    setup();
    expect(screen.getByText(/annotations/i)).toBeInTheDocument();
  });

  it("Note item is present", () => {
    setup();
    expect(screen.getByText("Note")).toBeInTheDocument();
  });

  it("Boundary item is present", () => {
    setup();
    expect(screen.getByText("Boundary")).toBeInTheDocument();
  });

  it("Note click spawns a noteNode", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("Note"));
    expect(useStore.getState().nodes).toHaveLength(1);
    expect(useStore.getState().nodes[0].type).toBe("noteNode");
  });

  it("Boundary click spawns a boundaryNode", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("Boundary"));
    expect(useStore.getState().nodes).toHaveLength(1);
    expect(useStore.getState().nodes[0].type).toBe("boundaryNode");
  });

  it("Note disabled when locked", async () => {
    useStore.setState({ locked: true });
    setup();
    const noteBtn = screen.getByText("Note").closest("[role='button']");
    expect(noteBtn).toHaveAttribute("aria-disabled", "true");
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx vitest run src/components/sidebar/Palette.test.tsx 2>&1 | tail -20
```

Expected: 6 new tests fail.

- [ ] **Step 3: Update `src/components/sidebar/Palette.tsx`**

Add imports at the top:
```tsx
import { StickyNote, BoxSelect } from "lucide-react";
```

Add `addNote` and `addBoundary` to the store destructuring inside `Palette`:
```tsx
const addNote = useStore((s) => s.addNote);
const addBoundary = useStore((s) => s.addBoundary);
```

Add `spawnNote` and `spawnBoundary` callbacks alongside existing `spawn`:
```tsx
const spawnNote = useCallback(() => {
  if (locked) return;
  const center = screenToFlowPosition({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
  addNote({
    x: center.x + Math.random() * 40 - 20,
    y: center.y + Math.random() * 40 - 20,
  });
}, [screenToFlowPosition, addNote, locked]);

const spawnBoundary = useCallback(() => {
  if (locked) return;
  const center = screenToFlowPosition({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
  addBoundary({
    x: center.x + Math.random() * 40 - 20,
    y: center.y + Math.random() * 40 - 20,
  });
}, [screenToFlowPosition, addBoundary, locked]);
```

Add at the **bottom** of the returned JSX in the expanded sidebar (just before `</aside>` in the non-collapsed return), after the archetypes section and search results section. This goes at the very end of the sidebar content regardless of search state. Add inside the non-collapsed `<aside>` return, after the search results/archetype block:

```tsx
{/* Annotations section — always visible, not searchable */}
<div className="mt-3">
  <div className="mb-1.5 flex items-center gap-1">
    <div className="flex-1 border-t border-[var(--border)]" />
    <span className="shrink-0 text-[9px] uppercase tracking-widest text-[var(--muted)]">
      Annotations
    </span>
    <div className="flex-1 border-t border-[var(--border)]" />
  </div>

  {/* Note item */}
  <div
    role="button"
    tabIndex={0}
    draggable={!locked}
    aria-disabled={locked ? true : undefined}
    onDragStart={(e) => {
      if (locked) { e.preventDefault(); return; }
      e.dataTransfer.setData(DND_MIME, JSON.stringify({ kind: "note" }));
      e.dataTransfer.effectAllowed = "move";
    }}
    onClick={spawnNote}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); spawnNote(); }
    }}
    className={`mb-1 flex items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--card)] ${locked ? "cursor-not-allowed opacity-50" : "cursor-grab"}`}
  >
    <StickyNote size={14} className="text-amber-400 shrink-0" />
    Note
  </div>

  {/* Boundary item */}
  <div
    role="button"
    tabIndex={0}
    draggable={!locked}
    aria-disabled={locked ? true : undefined}
    onDragStart={(e) => {
      if (locked) { e.preventDefault(); return; }
      e.dataTransfer.setData(DND_MIME, JSON.stringify({ kind: "boundary" }));
      e.dataTransfer.effectAllowed = "move";
    }}
    onClick={spawnBoundary}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); spawnBoundary(); }
    }}
    className={`flex items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--card)] ${locked ? "cursor-not-allowed opacity-50" : "cursor-grab"}`}
  >
    <BoxSelect size={14} className="text-[var(--muted)] shrink-0" />
    Boundary
  </div>
</div>
```

- [ ] **Step 4: Run Palette tests**

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx vitest run src/components/sidebar/Palette.test.tsx 2>&1 | tail -30
```

Expected: all tests pass.

---

## Task 10: Fix ripple effects — SysNode.tsx, useFileIO.ts, remaining type errors

**Files:**
- Modify: `src/components/canvas/SysNode.tsx` — the import of `SysNode` still works (SysNode is still exported)
- Modify: `src/hooks/useFileIO.ts` — already done in Task 3 Step 5
- Verify `src/App.tsx` — uses `useStore((s) => s.nodes.find((n) => n.selected))` which returns `AppNode | undefined`; App.tsx accesses `isPanelVisible` which uses `n.selected` — that's on the Node base type, so fine

- [ ] **Step 1: Run typecheck**

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx tsc -b --noEmit 2>&1 | head -60
```

Expected: either clean or only small fixable issues. The key concern is `updateNodeData` — the existing `ConfigPanelInner` calls it with `Partial<SysNodeData>` which must be compatible with `Record<string, unknown>`.

- [ ] **Step 2: Fix any remaining type errors**

Common issues to fix:
- `ConfigPanel.tsx` imports `SysNodeData` for `updateNodeData` calls — these become `Record<string, unknown>` compatible, no change needed in callers
- `layout.ts` already updated to accept `AppNode[]`
- Any place importing `SysNode[]` for `nodes` from store needs updating to `AppNode[]`

If `SysNode.tsx` has import issues, update its imports from `SysNode` → still OK since `SysNode` is still exported.

---

## Task 11: Full test suite pass + typecheck + lint + build

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx vitest run 2>&1 | tail -50
```

Expected: all tests pass (catalog tests may report separate issues per task spec — note but don't fix).

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx tsc -b --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Run lint**

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx eslint src/lib/types.ts src/state/store.ts src/lib/sysdraw-file.ts src/lib/layout.ts src/components/canvas/NoteNode.tsx src/components/canvas/BoundaryNode.tsx src/components/canvas/Canvas.tsx src/components/config-panel/ConfigPanel.tsx src/components/sidebar/Palette.tsx src/hooks/useFileIO.ts 2>&1
```

Expected: no errors.

- [ ] **Step 4: Run formatter check on modified files**

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx prettier --check src/lib/types.ts src/state/store.ts src/lib/sysdraw-file.ts src/lib/layout.ts src/components/canvas/NoteNode.tsx src/components/canvas/BoundaryNode.tsx src/components/canvas/Canvas.tsx src/components/config-panel/ConfigPanel.tsx src/components/sidebar/Palette.tsx src/hooks/useFileIO.ts 2>&1
```

If any formatting issues:

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npx prettier --write src/lib/types.ts src/state/store.ts src/lib/sysdraw-file.ts src/lib/layout.ts src/components/canvas/NoteNode.tsx src/components/canvas/BoundaryNode.tsx src/components/canvas/Canvas.tsx src/components/config-panel/ConfigPanel.tsx src/components/sidebar/Palette.tsx src/hooks/useFileIO.ts
```

- [ ] **Step 5: Build**

```bash
cd /Users/dor.schreiber/Software/Tests/sysdraw && npm run build 2>&1 | tail -20
```

Expected: clean build, no errors.

---

## Self-Review Checklist

### Spec coverage

| Requirement | Task |
|---|---|
| Minimalist spawn label = archetype label | Task 2 (store.ts `addNode`) |
| Real mode spawn label = tool label | Task 2 (store.ts `addNode`) |
| `NoteNode` type + `AppNode` union | Task 1 (types.ts) |
| `BoundaryNode` type | Task 1 (types.ts) |
| store arrays widened to `AppNode[]` | Task 2 (store.ts) |
| `addNote` action | Task 2 (store.ts) |
| `addBoundary` action with zIndex -1 + default size 320×220 | Task 2 (store.ts) |
| NoteNode component — amber tint, whitespace-pre-wrap | Task 5 |
| NoteNode double-click inline edit | Task 5 |
| NoteNode Escape cancels | Task 5 |
| NoteNode Cmd/Ctrl+Enter commits | Task 5 |
| NoteNode no Handle components (no connections) | Task 5 (no Handle in component) |
| BoundaryNode dashed border, transparent fill | Task 6 |
| BoundaryNode NodeResizer | Task 6 |
| BoundaryNode label top-left | Task 6 |
| BoundaryNode no Handles | Task 6 |
| ConfigPanel — Note panel (textarea) | Task 8 |
| ConfigPanel — Boundary panel (label input) | Task 8 |
| Canvas registers new node types | Task 7 |
| Canvas onDrop branches on `kind` | Task 7 |
| File schema union (sysNode/noteNode/boundaryNode) | Task 3 |
| version bumped to 1.1.0 | Task 3 |
| boundaryNode width/height serialized | Task 3 |
| v1.0 files still parse | Task 3 |
| docs/file-format.md updated | Task 3 |
| layout.ts excludes non-sysNodes | Task 4 |
| Palette — Annotations section | Task 9 |
| Palette — Note item with StickyNote icon | Task 9 |
| Palette — Boundary item with BoxSelect icon | Task 9 |
| DND payload extended with `kind` | Task 7 + 9 |
| `updateNodeData` loosely typed internally | Task 2 |
| Annotations available in both modes | Task 9 (no mode gate on Annotations section) |
| Annotations disabled when locked | Task 9 |
| Duplicate/delete work via existing selection paths | Inherits from Task 2 (AppNode copies) |

### Type consistency check
- `addNote` / `addBoundary` in store → match `StoreState` interface
- `NoteNode`, `BoundaryNode` imported consistently across NoteNode.tsx, BoundaryNode.tsx, ConfigPanel.tsx, Canvas.tsx
- `updateNodeData` signature is `(id: string, data: Record<string, unknown>)` everywhere
- `layoutPositions` accepts `AppNode[]` (Task 4)
- `serializeSysdraw` accepts `nodes: AppNode[]` (Task 3)

### Potential gotcha: `updateNodeData` signature change
The existing `ConfigPanelInner` calls `updateNodeData(node.id, { label: labelDraft })` where `labelDraft` is `string`. `{ label: string }` is assignable to `Record<string, unknown>` — no cast needed. The TypeScript type `Partial<SysNodeData>` from the old signature is also assignable to `Record<string, unknown>`. Safe.

### Potential gotcha: `z.union` error paths with Zod v4
Zod v4's `z.union` error reporting gives the errors from the last schema in the union on failure. For the `nodes` array, a failing item gets an index path like `nodes.0` which satisfies the existing test `expect(result.error).toMatch(/nodes\.0/)`. Verify in Task 3 Step 6 that the existing "rejects node missing position" test still passes.
