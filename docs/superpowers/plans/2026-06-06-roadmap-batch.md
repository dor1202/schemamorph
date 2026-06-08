# Roadmap Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship four roadmap features: vector-DB/AI catalog additions, Mermaid import, share-by-URL, and boundary parent-child grouping — per `docs/superpowers/specs/2026-06-06-roadmap-batch-design.md`.

**Architecture:** Each feature is independent and lands gate-green before the next. Catalog = JSON only. Mermaid = new pure parser module + dialog overlay + Toolbar wiring. Share = new compression module + `useFileIO` callback + boot hook. Grouping = new pure `grouping.ts` helpers threaded through store `setAll`/actions, serializer, and Canvas drag handlers; file format stays v1.2.0.

**Tech Stack:** React 18, React Flow v12 (`@xyflow/react`), Zustand, Zod, dagre, Vitest + @testing-library/react (jsdom). No new runtime dependencies.

> **⚠️ NO COMMITS.** Dor commits everything himself — never run `git commit` or `git push`. Where a normal plan would commit, instead run the verification command(s) and move on. After the final task, run THE GATE:
> `npm run typecheck && npm run lint && npm run format:check && npm run validate:catalog && npm run test && npm run build`

**Codebase facts the engineer needs (verified):**
- Store is a module singleton: `useStore` in `src/state/store.ts`. Bulk-load entry: `setAll(nodes, edges, meta?)` — clears history, normalizes zIndex.
- `layoutPositions(nodes, edges, direction)` (`src/lib/layout.ts`) is pure; reads `node.position` as **absolute** and `node.measured` with fallbacks 180×60; returns `Map<id, {x,y,width?,height?}>`.
- Toolbar "Load group" = the **File section of the settings popover** in `src/components/toolbar/Toolbar.tsx` (buttons "Load file…", "Export .schemamorph", "Export PNG").
- `simple-icons` check (installed version): `qdrant` ✅, `milvus` ✅, `mistralai` ✅ (already shipped). `vespa` exists but is the **Piaggio scooter brand — do NOT use for Vespa.ai**. Missing: pinecone, weaviate, chroma, cohere, pgvector, lancedb, togetherai, groq.
- Archetype `defaultTool`s: database→postgresql, gateway→nginx, compute→docker, cache→redis, queue→kafka, search→elasticsearch, ml→openai.
- jsdom test env (Node 25): `CompressionStream`/`DecompressionStream`/`Blob`/`Response` are available as Node globals — verified. `navigator.clipboard` must be mocked per-test.
- Prettier formats everything: run `npm run format` after creating files, BEFORE `format:check`.

---

## Feature 1 — Vector-DB / AI catalog additions

### Task 1: Add slug-based tools (Qdrant, Milvus) + regenerate icons

**Files:**
- Modify: `src/catalog/tools.json`
- Regenerate: `src/lib/icons.generated.ts` (via script — NEVER hand-edit)

- [ ] **Step 1: Add two entries to `src/catalog/tools.json`** under the other `search`-archetype tools (file is a flat object; insert near `elasticsearch`):

```json
"qdrant": {
  "archetype": "search",
  "label": "Qdrant",
  "iconSlug": "qdrant",
  "brandColor": "#DC244C"
},
"milvus": {
  "archetype": "search",
  "label": "Milvus",
  "iconSlug": "milvus",
  "brandColor": "#00A1EA"
}
```

- [ ] **Step 2: Regenerate the icon subset**

Run: `npm run generate:icons`
Expected: exit 0, `src/lib/icons.generated.ts` diff includes `qdrant` and `milvus` entries.

- [ ] **Step 3: Validate**

Run: `npm run validate:catalog && npm run test`
Expected: validator passes; existing catalog tests still green (counts in tests are not hardcoded — if one fails on count, update it to the new total).

### Task 2: Add svgPath tools (9 entries, no slugs available)

**Files:**
- Modify: `src/catalog/tools.json`

Glyphs below are simplified single-path 24×24 motifs of the public brand marks (catalog rule: visible mark required, bare initials forbidden). Brand colors are taken from public brand assets — close approximations are fine; legibility is handled downstream by `color.ts`.

- [ ] **Step 1: Add `search`-archetype entries**

```json
"pinecone": {
  "archetype": "search",
  "label": "Pinecone",
  "brandColor": "#201D1E",
  "svgPath": "M12 2l3 2.6-3 2.6-3-2.6L12 2zM7.6 6.8L12 10.4l4.4-3.6 2.3 2L12 14.6 5.3 8.8l2.3-2zM4.6 11.6L12 17.8l7.4-6.2 1.6 2.4L12 22l-9-8 1.6-2.4z"
},
"weaviate": {
  "archetype": "search",
  "label": "Weaviate",
  "brandColor": "#45D69F",
  "svgPath": "M12 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM6 13a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm12 0a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM10.4 8.9l-2.6 3.4-1.6-1.2 2.6-3.4 1.6 1.2zm3.2 0l1.6-1.2 2.6 3.4-1.6 1.2-2.6-3.4z"
},
"chroma": {
  "archetype": "search",
  "label": "Chroma",
  "brandColor": "#FFDE2D",
  "svgPath": "M8 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm8 0a6 6 0 0 1 0 12V6z"
},
"lancedb": {
  "archetype": "search",
  "label": "LanceDB",
  "brandColor": "#E6452F",
  "svgPath": "M21 3l-8.5 2.1 2.6 2.6L7 15.8l-2.4-.6L3 18.4l2.6.6.6 2.6 3.2-1.6-.6-2.4 8.1-8.1 2.6 2.6L21 3z"
},
"pgvector": {
  "archetype": "search",
  "label": "pgvector",
  "brandColor": "#336791",
  "svgPath": "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3v12c0 1.7-3.6 3-8 3s-8-1.3-8-3V6zm2 .8V18c.9.8 3 1.5 6 1.5s5.1-.7 6-1.5V6.8C16.7 7.6 14.5 8 12 8s-4.7-.4-6-1.2zM8 11.7h5.2l-1.6-1.6 1.4-1.4 4 4-4 4-1.4-1.4 1.6-1.6H8v-2z"
},
"vespa": {
  "archetype": "search",
  "label": "Vespa",
  "brandColor": "#FF9100",
  "svgPath": "M3 4h5.2L12 9.8 15.8 4H21l-9 13.5L3 4zm9 16.5l-1.7-2.6h3.4L12 20.5z"
}
```

**Do NOT use `"iconSlug": "vespa"`** — that slug is the Piaggio scooter brand, not Vespa.ai.
**Do NOT use `"iconSlug": "postgresql"` for pgvector** — must stay visually distinct from the existing PostgreSQL entry (the glyph above is cylinder + vector arrow).

- [ ] **Step 2: Add `ml`-archetype entries**

```json
"cohere": {
  "archetype": "ml",
  "label": "Cohere",
  "brandColor": "#39594D",
  "svgPath": "M12 3a9 9 0 1 1-9 9h2.5a6.5 6.5 0 1 0 6.5-6.5V3zm0 5a4 4 0 1 1-4 4h2.3A1.7 1.7 0 1 0 12 10.3V8z"
},
"togetherai": {
  "archetype": "ml",
  "label": "Together AI",
  "brandColor": "#0F6FFF",
  "svgPath": "M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm12.5 0a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z"
},
"groq": {
  "archetype": "ml",
  "label": "Groq",
  "brandColor": "#F55036",
  "svgPath": "M9 2h2v2.5h2V2h2v2.5h1A2.5 2.5 0 0 1 18.5 7v1H21v2h-2.5v2H21v2h-2.5v1a2.5 2.5 0 0 1-2.5 2.5h-1V20h-2v-2.5h-2V20H9v-2.5H8A2.5 2.5 0 0 1 5.5 15v-1H3v-2h2.5v-2H3V8h2.5V7A2.5 2.5 0 0 1 8 4.5h1V2zM7.5 6.5v11h9v-11h-9zm5 1.5l-2.3 4.2h1.8l-1 3.3 3.8-4.7h-1.9L14.3 8h-1.8z"
}
```

