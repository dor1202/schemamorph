# Roadmap Batch — Design Spec

**Date:** 2026-06-06
**Status:** Approved (brainstorming complete)
**Scope:** Four roadmap features: vector-DB catalog additions, Mermaid import, share-by-URL, boundary parent-child grouping. Source specs: `docs/ROADMAP.md`; decisions below refine and in places supersede the ROADMAP text.

---

## 1. Vector-DB / AI-infra catalog additions

11 new tools (Mistral already shipped under `ml`). No app code changes — JSON entries plus generated icon subset.

### Entries

| Tool | Archetype | Mark |
|---|---|---|
| Qdrant | `search` | `iconSlug: "qdrant"` (verified in installed simple-icons) |
| Milvus | `search` | `iconSlug: "milvus"` (verified) |
| Vespa | `search` | `iconSlug: "vespa"` (verified) |
| Pinecone | `search` | hand-authored 24×24 `svgPath` |
| Weaviate | `search` | hand-authored `svgPath` |
| Chroma | `search` | hand-authored `svgPath` |
| LanceDB | `search` | hand-authored `svgPath` |
| pgvector | `search` | hand-authored `svgPath` (elephant + vector motif — must be visually distinct from the existing PostgreSQL entry; the bare `postgresql` slug is forbidden here) |
| Cohere | `ml` | hand-authored `svgPath` |
| Together AI | `ml` | hand-authored `svgPath` |
| Groq | `ml` | hand-authored `svgPath` |

- Brand colors from official brand assets; legibility on dark/light handled by existing `color.ts` luminance utilities in the renderers.
- Hand-authored glyphs: simplified single-path approximations of the public brand logo, recognizable at 24 px (per catalog rules — bare initials forbidden).

### Process

1. Add entries to `src/catalog/tools.json`.
2. `npm run generate:icons` (pulls the 3 new slugs into `icons.generated.ts`).
3. `npm run validate:catalog` must pass (visible-mark rule enforced).

### Tests

Existing catalog schema tests + validator cover the contract. No new test files expected; if the validator gains a rule (none planned), it gets a test.

---

## 2. Mermaid import

Paste **and** file input; regex parser; no new runtime dependency.

### UI

- "Paste Mermaid" button in the Toolbar **Load** group. Disabled when `locked`.
- Native `<dialog>`: textarea ("Paste Mermaid diagram"), **Load .mmd file** button (accepts `.mmd`/`.mermaid`/`.txt`, 5 MB cap — same as `.schemamorph` import; file content fills the same parse flow), **Import**, **Cancel**.
- Parse failure renders an inline error inside the dialog; canvas untouched.

### Parser — `src/lib/mermaid-import.ts` (pure function)

```ts
parseMermaid(text: string):
  | { ok: true; nodes: SysNode[]; edges: SysEdge[]; direction: LayoutDirection }
  | { ok: false; error: string }
```

- Headers: `flowchart LR|TD|TB|RL|BT` and `graph <dir>`. Direction maps to `LayoutDirection` (`TD`/`TB`/`BT` → `TB`; `LR`/`RL` → `LR`).
- Shape → archetype:
  - `id[(label)]` → `database`
  - `id{{label}}` → `gateway`
  - `id([label])` → `compute`
  - `id[/label/]` → `compute`
  - `id((label))` → `cache`
  - `id>label]` → `queue`
  - `id[label]` and bare `id` → `compute`
- Node: `concreteTool = archetypes[archetype].defaultTool`; label from brackets, surrounding quotes stripped.
- Edges: `A --> B`, `A -- text --> B`, `A -->|text| B`, `A -.-> B`, `A ==> B` → `sysEdge` with optional `data.label`.
- Silently ignored lines: `subgraph`/`end`, `classDef`, `class`, `style`, `linkStyle`, `click`, `%%` comments, blank lines.
- Zero nodes parsed → `{ ok: false, error: "No nodes found — check your Mermaid syntax." }`.

### Import flow

1. Parse; on failure show inline dialog error.
2. `layoutPositions(nodes, edges, direction)` from `src/lib/layout.ts`.
3. Canvas non-empty → confirm "Replace current diagram?"; cancel aborts.
4. `setAll(nodes, edges)` — same path as file import; history cleared (matches file-load semantics).

### Tests (TDD)

Parser unit tests per shape and edge variant, quoted labels, ignored directives, malformed input, empty result. Dialog component tests (open, paste, file-load, inline error, import, lock-disabled). Integration: import populates store with laid-out positions; replace-confirm branch.

---

## 3. Share-by-URL

Serverless one-way snapshot sharing via URL fragment.

### Module — `src/lib/share-url.ts`

