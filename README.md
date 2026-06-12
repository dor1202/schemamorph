<p align="center">
  <img src="public/logo.svg" alt="SchemaMorph" height="64">
</p>

<h1 align="center">SchemaMorph</h1>

<p align="center">
  <strong>A system-design canvas that flips between abstract engineering symbols and real vendor logos — instantly.</strong>
</p>

<p align="center">
  Sketch with clean symbols for the interview, hit <kbd>M</kbd>, and the same diagram shows MySQL, Kafka, and NGINX logos — positions, arrows, and labels untouched.
</p>

<p align="center">
  <!-- Badges go live after the repo is created at OWNER/schemamorph -->
  <a href="https://github.com/OWNER/schemamorph/actions/workflows/ci.yml">
    <img src="https://github.com/OWNER/schemamorph/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  </a>
  <a href="https://github.com/OWNER/schemamorph/blob/main/CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
  </a>
</p>

<!-- screenshot: canvas dual-mode -->
<img src="https://github.com/dor1202/schemamorph/blob/main/examples/ecomerce-real.png?raw=true"/>
<img src="https://github.com/dor1202/schemamorph/blob/main/examples/ecomerce-minimal.png?raw=true"/>
<img src="https://github.com/dor1202/schemamorph/blob/main/examples/rag-real.png?raw=true"/>
<img src="https://github.com/dor1202/schemamorph/blob/main/examples/rag-minimal.png?raw=true"/>


---

## Try it

**Live:** https://schemamorph.vercel.app _(update after first deploy)_

**Local:**

```bash
npm install
npm run dev    # → http://localhost:5173
```

---

## Features

### Canvas

- Infinite canvas powered by [React Flow](https://reactflow.dev) — pan, zoom, drag
- **3 node styles** — Symbol (stroke icons), Card (logo + label), Plate (logo-only badge)
- **Auto-layout** — dagre-based Tidy (button in palette); boundary-aware (boundaries wrap around their members post-layout)
- **Boundary grouping** — dragging a boundary moves the nodes inside it; membership follows node centers
- **Resizable + collapsible sidebars** — drag to resize; collapse to maximize canvas; lock mode collapses both sidebars
- **Light + dark themes** — toggle in toolbar; preference stored in browser only
- **Touch & mobile** — full editing on phones/tablets: bottom-sheet palette (tap handle to open/close, tap tool to arm, tap canvas to place), drag-to-bin delete, touch-sized connection handles, one-finger pan + pinch zoom

### Dual-mode toggle

- **Minimalist mode** — clean engineering symbols (cylinder = database, partitioned block = queue)
- **Real Tools mode** — same diagram, vendor logos and brand colors
- **Hotkey `M`** switches modes without moving anything on the canvas
- **Palette search** is mode-aware: searches tool names in Real mode, archetype labels in Minimalist

### Catalog

- **22 archetypes** — databases, queues, caches, compute, gateways, storage, and more
- **190 tools** out of the box — icons sourced from [simple-icons](https://simpleicons.org)
- **Typed attributes + node badges** — per-archetype metadata pins (e.g. replication factor on a database) rendered as compact inline badges
- **Edge colors + protocol presets** — HTTPS, gRPC, WebSocket, TCP, CDC Stream, and more (grouped in the config panel)
- **Animated edges**, custom edge labels, and arbitrary `customProperties` key/value pairs

### Annotations

- **Sticky notes** — small, normal, and title size variants; tint with any color
- **Titles** — floating text labels (title-size note with no background)
- **Step markers** — numbered circles or free-text labels for annotating sequence flows; colorable
- **Free-form arrows** — diagonal, resizable; solid, dashed, or dotted line styles
- **Boundary boxes** — resizable dashed regions for grouping (e.g. "VPC", "Availability Zone"); tidy-layout wraps them around their members

### Files & privacy

- **No backend. No accounts. No data leaves your machine.**
- **`.schemamorph` files** (JSON, format v1.3.0) — export and re-import everything
- **Legacy extensions** — `.schemaflip` and `.sysdraw` files open without migration
- **Share-by-URL** — compress diagram into a `#v=1,…` URL fragment; the hash never reaches any server; copy link from the toolbar
- **Mermaid import** — paste a `flowchart`/`graph` diagram or load a `.mmd` file; nodes are laid out with dagre
- **PNG export** — canvas snapshot; lock badge composited when diagram is locked
- **Autosave** — debounced draft saved to localStorage; restored on next visit

### Quality-of-life

- **Lock mode** — persisted in the file; blocks all edits until explicitly unlocked
- **Undo / redo** — 100-step history (`Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z`)
- **Duplicate selection** — `Cmd/Ctrl+D`
- **Select all** — `Cmd/Ctrl+A`
- **Nudge selected nodes** — Arrow keys (8 px per press)
- **Delete / Backspace** — remove selected nodes or edges

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `M` | Toggle Minimalist ↔ Real Tools mode |
| `Delete` / `Backspace` | Delete selected nodes / edges |
| `Cmd/Ctrl+D` | Duplicate selection |
| `Cmd/Ctrl+Z` | Undo |
| `Cmd/Ctrl+Shift+Z` | Redo |
| `Cmd/Ctrl+A` | Select all |
| Arrow keys | Nudge selected nodes (8 px) |

---

## Add a tool in 4 lines

Edit `src/catalog/tools.json`:

```json
"clickhouse": { "archetype": "database", "label": "ClickHouse", "iconSlug": "clickhouse", "brandColor": "#FFCC01" }
```

Open a PR titled `catalog: add ClickHouse`. CI validates the entry and runs a preview deploy showing your tool in both modes. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full flow.

---

## Development

```bash
npm install
npm run dev               # Vite dev server → http://localhost:5173
npm run test              # Vitest
npm run typecheck         # tsc strict
npm run lint              # ESLint
npm run validate:catalog  # catalog integrity + icon-subset freshness
npm run build             # production build → dist/
```

**Gate** — CI runs all seven checks:

```bash
npm run typecheck && npm run lint && npm run format:check && npm run validate:catalog && npm run test && npm run build
```

---

## Contributing

Contributions are welcome — catalog additions require zero code.

- Read [CONTRIBUTING.md](CONTRIBUTING.md) for the tool/archetype addition flow
- Look for [`good first issue`](https://github.com/OWNER/schemamorph/labels/good%20first%20issue) to find beginner-friendly tasks
- All behavior changes follow TDD: failing test → implement → green
- PR titles follow [Conventional Commits](https://www.conventionalcommits.org/)

---

## Docs

| Document | Description |
|----------|-------------|
| [docs/file-format.md](docs/file-format.md) | `.schemamorph` JSON format spec (v1.3.0) |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Specced deferred features (embeddable package, sponsors, …) |
| [SECURITY.md](SECURITY.md) | Security policy |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Code of conduct |

---

## License

[MIT](LICENSE) — SchemaMorph is free and open source.