- [ ] **Step 3: Verify generated icons are NOT stale**

Run: `npm run generate:icons`
Expected: no diff to `src/lib/icons.generated.ts` (these 9 entries have no `iconSlug`).

- [ ] **Step 4: Validate + format + test**

Run: `npm run format && npm run validate:catalog && npm run test`
Expected: all pass.

- [ ] **Step 5: Visual spot-check (manual)**

Run: `npm run dev`, search palette in Real mode for "Pinecone", "Groq", "Vespa" — each shows its glyph (not initials) in both view modes. Note anything unrecognizable for follow-up; do not block.

---

## Feature 2 — Mermaid import

### Task 3: Mermaid parser (`parseMermaid`) — TDD

**Files:**
- Create: `src/lib/mermaid-import.ts`
- Test: `src/lib/mermaid-import.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/mermaid-import.test.ts
import { describe, it, expect } from "vitest";
import { parseMermaid } from "./mermaid-import";

describe("parseMermaid", () => {
  it("parses flowchart header direction", () => {
    const r = parseMermaid("flowchart TD\n A --> B");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.direction).toBe("TB");
    expect(r.nodes).toHaveLength(2);
    expect(r.edges).toHaveLength(1);
  });

  it("maps TD/TB/BT to TB and LR/RL to LR; defaults LR without header", () => {
    const td = parseMermaid("graph BT\n A --> B");
    const rl = parseMermaid("graph RL\n A --> B");
    const none = parseMermaid("A --> B");
    expect(td.ok && td.direction).toBe("TB");
    expect(rl.ok && rl.direction).toBe("LR");
    expect(none.ok && none.direction).toBe("LR");
  });

  it("maps shapes to archetypes with defaultTool", () => {
    const src = [
      "flowchart LR",
      'db[("Users DB")]',
      "gw{{API Gateway}}",
      "svc([Auth Service])",
      "proc[/ETL/]",
      "c((Session Cache))",
      "q>Events]",
      "plain[Worker]",
    ].join("\n");
    const r = parseMermaid(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const byId = Object.fromEntries(r.nodes.map((n) => [n.id, n]));
    expect(byId.db.data).toMatchObject({ archetype: "database", concreteTool: "postgresql", label: "Users DB" });
    expect(byId.gw.data).toMatchObject({ archetype: "gateway", concreteTool: "nginx" });
    expect(byId.svc.data.archetype).toBe("compute");
    expect(byId.proc.data.archetype).toBe("compute");
    expect(byId.c.data).toMatchObject({ archetype: "cache", concreteTool: "redis" });
    expect(byId.q.data).toMatchObject({ archetype: "queue", concreteTool: "kafka" });
    expect(byId.plain.data).toMatchObject({ archetype: "compute", concreteTool: "docker", label: "Worker" });
  });

  it("bare ids become compute nodes labeled by id", () => {
    const r = parseMermaid("flowchart LR\n A --> B");
    expect(r.ok && r.nodes[0].data).toMatchObject({ archetype: "compute", label: "A" });
  });

  it("parses edge labels in both syntaxes", () => {
    const r = parseMermaid("flowchart LR\n A -- query --> B\n B -->|stream| C");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.edges[0].data?.label).toBe("query");
    expect(r.edges[1].data?.label).toBe("stream");
  });

  it("treats dotted and thick arrows as edges", () => {
    const r = parseMermaid("flowchart LR\n A -.-> B\n B ==> C");
    expect(r.ok && r.edges).toHaveLength(2);
  });

  it("supports chains A --> B --> C", () => {
    const r = parseMermaid("flowchart LR\n A --> B --> C");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nodes).toHaveLength(3);
    expect(r.edges.map((e) => [e.source, e.target])).toEqual([
      ["A", "B"],
      ["B", "C"],
    ]);
  });

  it("inline node definitions on edge lines register shape + label", () => {
    const r = parseMermaid('flowchart LR\n api[API] --> db[("Postgres")]');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const db = r.nodes.find((n) => n.id === "db")!;
    expect(db.data).toMatchObject({ archetype: "database", label: "Postgres" });
  });

  it("later explicit definition upgrades a bare reference", () => {
    const r = parseMermaid('flowchart LR\n A --> db\n db[("Users")]');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const db = r.nodes.find((n) => n.id === "db")!;
    expect(db.data).toMatchObject({ archetype: "database", label: "Users" });
  });

  it("ignores subgraph/end/classDef/style/linkStyle/click/%% lines", () => {
    const src = [
      "flowchart LR",
      "%% a comment",
      "subgraph cluster",
      "A --> B",
      "end",
      "classDef red fill:#f00",
      "style A fill:#f00",
      "linkStyle 0 stroke:#f00",
      "click A href \"http://x\"",
    ].join("\n");
    const r = parseMermaid(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nodes).toHaveLength(2);
    expect(r.edges).toHaveLength(1);
  });

  it("returns error when no nodes parse", () => {
    const r = parseMermaid("classDef red fill:#f00\n%% nothing");
    expect(r).toEqual({ ok: false, error: "No nodes found — check your Mermaid syntax." });
  });

  it("all edges are typed sysEdge and ids unique", () => {
    const r = parseMermaid("flowchart LR\n A --> B\n A --> B");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.edges.every((e) => e.type === "sysEdge")).toBe(true);
    expect(new Set(r.edges.map((e) => e.id)).size).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/lib/mermaid-import.test.ts`
Expected: FAIL — `Cannot find module './mermaid-import'` (or equivalent).

- [ ] **Step 3: Implement the parser**