```ts
encodeShareHash(json: string): Promise<string>        // deflate-raw (CompressionStream) → base64url → "v=1,<data>"
decodeShareHash(hash: string): Promise<string | null> // null = not a share hash; throws on corrupt payload
```

- `base64url` alphabet (no `+` `/` `=`) — fragment-safe.
- `CompressionStream`/`DecompressionStream` required (evergreen browsers + Safari ≥ 16.4). No fallback: Share button shows an error toast when the API is missing.

### Share button (Toolbar, in the export group)

1. `serializeSysdraw(state)` — identical JSON to file export; `locked` included.
2. Encode. Encoded payload > 8 KB → warning toast "Diagram too large to share by URL — save to a file instead"; abort, URL untouched.
3. Write `#v=1,<data>` to the location, copy `location.href` via `navigator.clipboard.writeText`, toast "Link copied!".
4. Immediately strip the hash with `history.replaceState` — local URL stays clean; link already in clipboard.

### Boot sequence (before autosave restore)

- Hash starts with `#v=1,` → decode → `parseSysdraw` → `setAll` (meta respected — a snapshot shared while `locked` opens locked) → strip hash via `replaceState` → **skip autosave restore for this boot**.
- Decode or parse failure → error toast, fall through to normal autosave restore.
- No share hash → normal boot.

### Privacy

URL fragments are never sent in HTTP requests — diagram content stays client-side, consistent with the no-backend stance. README gains a line under Files & privacy. File format unchanged.

### Tests

Encode/decode roundtrip (verify jsdom/Node CompressionStream availability in test env; polyfill in `src/test/setup.ts` if absent), base64url alphabet, size-limit branch, boot precedence (share hash beats autosave), corrupt-hash fallback, locked propagation.

---

## 4. Boundary parent-child grouping

Dragging a boundary moves its members. Free-drag membership; persistence derived — **file format stays v1.2.0**.

### Membership rule (single source of truth)

Node **center inside boundary rect** = member — same rule Tidy already uses. Eligible: `sysNode`, `noteNode`, `stepNode`, `arrowNode`. Boundaries are never members (no nesting).

### Helpers — `src/lib/grouping.ts` (pure)

```ts
computeMembership(nodes: AppNode[]): Map<string, string | null> // nodeId → boundaryId
applyGrouping(nodes: AppNode[]): AppNode[]
// sets/clears parentId, converts positions abs↔rel, orders parents before children
```

React Flow `parentId` semantics: child positions are parent-relative and parents must precede children in the array — `applyGrouping` enforces both.

### Wiring (Canvas + store)

| Trigger | Behavior |
|---|---|
| Node drag-stop | Recompute membership for dragged nodes: in → set `parentId` + relativize; out → clear + absolutize |
| Boundary drag-stop | Members move with boundary automatically (RF). Then recompute capture for newly-overlapped nodes |
| Boundary resize-stop | Recompute membership |
| `setAll` (file load / autosave restore / Mermaid import) | Derive membership geometrically, then normalize zIndex (boundaries stay −1 even with children) |
| Tidy | After `layoutPositions` + boundary wrap, re-derive membership (wrap math unchanged; `parentId` applied on top) |

### Serialization

Export converts member positions back to **absolute** and drops `parentId` — `.schemamorph` format untouched (v1.2.0); old readers unaffected. Roundtrip (export → import) must preserve absolute geometry exactly.

### Undo

Membership changes ride the existing drag snapshot pattern — snapshot at drag-start, one undo entry per drag.

### Edge cases

- Member dragged out → `parentId` cleared on drop, position absolutized.
- Boundary deleted → members orphaned: `parentId` cleared, positions absolutized (no member deletion).
- Duplicate selection including a boundary → copies keep grouping within the copied set.

### Tests

`computeMembership`/`applyGrouping` units (in/out/capture/ordering/relativize/parent-first), serialize-roundtrip absolute-position invariant, `setAll` derivation + zIndex policy, boundary deletion orphaning, duplication grouping, Tidy integration.

---

## Build order

1. Catalog additions (isolated, no code)
2. Mermaid import (new module + dialog; touches Toolbar)
3. Share-by-URL (new module + button + boot hook)
4. Boundary grouping (most invasive: Canvas, store `setAll`, serializer)

Each lands gate-green (`typecheck · lint · format · catalog · test · build`) before the next starts. TDD throughout.

## Out of scope

- Nested boundaries
- Mermaid subgraph → boundary mapping (future: pairs naturally with grouping, deferred)
- Full `mermaid` package parser (bundle cost)
- Real-time collaboration (ruled out — needs server)
- Embeddable `@schemamorph/react` package (separate cycle)
- Mobile/touch support (tracked as task #5, own brainstorm cycle)
