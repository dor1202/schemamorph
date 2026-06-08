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
  StepNode,
  ArrowNode,
  SysEdge,
  ViewMode,
  NodeStyle,
  LayoutDirection,
} from "@/lib/types";
import { getArchetype, getTool } from "@/lib/catalog";
import { applyGrouping, absolutizeAll } from "@/lib/grouping";
import { HISTORY_CAP } from "@/config";

type Snapshot = { nodes: AppNode[]; edges: SysEdge[] };

export type Theme = "dark" | "light";

/** Tool armed from the phone palette sheet; next canvas tap places it. */
export type ArmedTool =
  | { kind: "tool"; archetype: string; tool: string }
  | { kind: "note" }
  | { kind: "title" }
  | { kind: "boundary" }
  | { kind: "step" }
  | { kind: "arrow" };

const THEME_KEY = "schemamorph:theme";
const MINIMAP_KEY = "schemamorph:minimap";

function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // ignore — e.g. storage disabled
  }
  return "dark";
}

function loadMinimap(): boolean {
  try {
    const stored = localStorage.getItem(MINIMAP_KEY);
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch {
    // ignore — e.g. storage disabled
  }
  return false;
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
  showMinimap: boolean;
  past: Snapshot[];
  future: Snapshot[];
  armedTool: ArmedTool | null;
  touchSelectMode: boolean;
  /** Transient: true while a node drag gesture is in progress (not snapshotted/serialized). */
  dragging: boolean;
  /** Transient: true when the dragged node is hovering over the delete bin. */
  overBin: boolean;

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
  addNote: (
    position: { x: number; y: number },
    opts?: { size?: "small" | "normal" | "title"; text?: string },
  ) => void;
  addBoundary: (position: { x: number; y: number }) => void;
  addStep: (position: { x: number; y: number }) => void;
  addArrow: (position: { x: number; y: number }) => void;
  updateArrowEnd: (id: string, delta: { dx: number; dy: number }) => void;
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
  applyPositions: (
    positions: Map<
      string,
      { x: number; y: number; width?: number; height?: number }
    >,
  ) => void;

  setViewMode: (m: ViewMode) => void;
  toggleViewMode: () => void;
  setNodeStyle: (s: NodeStyle) => void;
  setLayoutDirection: (d: LayoutDirection) => void;
  setTheme: (t: Theme) => void;
  toggleLocked: () => void;
  setPanelSuppressed: (v: boolean) => void;
  toggleMinimap: () => void;
  armTool: (t: ArmedTool | null) => void;
  setTouchSelectMode: (v: boolean) => void;
  setDragging: (v: boolean) => void;
  setOverBin: (v: boolean) => void;
  deleteNodes: (ids: string[]) => void;

  regroup: () => void;

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
// Apply theme to document immediately at module load (SPA boot)
if (typeof document !== "undefined") {
  document.documentElement.dataset.theme = _initialTheme;
}

const _initialMinimap = loadMinimap();

export const useStore = create<StoreState>((set, get) => ({
  nodes: [],
  edges: [],
  viewMode: "minimalist",
  nodeStyle: "card",
  layoutDirection: "LR",
  theme: _initialTheme,
  locked: false,
  panelSuppressed: false,
  showMinimap: _initialMinimap,
  past: [],
  future: [],
  armedTool: null,
  touchSelectMode: false,
  dragging: false,
  overBin: false,

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

  // No snapshot: drag/resize callers snapshot at gesture start — snapshotting here would add an undo entry per drag-stop.
  regroup: () => set({ nodes: applyGrouping(get().nodes) }),

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

  addNote: (position, opts) => {
    get().snapshot();
    const node: NoteNode = {
      id: crypto.randomUUID(),
      type: "noteNode",
      position,
      zIndex: 1,
      data: {
        text: opts?.text ?? "Note",
        ...(opts?.size !== undefined ? { size: opts.size } : {}),
      },
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

  addStep: (position) => {
    get().snapshot();
    const node: StepNode = {
      id: crypto.randomUUID(),
      type: "stepNode",
      position,
      zIndex: 1,
      data: { label: "" },
    };
    set({ nodes: [...get().nodes, node] });
  },

  addArrow: (position) => {
    get().snapshot();
    const node: ArrowNode = {
      id: crypto.randomUUID(),
      type: "arrowNode",
      position,
      zIndex: 1,
      data: { dx: 140, dy: -60 },
    };
    set({ nodes: [...get().nodes, node] });
  },

  updateArrowEnd: (id, { dx, dy }) => {
    // No snapshot — caller snapshots once on pointerdown (one undo entry per drag)
    set({
      nodes: get().nodes.map((n) =>
        n.id === id && n.type === "arrowNode"
          ? ({
              ...n,
              data: { ...(n as ArrowNode).data, dx, dy },
            } as ArrowNode)
          : n,
      ),
    });
  },

  updateNodeData: (id, data) => {
    get().snapshot();
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? ({ ...n, data: { ...n.data, ...data } } as AppNode) : n,
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
    // Absolutize while parents still exist so survivors get correct absolute positions,
    // then filter, then regroup survivors.
    const survivors = absolutizeAll(nodes).filter((n) => !doomed.has(n.id));
    set({
      nodes: applyGrouping(survivors),
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
    const idMap = new Map(selected.map((n) => [n.id, crypto.randomUUID()]));
    const copies: AppNode[] = selected.map((n) => {
      const parentCopied = n.parentId !== undefined && idMap.has(n.parentId);
      const copy: AppNode = {
        ...clone(n),
        id: idMap.get(n.id)!,
        position: parentCopied
          ? { ...n.position } // relative; parent's +24 offset carries the member
          : { x: n.position.x + 24, y: n.position.y + 24 },
        selected: true,
      };
      if (copy.parentId && idMap.has(copy.parentId)) {
        copy.parentId = idMap.get(copy.parentId)!;
      }
      return copy;
    });
    set({
      nodes: applyGrouping([
        ...get().nodes.map((n) => ({ ...n, selected: false })),
        ...copies,
      ]),
    });
  },

  selectAll: () =>
    set({
      nodes: get().nodes.map((n) => ({ ...n, selected: true })),
      edges: get().edges.map((e) => ({ ...e, selected: true })),
    }),

  nudgeSelection: (dx, dy) =>
    set({
      nodes: applyGrouping(
        absolutizeAll(get().nodes).map((n) =>
          n.selected
            ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
            : n,
        ),
      ),
    }),

  applyPositions: (positions) => {
    get().snapshot();
    // Layout output is absolute; absolutize current nodes, apply positions, then regroup.
    const moved = absolutizeAll(get().nodes).map((n) => {
      const p = positions.get(n.id);
      if (!p) return n;
      const updated: AppNode = {
        ...n,
        position: { x: p.x, y: p.y },
        ...(p.width !== undefined ? { width: p.width } : {}),
        ...(p.height !== undefined ? { height: p.height } : {}),
      };
      return updated;
    });
    set({ nodes: applyGrouping(moved) });
  },

  setViewMode: (viewMode) => set({ viewMode }),
  toggleViewMode: () =>
    set({ viewMode: get().viewMode === "minimalist" ? "real" : "minimalist" }),
  setNodeStyle: (nodeStyle) => set({ nodeStyle }),
  setLayoutDirection: (layoutDirection) => set({ layoutDirection }),
  toggleLocked: () => set({ locked: !get().locked }),
  setPanelSuppressed: (v) => set({ panelSuppressed: v }),
  armTool: (armedTool) => set({ armedTool }),
  setTouchSelectMode: (touchSelectMode) => set({ touchSelectMode }),
  setDragging: (dragging) => set({ dragging }),
  setOverBin: (overBin) => set({ overBin }),

  deleteNodes: (ids) => {
    if (!ids.length) return;
    const { nodes, edges } = get();
    const doomed = new Set(ids);
    get().snapshot();
    // Absolutize while parents still exist, then filter, then regroup survivors.
    const survivors = absolutizeAll(nodes).filter((n) => !doomed.has(n.id));
    set({
      nodes: applyGrouping(survivors),
      edges: edges.filter(
        (e) => !doomed.has(e.source) && !doomed.has(e.target),
      ),
    });
  },

  toggleMinimap: () => {
    const next = !get().showMinimap;
    try {
      localStorage.setItem(MINIMAP_KEY, String(next));
    } catch {
      // ignore — e.g. storage disabled
    }
    set({ showMinimap: next });
  },
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

  setAll: (nodes, edges, meta) => {
    // Apply grouping first (derives parentId + relative positions from geometry),
    // preserving the boundaries-first ordering required by React Flow.
    const groupedNodes = applyGrouping(nodes);
    // Normalize zIndex by node type so old files get the current policy.
    // boundaryNode: -1 (renders behind), noteNode/stepNode/arrowNode: 1 (floats above), sysNode: undefined (default)
    // parentId set by applyGrouping is preserved through this map.
    const normalized = groupedNodes.map((n): AppNode => {
      if (n.type === "boundaryNode") return { ...n, zIndex: -1 };
      if (
        n.type === "noteNode" ||
        n.type === "stepNode" ||
        n.type === "arrowNode"
      )
        return { ...n, zIndex: 1 };
      // sysNode — clear any stale runtime zIndex (parentId survives)
      const { zIndex: _drop, ...rest } = n as AppNode & { zIndex?: number };
      void _drop;
      return rest as AppNode;
    });
    set({
      nodes: normalized,
      edges,
      past: [],
      future: [],
      ...(meta?.viewMode ? { viewMode: meta.viewMode } : {}),
      ...(meta?.nodeStyle ? { nodeStyle: meta.nodeStyle } : {}),
      locked: meta?.locked ?? false,
    });
  },

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
      armedTool: null,
      touchSelectMode: false,
      dragging: false,
      overBin: false,
      // theme is preserved: it's user preference, not diagram data
    }),
}));