```ts
// src/lib/mermaid-import.ts
import type { SysNode, SysEdge, LayoutDirection } from "./types";
import { getArchetype } from "./catalog";

export type MermaidParseResult =
  | { ok: true; nodes: SysNode[]; edges: SysEdge[]; direction: LayoutDirection }
  | { ok: false; error: string };

const HEADER_RE = /^(?:flowchart|graph)\s+(LR|RL|TD|TB|BT)\s*;?\s*$/i;
const IGNORED_RE =
  /^(?:subgraph\b|end\b|classDef\b|class\b|style\b|linkStyle\b|click\b|%%)/;
// Alternation order matters: "-- text -->" must win before plain "-->".
// Two capture groups → String.split yields [token, g1, g2, token, g1, g2, ...].
const ARROW_RE = /\s*(?:--\s+([^-]+?)\s+-->|-->\|([^|]*)\||-->)\s*/;

const stripQuotes = (s: string): string => {
  const t = s.trim();
  return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
};

type ParsedToken = { id: string; label: string; archetype: string; explicit: boolean };

function parseNodeToken(token: string): ParsedToken | null {
  const t = token.trim();
  // Most specific bracket pairs first.
  const shapes: [RegExp, string][] = [
    [/^([A-Za-z_][\w-]*)\[\((.+)\)\]$/, "database"],
    [/^([A-Za-z_][\w-]*)\{\{(.+)\}\}$/, "gateway"],
    [/^([A-Za-z_][\w-]*)\(\[(.+)\]\)$/, "compute"],
    [/^([A-Za-z_][\w-]*)\[\/(.+)\/\]$/, "compute"],
    [/^([A-Za-z_][\w-]*)\(\((.+)\)\)$/, "cache"],
    [/^([A-Za-z_][\w-]*)>(.+)\]$/, "queue"],
    [/^([A-Za-z_][\w-]*)\[(.+)\]$/, "compute"],
    // Unlisted bracket styles (rhombus {x}, round (x)) fall back to compute.
    [/^([A-Za-z_][\w-]*)\{(.+)\}$/, "compute"],
    [/^([A-Za-z_][\w-]*)\((.+)\)$/, "compute"],
  ];
  for (const [re, archetype] of shapes) {
    const m = t.match(re);
    if (m) return { id: m[1], label: stripQuotes(m[2]), archetype, explicit: true };
  }
  const bare = t.match(/^([A-Za-z_][\w-]*)$/);
  if (bare) return { id: bare[1], label: bare[1], archetype: "compute", explicit: false };
  return null;
}

export function parseMermaid(text: string): MermaidParseResult {
  let direction: LayoutDirection = "LR";
  const nodesById = new Map<string, SysNode>();
  const explicitIds = new Set<string>();
  const edges: SysEdge[] = [];

  const ensureNode = (token: string): string | null => {
    const parsed = parseNodeToken(token);
    if (!parsed) return null;
    const existing = nodesById.get(parsed.id);
    if (!existing || (parsed.explicit && !explicitIds.has(parsed.id))) {
      const archetype = parsed.archetype;
      nodesById.set(parsed.id, {
        id: parsed.id,
        type: "sysNode",
        position: { x: 0, y: 0 },
        data: {
          archetype,
          concreteTool: getArchetype(archetype)?.defaultTool ?? "",
          label: parsed.label,
        },
      });
      if (parsed.explicit) explicitIds.add(parsed.id);
    }
    return parsed.id;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const header = line.match(HEADER_RE);
    if (header) {
      const dir = header[1].toUpperCase();
      direction = dir === "LR" || dir === "RL" ? "LR" : "TB";
      continue;
    }
    if (IGNORED_RE.test(line)) continue;
    // Normalize dotted/thick arrows to plain before splitting.
    const normalized = line.replace(/-\.->/g, "-->").replace(/==>/g, "-->");
    const parts = normalized.split(ARROW_RE);
    if (parts.length === 1) {
      ensureNode(line);
      continue;
    }
    // parts: [token, g1, g2, token, g1, g2, ..., token]
    let prevId = ensureNode(parts[0]);
    for (let i = 1; i < parts.length - 1; i += 3) {
      const label = parts[i] ?? parts[i + 1];
      const nextId = ensureNode(parts[i + 2]);
      if (prevId && nextId) {
        edges.push({
          id: `mermaid-e${edges.length}`,
          source: prevId,
          target: nextId,
          type: "sysEdge",
          data: label !== undefined ? { label: label.trim() } : {},
        });
      }
      prevId = nextId ?? prevId;
    }
  }

  if (nodesById.size === 0) {
    return { ok: false, error: "No nodes found — check your Mermaid syntax." };
  }
  return { ok: true, nodes: [...nodesById.values()], edges, direction };
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run src/lib/mermaid-import.test.ts`
Expected: PASS (12 tests). If the chain/split stride is off, log `parts` for one failing case — `split` with 2 capture groups yields stride 3.

- [ ] **Step 5: Typecheck + lint + format**

Run: `npm run typecheck && npm run lint && npm run format`
Expected: clean.

### Task 4: MermaidDialog component — TDD

**Files:**
- Create: `src/components/toolbar/MermaidDialog.tsx`
- Test: `src/components/toolbar/MermaidDialog.test.tsx`

Implementation note (spec deviation, deliberate): native `<dialog>`/`showModal` is flaky under jsdom; the app has zero `<dialog>` usage and an established overlay pattern (settings popover). Build a fixed overlay panel instead — same UX.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/toolbar/MermaidDialog.test.tsx
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MermaidDialog } from "./MermaidDialog";
import { useStore } from "@/state/store";

describe("MermaidDialog", () => {
  beforeEach(() => {
    useStore.getState().reset();
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it("renders nothing when closed", () => {
    render(<MermaidDialog open={false} onClose={() => {}} />);
    expect(screen.queryByLabelText("Paste Mermaid diagram")).toBeNull();
  });

  it("shows textarea, Import, Cancel, and Load .mmd file when open", () => {
    render(<MermaidDialog open onClose={() => {}} />);
    expect(screen.getByLabelText("Paste Mermaid diagram")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load .mmd file" })).toBeInTheDocument();
  });

  it("imports a valid diagram into the store and closes", () => {
    const onClose = vi.fn();
    render(<MermaidDialog open onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Paste Mermaid diagram"), {
      target: { value: "flowchart LR\n A --> B" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(useStore.getState().nodes).toHaveLength(2);
    expect(useStore.getState().edges).toHaveLength(1);
    expect(onClose).toHaveBeenCalled();
  });

  it("lays out imported nodes (positions not all 0,0)", () => {
    render(<MermaidDialog open onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText("Paste Mermaid diagram"), {
      target: { value: "flowchart LR\n A --> B" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    const positions = useStore.getState().nodes.map((n) => `${n.position.x},${n.position.y}`);
    expect(new Set(positions).size).toBe(2);
  });

  it("shows inline error on invalid input and leaves canvas untouched", () => {
    render(<MermaidDialog open onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText("Paste Mermaid diagram"), {
      target: { value: "%% nothing here" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(screen.getByRole("alert")).toHaveTextContent("No nodes found");
    expect(useStore.getState().nodes).toHaveLength(0);
  });

  it("asks for confirmation when canvas is non-empty; cancel aborts", () => {
    useStore.getState().addNode("database", "postgresql", { x: 0, y: 0 });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<MermaidDialog open onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText("Paste Mermaid diagram"), {
      target: { value: "flowchart LR\n A --> B" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(confirmSpy).toHaveBeenCalledWith("Replace current diagram?");
    expect(useStore.getState().nodes).toHaveLength(1); // untouched
  });

  it("replaces canvas when confirmed", () => {
    useStore.getState().addNode("database", "postgresql", { x: 0, y: 0 });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<MermaidDialog open onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText("Paste Mermaid diagram"), {
      target: { value: "flowchart LR\n A --> B" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(useStore.getState().nodes).toHaveLength(2);
  });

  it("Cancel calls onClose without importing", () => {
    const onClose = vi.fn();
    render(<MermaidDialog open onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(useStore.getState().nodes).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/components/toolbar/MermaidDialog.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
// src/components/toolbar/MermaidDialog.tsx
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/state/store";
import { parseMermaid } from "@/lib/mermaid-import";
import { layoutPositions } from "@/lib/layout";
import { MAX_IMPORT_BYTES } from "@/config";

export function MermaidDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const close = () => {
    setError(null);
    onClose();
  };

  const handleImport = () => {
    const result = parseMermaid(text);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (
      useStore.getState().nodes.length > 0 &&
      !confirm("Replace current diagram?")
    )
      return;
    const positions = layoutPositions(result.nodes, result.edges, result.direction);
    const nodes = result.nodes.map((n) => {
      const p = positions.get(n.id);
      return p ? { ...n, position: { x: p.x, y: p.y } } : n;
    });
    useStore.getState().setAll(nodes, result.edges);
    setText("");
    setError(null);
    onClose();
    toast.success("Mermaid diagram imported");
  };

  const handleFile = (file: File) => {
    if (file.size > MAX_IMPORT_BYTES) {
      setError("File too large (max 5 MB).");
      return;
    }
    void file.text().then((content) => {
      setText(content);
      setError(null);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="mermaid-dialog"
    >
      <div className="w-[480px] max-w-[90vw] rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-2xl">
        <h2 className="mb-2 text-sm font-bold">Import Mermaid</h2>
        <textarea
          aria-label="Paste Mermaid diagram"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          placeholder={"flowchart LR\n  client[Client] --> api{{API Gateway}}\n  api --> db[(Database)]"}
          className="h-48 w-full resize-y rounded-md border border-[var(--border)] bg-[var(--card)] p-2 font-mono text-xs text-[var(--text)]"
        />
        {error && (
          <p role="alert" className="mt-1 text-xs text-red-400">
            {error}
          </p>
        )}
        <input
          ref={fileInput}
          type="file"
          accept=".mmd,.mermaid,.txt,text/plain"
          className="hidden"
          data-testid="mermaid-file-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <div className="mt-3 flex justify-between gap-2">
          <button
            aria-label="Load .mmd file"
            onClick={() => fileInput.current?.click()}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--card)]"
          >
            Load .mmd file
          </button>
          <div className="flex gap-2">
            <button
              aria-label="Cancel"
              onClick={close}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--card)]"
            >
              Cancel
            </button>
            <button
              aria-label="Import"
              onClick={handleImport}
              className="rounded-md border border-[var(--accent)] px-3 py-1.5 text-xs text-[var(--accent)] hover:bg-[var(--card)]"
            >
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run src/components/toolbar/MermaidDialog.test.tsx`
Expected: PASS (8 tests).

- [ ] **Step 5: Typecheck + lint + format**

Run: `npm run typecheck && npm run lint && npm run format`

### Task 5: Wire Mermaid into the Toolbar

**Files:**
- Modify: `src/components/toolbar/Toolbar.tsx`
- Test: `src/components/toolbar/Toolbar.test.tsx` (add cases to the existing file; follow its established render helper/mocks)

- [ ] **Step 1: Add failing tests to the existing Toolbar test file**

```tsx
it("opens the Mermaid dialog from the settings popover", () => {
  renderToolbar(); // use the file's existing render helper
  fireEvent.click(screen.getByLabelText("Settings"));
  fireEvent.click(screen.getByLabelText("Import Mermaid"));
  expect(screen.getByLabelText("Paste Mermaid diagram")).toBeInTheDocument();
});

it("disables Import Mermaid when locked", () => {
  useStore.setState({ locked: true });
  renderToolbar();
  fireEvent.click(screen.getByLabelText("Settings"));
  expect(screen.getByLabelText("Import Mermaid")).toBeDisabled();
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/components/toolbar/Toolbar.test.tsx`
Expected: new tests FAIL ("Unable to find label Import Mermaid").

- [ ] **Step 3: Wire it in `Toolbar.tsx`**

Add imports and state:

```tsx
import { FileCode2 } from "lucide-react"; // add to the existing lucide-react import list
import { MermaidDialog } from "./MermaidDialog";
// inside Toolbar():
const [mermaidOpen, setMermaidOpen] = useState(false);
```

Add a button in the settings popover **File** section, directly after the "Load file…" button:

```tsx
<button
  aria-label="Import Mermaid"
  disabled={locked}
  onClick={() => {
    setMermaidOpen(true);
    setSettingsOpen(false);
  }}
  className="mb-1 flex w-full items-center gap-2 rounded-md border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--card)] disabled:opacity-50"
>
  <FileCode2 size={14} strokeWidth={2} /> Import Mermaid…
</button>
```

Render the dialog just before the closing `</header>` tag:

```tsx
<MermaidDialog open={mermaidOpen} onClose={() => setMermaidOpen(false)} />
```

- [ ] **Step 4: Run, verify pass + full suite**

Run: `npx vitest run src/components/toolbar/ && npm run typecheck && npm run lint && npm run format`
Expected: all green.

---

## Feature 3 — Share-by-URL

### Task 6: `share-url.ts` encode/decode — TDD

**Files:**
- Create: `src/lib/share-url.ts`
- Test: `src/lib/share-url.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/share-url.test.ts
import { describe, it, expect } from "vitest";
import { encodeShareHash, decodeShareHash, SHARE_PREFIX } from "./share-url";

describe("share-url", () => {
  it("roundtrips JSON through encode/decode", async () => {
    const json = JSON.stringify({ version: "1.2.0", nodes: [{ id: "a" }], edges: [] });
    const hash = await encodeShareHash(json);
    expect(hash.startsWith(SHARE_PREFIX)).toBe(true);
    expect(await decodeShareHash(hash)).toBe(json);
  });

  it("produces base64url output (no +, /, =)", async () => {
    // enough varied content to exercise the full base64 alphabet
    const json = JSON.stringify({ blob: Array.from({ length: 500 }, (_, i) => i * 7919).join("ÿþ") });
    const payload = (await encodeShareHash(json)).slice(SHARE_PREFIX.length);
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("compresses (encoded shorter than raw for repetitive JSON)", async () => {
    const json = JSON.stringify({ nodes: Array(50).fill({ type: "sysNode", archetype: "database" }) });
    const hash = await encodeShareHash(json);
    expect(hash.length).toBeLessThan(json.length);
  });

  it("returns null for non-share hashes", async () => {
    expect(await decodeShareHash("some-anchor")).toBeNull();
    expect(await decodeShareHash("")).toBeNull();
  });

  it("throws on corrupt payload", async () => {
    await expect(decodeShareHash(SHARE_PREFIX + "!!!not-base64!!!")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/lib/share-url.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/share-url.ts
/** URL-fragment sharing: deflate-raw + base64url. The fragment never reaches a server. */

export const SHARE_PREFIX = "v=1,";
/** Encoded-payload cap (chars). ~60+ node diagrams exceed it — suggest file export instead. */
export const MAX_SHARE_HASH_CHARS = 8 * 1024;

async function streamToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function encodeShareHash(json: string): Promise<string> {
  const compressed = await streamToBytes(
    new Blob([json]).stream().pipeThrough(new CompressionStream("deflate-raw")),
  );
  let bin = "";
  for (const byte of compressed) bin += String.fromCharCode(byte);
  const b64url = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return SHARE_PREFIX + b64url;
}

/** @returns decoded JSON string, or null when `hash` is not a share hash. Throws on corrupt payload. */
export async function decodeShareHash(hash: string): Promise<string | null> {
  if (!hash.startsWith(SHARE_PREFIX)) return null;
  const b64 = hash.slice(SHARE_PREFIX.length).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64); // throws DOMException on invalid base64
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run src/lib/share-url.test.ts`
Expected: PASS (5 tests). If `Blob.stream` is missing in jsdom, replace `new Blob([json]).stream()` with `new Response(json).body!` (Node-global Response is available) — keep tests unchanged.

- [ ] **Step 5: Typecheck + lint + format**

Run: `npm run typecheck && npm run lint && npm run format`

### Task 7: Share button (`useFileIO.shareLink`) — TDD

**Files:**
- Modify: `src/hooks/useFileIO.ts`
- Modify: `src/components/toolbar/Toolbar.tsx`
- Test: `src/hooks/useFileIO.test.ts` (add cases), `src/components/toolbar/Toolbar.test.tsx` (add case)

- [ ] **Step 1: Add failing tests to `useFileIO.test.ts`** (follow the file's existing harness — it renders the hook inside a ReactFlowProvider wrapper):

```ts
import { decodeShareHash, SHARE_PREFIX } from "@/lib/share-url";

describe("shareLink", () => {
  beforeEach(() => {
    useStore.getState().reset();
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it("copies a URL whose hash decodes to the serialized diagram", async () => {
    useStore.getState().addNode("database", "postgresql", { x: 10, y: 20 });
    const { result } = renderFileIO(); // existing helper
    await act(() => result.current.shareLink());
    const writeText = navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
    expect(writeText).toHaveBeenCalledTimes(1);
    const url = writeText.mock.calls[0][0] as string;
    const hash = url.split("#")[1];
    expect(hash.startsWith(SHARE_PREFIX)).toBe(true);
    const json = await decodeShareHash(hash);
    const parsed = JSON.parse(json!);
    expect(parsed.nodes).toHaveLength(1);
    expect(parsed.version).toBe("1.2.0");
  });

  it("does nothing on an empty canvas", async () => {
    const { result } = renderFileIO();
    await act(() => result.current.shareLink());
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/hooks/useFileIO.test.ts`
Expected: new tests FAIL — `shareLink` undefined.

- [ ] **Step 3: Implement `shareLink` in `useFileIO.ts`**

Add imports:

```ts
import { encodeShareHash, MAX_SHARE_HASH_CHARS } from "@/lib/share-url";
```

Add inside `useFileIO()` and include in the return object (`return { exportFile, importFile, exportPng, shareLink }`):

```ts
const shareLink = useCallback(async () => {
  if (typeof CompressionStream === "undefined") {
    toast.error("Sharing is not supported in this browser.");
    return;
  }
  const { nodes, edges, viewMode, nodeStyle, locked } = useStore.getState();
  if (!nodes.length) {
    toast.error("Nothing to share.");
    return;
  }
  const json = serializeSysdraw({ nodes, edges, viewMode, nodeStyle, locked });
  const hash = await encodeShareHash(json);
  if (hash.length > MAX_SHARE_HASH_CHARS) {
    toast.error("Diagram too large to share by URL — save to a file instead.");
    return;
  }
  // Build the link directly instead of mutating location.hash — same result, no URL churn.
  const url = `${window.location.origin}${window.location.pathname}#${hash}`;
  await navigator.clipboard.writeText(url);
  toast.success("Link copied!");
}, []);
```

- [ ] **Step 4: Add the Toolbar button**

Test first (in `Toolbar.test.tsx`):

```tsx
it("settings popover has a Copy share link button", () => {
  renderToolbar();
  fireEvent.click(screen.getByLabelText("Settings"));
  expect(screen.getByLabelText("Copy share link")).toBeInTheDocument();
});
```

Then in `Toolbar.tsx`: destructure `shareLink` from `useFileIO()`, add `Link` to the lucide-react imports, and add this button in the File section after "Export PNG":

```tsx
<button
  aria-label="Copy share link"
  onClick={() => {
    void shareLink();
    setSettingsOpen(false);
  }}
  className="mt-1 flex w-full items-center gap-2 rounded-md border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--card)]"
>
  <Link size={14} strokeWidth={2} /> Copy share link
</button>
```

- [ ] **Step 5: Run all touched suites**

Run: `npx vitest run src/hooks/useFileIO.test.ts src/components/toolbar/Toolbar.test.tsx && npm run typecheck && npm run lint && npm run format`
Expected: green.

### Task 8: Boot restore from share hash — TDD

**Files:**
- Create: `src/state/share-boot.ts`
- Modify: `src/App.tsx:85-91` (boot effect)
- Test: `src/state/share-boot.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/state/share-boot.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { restoreFromShareHash } from "./share-boot";
import { encodeShareHash } from "@/lib/share-url";
import { serializeSysdraw } from "@/lib/sysdraw-file";
import { useStore } from "./store";
import type { SysNode } from "@/lib/types";

const NODE: SysNode = {
  id: "n1",
  type: "sysNode",
  position: { x: 5, y: 6 },
  data: { archetype: "database", concreteTool: "postgresql", label: "DB" },
};

describe("restoreFromShareHash", () => {
  beforeEach(() => {
    useStore.getState().reset();
    window.location.hash = "";
  });

  it("returns false without a share hash", async () => {
    expect(await restoreFromShareHash()).toBe(false);
  });

  it("loads a shared diagram into the store and strips the hash", async () => {
    const json = serializeSysdraw({
      nodes: [NODE],
      edges: [],
      viewMode: "real",
      nodeStyle: "plate",
      locked: true,
    });
    window.location.hash = "#" + (await encodeShareHash(json));
    expect(await restoreFromShareHash()).toBe(true);
    const s = useStore.getState();
    expect(s.nodes).toHaveLength(1);
    expect(s.viewMode).toBe("real");
    expect(s.nodeStyle).toBe("plate");
    expect(s.locked).toBe(true); // locked snapshot opens locked
    expect(window.location.hash).toBe("");
  });

  it("returns false and strips hash on corrupt payload", async () => {
    window.location.hash = "#v=1,@@@corrupt@@@";
    expect(await restoreFromShareHash()).toBe(false);
    expect(useStore.getState().nodes).toHaveLength(0);
    expect(window.location.hash).toBe("");
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/state/share-boot.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/state/share-boot.ts
import { toast } from "sonner";
import { decodeShareHash } from "@/lib/share-url";
import { parseSysdraw } from "@/lib/sysdraw-file";
import { useStore } from "./store";
import type { SysNode, SysEdge } from "@/lib/types";

/**
 * Boot-time restore from a share-URL fragment. Returns true when a shared
 * diagram was loaded (caller must then SKIP autosave restore for this boot).
 * The hash is stripped either way — a broken link shouldn't stick around.
 */
export async function restoreFromShareHash(): Promise<boolean> {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash.startsWith("v=1,")) return false;

  let json: string | null = null;
  try {
    json = await decodeShareHash(hash);
  } catch {
    json = null;
  }
  window.history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );
  if (json === null) {
    toast.error("Could not open shared link — it may be corrupted.");
    return false;
  }
  const result = parseSysdraw(json);
  if (!result.ok) {
    toast.error(result.error);
    return false;
  }
  // zod-inferred nodes lack RF's optional runtime fields — structurally compatible (same cast as autosave)
  useStore
    .getState()
    .setAll(result.data.nodes as SysNode[], result.data.edges as SysEdge[], {
      viewMode: result.data.meta.viewMode,
      nodeStyle: result.data.meta.nodeStyle,
      locked: result.data.meta.locked ?? false,
    });
  return true;
}
```

Note: jsdom's `replaceState` does not always clear `location.hash`; if the strip assertion fails, set `window.location.hash = ""` after `replaceState` (harmless in browsers — no history entry is added for an empty replace... actually assigning hash DOES add history. Instead, in the test assert `useStore` state and accept either `""` or the original hash under jsdom by stripping via `replaceState` AND asserting with `expect(window.location.hash).not.toContain("v=1,")` — adjust the test if jsdom misbehaves; browsers honor `replaceState`).

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run src/state/share-boot.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire into App boot** (`src/App.tsx` — replace the existing boot effect body):

```tsx
import { restoreFromShareHash } from "@/state/share-boot";
// ...
useEffect(() => {
  if (booted.current) return; // StrictMode double-invoke guard
  booted.current = true;
  void (async () => {
    const shared = await restoreFromShareHash();
    if (!shared) restoreAutosave(); // share hash wins over autosave for this boot
    startAutosave(); // app-lifetime subscription — deliberately NOT returned as cleanup
  })();
}, []);
```

- [ ] **Step 6: Full verification for the feature**

Run: `npm run test && npm run typecheck && npm run lint && npm run format`
Expected: green (App smoke test still passes — boot is now async but resolves immediately without a hash).

---

## Feature 4 — Boundary parent-child grouping

### Task 9: `grouping.ts` pure helpers — TDD

**Files:**
- Create: `src/lib/grouping.ts`
- Test: `src/lib/grouping.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/grouping.test.ts
import { describe, it, expect } from "vitest";
import { absolutizeAll, applyGrouping } from "./grouping";
import type { AppNode, BoundaryNode, SysNode } from "./types";

const boundary = (id: string, x: number, y: number, w = 320, h = 220): BoundaryNode => ({
  id,
  type: "boundaryNode",
  position: { x, y },
  width: w,
  height: h,
  data: { label: "VPC" },
});

const sys = (id: string, x: number, y: number): SysNode => ({
  id,
  type: "sysNode",
  position: { x, y },
  data: { archetype: "database", concreteTool: "postgresql", label: "DB" },
});

describe("applyGrouping", () => {
  it("assigns parentId + relative position to a node whose center is inside a boundary", () => {
    // sys at (100,100), fallback dims 180x60 → center (190,130); boundary (0,0,320,220) contains it
    const nodes: AppNode[] = [sys("a", 100, 100), boundary("b1", 0, 0)];
    const result = applyGrouping(nodes);
    const a = result.find((n) => n.id === "a")!;
    expect(a.parentId).toBe("b1");
    expect(a.position).toEqual({ x: 100, y: 100 }); // relative — boundary at origin
  });

  it("computes relative position against a non-origin boundary", () => {
    const nodes: AppNode[] = [sys("a", 450, 350), boundary("b1", 400, 300)];
    const a = applyGrouping(nodes).find((n) => n.id === "a")!;
    expect(a.parentId).toBe("b1");
    expect(a.position).toEqual({ x: 50, y: 50 });
  });

  it("leaves outside nodes ungrouped", () => {
    const nodes: AppNode[] = [sys("a", 900, 900), boundary("b1", 0, 0)];
    const a = applyGrouping(nodes).find((n) => n.id === "a")!;
    expect(a.parentId).toBeUndefined();
    expect(a.position).toEqual({ x: 900, y: 900 });
  });

  it("orders boundaries before other nodes (RF parent-first requirement)", () => {
    const nodes: AppNode[] = [sys("a", 10, 10), boundary("b1", 0, 0)];
    const result = applyGrouping(nodes);
    expect(result[0].id).toBe("b1");
  });

  it("is idempotent — regrouping grouped nodes preserves absolute geometry", () => {
    const nodes: AppNode[] = [sys("a", 100, 100), boundary("b1", 0, 0)];
    const once = applyGrouping(nodes);
    const twice = applyGrouping(once);
    expect(twice.find((n) => n.id === "a")!.position).toEqual({ x: 100, y: 100 });
    expect(twice.find((n) => n.id === "a")!.parentId).toBe("b1");
  });

  it("re-resolves membership after a grouped node moves out (relative position far away)", () => {
    const grouped = applyGrouping([sys("a", 100, 100), boundary("b1", 0, 0)]);
    const moved = grouped.map((n) =>
      n.id === "a" ? { ...n, position: { x: 1000, y: 1000 } } : n,
    );
    const a = applyGrouping(moved).find((n) => n.id === "a")!;
    expect(a.parentId).toBeUndefined();
    expect(a.position).toEqual({ x: 1000, y: 1000 }); // absolute = old rel + boundary origin (0,0)
  });

  it("groups annotation node types too (noteNode)", () => {
    const note: AppNode = {
      id: "n",
      type: "noteNode",
      position: { x: 50, y: 50 },
      data: { text: "hi" },
    };
    const n = applyGrouping([note, boundary("b1", 0, 0)]).find((x) => x.id === "n")!;
    expect(n.parentId).toBe("b1");
  });

  it("never groups a boundary into another boundary", () => {
    const inner = boundary("b2", 10, 10, 100, 80);
    const result = applyGrouping([inner, boundary("b1", 0, 0, 500, 400)]);
    expect(result.find((n) => n.id === "b2")!.parentId).toBeUndefined();
  });

  it("first boundary wins when overlapping boundaries both contain a node", () => {
    const nodes: AppNode[] = [sys("a", 50, 50), boundary("b1", 0, 0), boundary("b2", 0, 0)];
    const a = applyGrouping(nodes).find((n) => n.id === "a")!;
    expect(a.parentId).toBe("b1");
  });
});

describe("absolutizeAll", () => {
  it("converts relative members to absolute and strips parentId", () => {
    const grouped = applyGrouping([sys("a", 450, 350), boundary("b1", 400, 300)]);
    const abs = absolutizeAll(grouped);
    const a = abs.find((n) => n.id === "a")!;
    expect(a.parentId).toBeUndefined();
    expect(a.position).toEqual({ x: 450, y: 350 });
  });

  it("drops a dangling parentId without moving the node", () => {
    const orphan = { ...sys("a", 30, 40), parentId: "ghost" } as AppNode;
    const a = absolutizeAll([orphan])[0];
    expect(a.parentId).toBeUndefined();
    expect(a.position).toEqual({ x: 30, y: 40 });
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/lib/grouping.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/grouping.ts
import type { AppNode } from "./types";

/** Fallback dims when React Flow hasn't measured yet (mirrors layout.ts). */
const FALLBACK_WIDTH = 180;
const FALLBACK_HEIGHT = 60;
const BOUNDARY_FALLBACK_WIDTH = 320;
const BOUNDARY_FALLBACK_HEIGHT = 220;

function dims(n: AppNode): { w: number; h: number } {
  if (n.type === "boundaryNode") {
    return {
      w: n.width ?? BOUNDARY_FALLBACK_WIDTH,
      h: n.height ?? BOUNDARY_FALLBACK_HEIGHT,
    };
  }
  return {
    w: n.measured?.width ?? n.width ?? FALLBACK_WIDTH,
    h: n.measured?.height ?? n.height ?? FALLBACK_HEIGHT,
  };
}

/**
 * Strip all parentId grouping, converting member positions back to absolute.
 * Boundaries are never children, so parent positions are always absolute.
 */
export function absolutizeAll(nodes: AppNode[]): AppNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return nodes.map((n) => {
    if (!n.parentId) return n;
    const parent = byId.get(n.parentId);
    const { parentId: _drop, ...rest } = n;
    void _drop;
    if (!parent) return rest as AppNode;
    return {
      ...rest,
      position: {
        x: n.position.x + parent.position.x,
        y: n.position.y + parent.position.y,
      },
    } as AppNode;
  });
}

/** Membership rule: node center inside boundary rect (same as Tidy). First boundary wins. */
function computeMembership(absNodes: AppNode[]): Map<string, string> {
  const boundaries = absNodes.filter((n) => n.type === "boundaryNode");
  const membership = new Map<string, string>();
  for (const n of absNodes) {
    if (n.type === "boundaryNode") continue; // no nesting
    const { w, h } = dims(n);
    const cx = n.position.x + w / 2;
    const cy = n.position.y + h / 2;
    for (const b of boundaries) {
      const { w: bw, h: bh } = dims(b);
      if (
        cx >= b.position.x &&
        cx <= b.position.x + bw &&
        cy >= b.position.y &&
        cy <= b.position.y + bh
      ) {
        membership.set(n.id, b.id);
        break;
      }
    }
  }
  return membership;
}

/**
 * Recompute grouping from geometry: absolutize → membership → parentId +
 * relative positions → parents-before-children ordering (RF requirement).
 * Idempotent on absolute geometry. Call after any drop/resize/setAll/layout.
 */
export function applyGrouping(nodes: AppNode[]): AppNode[] {
  const abs = absolutizeAll(nodes);
  const membership = computeMembership(abs);
  const byId = new Map(abs.map((n) => [n.id, n]));
  const grouped = abs.map((n) => {
    const parentId = membership.get(n.id);
    if (!parentId) return n;
    const parent = byId.get(parentId)!;
    return {
      ...n,
      parentId,
      position: {
        x: n.position.x - parent.position.x,
        y: n.position.y - parent.position.y,
      },
    } as AppNode;
  });
  const boundaries = grouped.filter((n) => n.type === "boundaryNode");
  const rest = grouped.filter((n) => n.type !== "boundaryNode");
  return [...boundaries, ...rest];
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run src/lib/grouping.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Typecheck + lint + format**

Run: `npm run typecheck && npm run lint && npm run format`

### Task 10: Serializer stays absolute — format unchanged

**Files:**
- Modify: `src/lib/sysdraw-file.ts:111-119` (`serializeSysdraw`)
- Test: `src/lib/sysdraw-file.test.ts` (add cases)

- [ ] **Step 1: Add failing roundtrip tests to `sysdraw-file.test.ts`**

```ts
import { applyGrouping } from "./grouping";

describe("grouping serialization", () => {
  it("serializes member positions as absolute and never emits parentId", () => {
    const grouped = applyGrouping([
      {
        id: "a",
        type: "sysNode",
        position: { x: 450, y: 350 },
        data: { archetype: "database", concreteTool: "postgresql", label: "DB" },
      },
      {
        id: "b1",
        type: "boundaryNode",
        position: { x: 400, y: 300 },
        width: 320,
        height: 220,
        data: { label: "VPC" },
      },
    ]);
    const json = serializeSysdraw({
      nodes: grouped,
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const file = JSON.parse(json);
    const a = file.nodes.find((n: { id: string }) => n.id === "a");
    expect(a.position).toEqual({ x: 450, y: 350 }); // absolute, not {50,50}
    expect(JSON.stringify(file)).not.toContain("parentId");
    expect(file.version).toBe("1.2.0"); // format unchanged
  });

  it("roundtrips: export → parse preserves absolute geometry", () => {
    const grouped = applyGrouping([
      {
        id: "a",
        type: "sysNode",
        position: { x: 450, y: 350 },
        data: { archetype: "database", concreteTool: "postgresql", label: "DB" },
      },
      {
        id: "b1",
        type: "boundaryNode",
        position: { x: 400, y: 300 },
        width: 320,
        height: 220,
        data: { label: "VPC" },
      },
    ]);
    const json = serializeSysdraw({
      nodes: grouped,
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const parsed = parseSysdraw(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const a = parsed.data.nodes.find((n) => n.id === "a")!;
    expect(a.position).toEqual({ x: 450, y: 350 });
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/lib/sysdraw-file.test.ts`
Expected: new tests FAIL — member serialized with relative position `{x:50,y:50}`.

- [ ] **Step 3: Implement — one-line absolutize at the top of `serializeSysdraw`**

```ts
import { absolutizeAll } from "./grouping";
// inside serializeSysdraw, first line of the function body:
const sourceNodes = absolutizeAll(state.nodes);
// then change `state.nodes.map((n) => {` to `sourceNodes.map((n) => {`
```

The per-type serializers already emit only known fields, so `parentId` can never leak into the file.

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run src/lib/sysdraw-file.test.ts src/lib/sysdraw-file-lock.test.ts`
Expected: PASS, including all pre-existing serialization tests.

### Task 11: Store integration — `setAll`, `regroup`, delete, duplicate, `applyPositions`

**Files:**
- Modify: `src/state/store.ts`
- Test: `src/state/store.test.ts` (add cases; follow the file's existing reset pattern)

- [ ] **Step 1: Add failing tests**

```ts
import { applyGrouping } from "@/lib/grouping";

const BOUNDARY = {
  id: "b1",
  type: "boundaryNode",
  position: { x: 0, y: 0 },
  width: 320,
  height: 220,
  data: { label: "VPC" },
} as const;

const MEMBER = {
  id: "a",
  type: "sysNode",
  position: { x: 100, y: 100 },
  data: { archetype: "database", concreteTool: "postgresql", label: "DB" },
} as const;

describe("grouping in store", () => {
  it("setAll derives membership from geometry", () => {
    useStore.getState().setAll([{ ...MEMBER }, { ...BOUNDARY }], []);
    const a = useStore.getState().nodes.find((n) => n.id === "a")!;
    expect(a.parentId).toBe("b1");
    expect(a.position).toEqual({ x: 100, y: 100 }); // relative to boundary at origin
    const b = useStore.getState().nodes.find((n) => n.id === "b1")!;
    expect(b.zIndex).toBe(-1); // z-policy survives grouping
    expect(useStore.getState().nodes[0].id).toBe("b1"); // parent first
  });

  it("regroup re-resolves membership", () => {
    useStore.getState().setAll([{ ...MEMBER }, { ...BOUNDARY }], []);
    useStore.setState({
      nodes: useStore
        .getState()
        .nodes.map((n) => (n.id === "a" ? { ...n, position: { x: 999, y: 999 } } : n)),
    });
    useStore.getState().regroup();
    expect(useStore.getState().nodes.find((n) => n.id === "a")!.parentId).toBeUndefined();
  });

  it("deleting a boundary orphans members at correct absolute positions", () => {
    useStore.getState().setAll(
      [
        { ...MEMBER, position: { x: 450, y: 350 } },
        { ...BOUNDARY, position: { x: 400, y: 300 } },
      ],
      [],
    );
    useStore.setState({
      nodes: useStore
        .getState()
        .nodes.map((n) => (n.id === "b1" ? { ...n, selected: true } : n)),
    });
    useStore.getState().deleteSelection();
    const a = useStore.getState().nodes.find((n) => n.id === "a")!;
    expect(a.parentId).toBeUndefined();
    expect(a.position).toEqual({ x: 450, y: 350 });
  });

  it("duplicating boundary + member keeps grouping within the copy set", () => {
    useStore.getState().setAll([{ ...MEMBER }, { ...BOUNDARY }], []);
    useStore.setState({
      nodes: useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
    });
    useStore.getState().duplicateSelection();
    const nodes = useStore.getState().nodes;
    expect(nodes).toHaveLength(4);
    const copies = nodes.filter((n) => n.selected);
    const boundaryCopy = copies.find((n) => n.type === "boundaryNode")!;
    const memberCopy = copies.find((n) => n.type === "sysNode")!;
    expect(memberCopy.parentId).toBe(boundaryCopy.id); // remapped, not the original b1
  });

  it("applyPositions (Tidy) regroups from absolute layout output", () => {
    useStore.getState().setAll([{ ...MEMBER }, { ...BOUNDARY }], []);
    // Simulate a layout that moves the member far outside the boundary
    useStore.getState().applyPositions(new Map([["a", { x: 2000, y: 2000 }]]));
    const a = useStore.getState().nodes.find((n) => n.id === "a")!;
    expect(a.parentId).toBeUndefined();
    expect(a.position).toEqual({ x: 2000, y: 2000 });
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/state/store.test.ts`
Expected: new tests FAIL (`regroup` missing; `setAll` doesn't set `parentId`; positions wrong).

- [ ] **Step 3: Implement in `store.ts`**

Add import:

```ts
import { applyGrouping, absolutizeAll } from "@/lib/grouping";
```

Add `regroup: () => void;` to `StoreState` and implement:

```ts
regroup: () => set({ nodes: applyGrouping(get().nodes) }),
```

**`setAll`** — group BEFORE the existing zIndex normalization (replace the first line of the function body):

```ts
setAll: (nodes, edges, meta) => {
  const groupedNodes = applyGrouping(nodes);
  // Normalize zIndex by node type so old files get the current policy. (existing comment + map stay)
  const normalized = groupedNodes.map((n): AppNode => {
    // ... existing body unchanged, but note the sysNode branch must PRESERVE parentId:
    // the existing `const { zIndex: _drop, ...rest } = n` already keeps every other field — no change needed.
  });
  // rest unchanged
},
```

**`deleteSelection`** — absolutize while parents still exist, then filter, then regroup (replace the body):

```ts
deleteSelection: () => {
  const { nodes, edges } = get();
  const doomed = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
  const doomedEdges = new Set(edges.filter((e) => e.selected).map((e) => e.id));
  if (!doomed.size && !doomedEdges.size) return;
  get().snapshot();
  const survivors = absolutizeAll(nodes).filter((n) => !doomed.has(n.id));
  set({
    nodes: applyGrouping(survivors),
    edges: edges.filter(
      (e) =>
        !doomedEdges.has(e.id) && !doomed.has(e.source) && !doomed.has(e.target),
    ),
  });
},
```

**`duplicateSelection`** — remap `parentId` within the copy set; don't offset members whose parent is also copied (parent's offset carries them); regroup at the end:

```ts
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
```

**`applyPositions`** — layout output is absolute; absolutize first, apply, regroup:

```ts
applyPositions: (positions) => {
  get().snapshot();
  const moved = absolutizeAll(get().nodes).map((n) => {
    const p = positions.get(n.id);
    if (!p) return n;
    const updated = { ...n, position: { x: p.x, y: p.y } };
    if (p.width !== undefined) (updated as AppNode).width = p.width;
    if (p.height !== undefined) (updated as AppNode).height = p.height;
    return updated;
  });
  set({ nodes: applyGrouping(moved) });
},
```

**`nudgeSelection`** — regroup after nudging (a nudge can cross a boundary edge):

```ts
nudgeSelection: (dx, dy) =>
  set({
    nodes: applyGrouping(
      get().nodes.map((n) =>
        n.selected
          ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
          : n,
      ),
    ),
  }),
```

- [ ] **Step 4: Run store tests + the whole suite**

Run: `npx vitest run src/state/store.test.ts && npm run test`
Expected: new tests PASS. Some existing tests may assert node-array ORDER after `setAll` (boundaries now sort first) — fix those assertions to match the new parent-first ordering; that ordering is required by React Flow.

- [ ] **Step 5: Typecheck + lint + format**

Run: `npm run typecheck && npm run lint && npm run format`

### Task 12: Canvas + Toolbar + BoundaryNode wiring

**Files:**
- Modify: `src/components/canvas/Canvas.tsx` (add `onNodeDragStop`)
- Modify: `src/components/canvas/BoundaryNode.tsx` (NodeResizer `onResizeEnd`)
- Modify: `src/components/toolbar/Toolbar.tsx:69-79` (tidy passes absolute nodes)
- Test: `src/components/canvas/Canvas.test.tsx`, `src/components/canvas/BoundaryNode.test.tsx` (add cases)

- [ ] **Step 1: Add failing test — Canvas regroups on drag stop** (Canvas.test.tsx; React Flow is mocked in setup, so test the handler indirectly via the store):

```tsx
it("passes an onNodeDragStop handler that regroups", () => {
  // Render Canvas, then simulate what RF does on drag stop by invoking the prop.
  // The setup mock exposes rendered RF props; follow the pattern used by the
  // existing onNodeDragStart test in this file. Assert:
  useStore.getState().setAll(
    [
      { id: "b1", type: "boundaryNode", position: { x: 0, y: 0 }, width: 320, height: 220, data: { label: "VPC" } },
    ],
    [],
  );
  useStore.setState({
    nodes: [
      ...useStore.getState().nodes,
      { id: "a", type: "sysNode", position: { x: 100, y: 100 }, data: { archetype: "database", concreteTool: "postgresql", label: "DB" } },
    ],
  });
  // invoke captured onNodeDragStop()
  expect(useStore.getState().nodes.find((n) => n.id === "a")!.parentId).toBe("b1");
});
```

(Adapt to the file's existing RF-mock prop-capture pattern — `onNodeDragStart` is already tested there; mirror it.)

- [ ] **Step 2: Implement Canvas wiring** — in `Canvas.tsx` add `const regroup = useStore((s) => s.regroup);` and on the `<ReactFlow>` element:

```tsx
onNodeDragStop={() => {
  if (!locked) regroup();
}}
```

- [ ] **Step 3: BoundaryNode resize regroups** — failing test in `BoundaryNode.test.tsx`:

```tsx
it("regroups on resize end", () => {
  // NodeResizer is mocked/stubbed in jsdom; render the component and call the
  // onResizeEnd prop it passes to NodeResizer (mirror the existing NodeResizer
  // assertions in this file), then assert useStore regroup behavior:
  // simplest: spy on useStore.getState().regroup — replace the store action with vi.fn()
  const regroup = vi.fn();
  useStore.setState({ regroup });
  // render + invoke captured onResizeEnd
  expect(regroup).toHaveBeenCalled();
});
```

Implement in `BoundaryNode.tsx`:

```tsx
<NodeResizer
  isVisible={selected && !locked}
  minWidth={160}
  minHeight={120}
  onResizeEnd={() => useStore.getState().regroup()}
/>
```

- [ ] **Step 4: Toolbar tidy uses absolute geometry** — in `Toolbar.tsx`, the `tidy` function must feed `layoutPositions` absolute positions (members are stored relative now):

```tsx
import { absolutizeAll } from "@/lib/grouping"; // add import

const tidy = () => {
  const { nodes, edges, applyPositions } = useStore.getState();
  if (!nodes.length) return;
  document.getElementById("root")?.classList.add("layout-animating");
  applyPositions(layoutPositions(absolutizeAll(nodes), edges, layoutDirection));
  setTimeout(
    () =>
      document.getElementById("root")?.classList.remove("layout-animating"),
    350,
  );
};
```

(`applyPositions` itself regroups — Task 11.)

- [ ] **Step 5: Run all touched suites + full gate sweep**

Run: `npx vitest run src/components/canvas/ src/components/toolbar/ && npm run test && npm run typecheck && npm run lint && npm run format`
Expected: green.

### Task 13: Lock-awareness + integration checks for grouping

**Files:**
- Test: `src/state/store.test.ts` or a new `src/state/store-grouping.test.ts` (project convention: lock variants live in `*-lock` files — add `src/state/store-grouping.test.ts` if store.test.ts is crowded)

- [ ] **Step 1: Add integration tests**

```ts
describe("grouping integration", () => {
  it("autosave-style roundtrip: serialize grouped state → parse → setAll → same grouping", () => {
    useStore.getState().setAll(
      [
        { id: "a", type: "sysNode", position: { x: 100, y: 100 }, data: { archetype: "database", concreteTool: "postgresql", label: "DB" } },
        { id: "b1", type: "boundaryNode", position: { x: 0, y: 0 }, width: 320, height: 220, data: { label: "VPC" } },
      ],
      [],
    );
    const s = useStore.getState();
    const json = serializeSysdraw({ nodes: s.nodes, edges: s.edges, viewMode: s.viewMode, nodeStyle: s.nodeStyle });
    const parsed = parseSysdraw(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    useStore.getState().setAll(parsed.data.nodes as never, parsed.data.edges as never);
    const a = useStore.getState().nodes.find((n) => n.id === "a")!;
    expect(a.parentId).toBe("b1");
    expect(a.position).toEqual({ x: 100, y: 100 });
  });

  it("Mermaid-imported nodes (no boundaries) pass through grouping untouched", () => {
    const r = parseMermaid("flowchart LR\n A --> B");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    useStore.getState().setAll(r.nodes, r.edges);
    expect(useStore.getState().nodes.every((n) => n.parentId === undefined)).toBe(true);
  });
});
```

- [ ] **Step 2: Run, fix anything they catch**

Run: `npx vitest run src/state/`
Expected: PASS.

---

## Task 14: Docs + final gate

**Files:**
- Modify: `README.md` (Features), `AGENTS.md` (Architecture/Lib/Directory Map), `docs/ROADMAP.md` (remove shipped items)

- [ ] **Step 1: README updates**

- Features → Canvas: add `- **Boundary grouping** — dragging a boundary moves the nodes inside it; membership follows node centers`
- Features → Files & privacy: add `- **Share-by-URL** — copy a link that encodes the whole diagram in the URL fragment; nothing is sent to any server` and `- **Mermaid import** — paste a flowchart (or load a .mmd file) and get a laid-out diagram`
- Catalog count: 181 → 192 tools (update both README.md and AGENTS.md occurrences).

- [ ] **Step 2: AGENTS.md updates** — add to the Lib section:

```
- `mermaid-import.ts`: regex Mermaid flowchart parser → SysNode/SysEdge arrays.
- `share-url.ts`: deflate-raw + base64url URL-fragment sharing codec.
- `grouping.ts`: boundary membership (center-inside) → RF parentId; absolutizeAll/applyGrouping.
```

Plus: Hooks section note (`useFileIO` gained `shareLink`), State section note (`share-boot.ts` boot restore; `setAll` derives grouping), Z-Order section note (grouping preserves the policy), and update the tools count.

- [ ] **Step 3: ROADMAP cleanup** — delete the "Mermaid Import", "Share-by-URL", "Boundary Parent-Child (RF grouping)", and "Vector-DB / Missing-Logo Tools" sections (now shipped); leave Embeddable Package, Sponsors, CoC contact.

- [ ] **Step 4: THE GATE**

Run: `npm run typecheck && npm run lint && npm run format:check && npm run validate:catalog && npm run test && npm run build`
Expected: all seven checks green. Fix anything that fails before handing off.

- [ ] **Step 5: Report to Dor** — list changed files grouped by feature for his commits (suggested split: `catalog: add 11 vector-DB/AI tools` / `feat: Mermaid import` / `feat: share-by-URL` / `feat: boundary parent-child grouping` / `docs: update README+AGENTS+ROADMAP`). Do NOT commit.
