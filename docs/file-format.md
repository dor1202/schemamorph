# .schemamorph File Format

Format version: **1.3.0** (independent of app releases)

A `.schemamorph` file is JSON:

| Field | Type | Notes |
|---|---|---|
| `version` | string | format version, currently `1.3.0` |
| `meta.title` | string? | diagram name, used for filenames |
| `meta.lastModified` | string? | ISO-8601 |
| `meta.viewMode` | `minimalist` \| `real`? | restored on load |
| `meta.nodeStyle` | `symbol` \| `card` \| `plate`? | restored on load |
| `nodes[]` | discriminated union on `type` | see node types table below |
| `edges[]` | `{ id, source, target, type: 'sysEdge', data?, animated? }` | `data: { label?, protocol?, color?, customProperties? }`; `animated?: boolean` |

## Node Types (v1.3.0)

| `type` | Required fields | Optional fields | Notes |
|---|---|---|---|
| `sysNode` | `id, type, position, data.{archetype, concreteTool, label}` | `data.customProperties` | Component nodes (databases, queues, etc.) |
| `noteNode` | `id, type, position, data.{text}` | `data.color, data.size` | Sticky-note annotation; `color` tints bg; `size` is `small`\|`normal`\|`title` (default `normal`); title variant has no bg/border |
| `boundaryNode` | `id, type, position, data.{label}` | `width, height, data.color` | Dashed grouping region (e.g. "VPC"); `color` tints the boundary border/fill |
| `stepNode` | `id, type, position, data` | `data.n, data.label, data.color` | Step marker (circle/pill); `label` is a free-text string (new in v1.3.0, takes precedence over `n`); `data.n` is a legacy numeric identifier (`n` is still emitted — its existing value, defaulting to `0` — so v1.2 readers load v1.3 files); `color` is the fill (default `#3b82f6`); a step with neither `n` nor `label` renders as a blank circle |
| `arrowNode` | `id, type, position, data.{dx, dy}` | `data.color, data.lineStyle` | Free-form arrow (Excalidraw-style); `position` = START point; END = `(position.x+dx, position.y+dy)`; `dx`/`dy` may be negative (any direction, crossing works); `lineStyle` is `solid`\|`dashed`\|`dotted` (default `solid`); dashed = `8 6` dash array, dotted = `2 5` round-cap; default `dx=140, dy=-60` |

## Edge Data Fields (v1.2.0)

All fields under `edges[].data` are optional:

| Field | Type | Notes |
|---|---|---|
| `label` | string? | edge label shown in the middle of the connector |
| `protocol` | string? | protocol preset name (e.g. `"HTTPS"`, `"gRPC"`) — drives connector color |
| `color` | string? | explicit CSS color override for the connector stroke |
| `customProperties` | `Record<string, string>`? | arbitrary key/value pairs shown in the config panel |

## Compatibility rules

- **v1.0 → v1.1:** Old files (all `sysNode`) parse fine — backward compatible. New node types (`noteNode`, `boundaryNode`) and optional fields (`color`, `customProperties`, `meta.locked`) are additive; old readers that strip unknown fields continue to work.
- **v1.1 → v1.2:** Additive only. New node types (`stepNode`, `arrowNode`) and optional `noteNode.data.size` field. v1.0 and v1.1 files parse correctly with the v1.2 parser.
- **v1.2 → v1.3:** Additive. `stepNode` gains optional `label` (string); `data.n` is still emitted (its existing value, defaulting to `0`) so v1.2 readers load v1.3 files. Files with only `data.n` (v1.2-style) continue to parse and render correctly.
- Unknown extra fields are stripped on import (forward compatible).
- Unknown `archetype`/`concreteTool` values load with a fallback badge — files survive catalog changes.
- Any breaking change bumps the major version and gets a migration note here.
- **Metadata pins** (typed per-archetype attributes) are stored in `customProperties` — no format change.

## Z-order policy

`zIndex` is runtime-assigned at creation by node type and is not stored in the file; on load, `setAll` normalises it by type so old files always get the current policy.

| Node type | zIndex |
|---|---|
| `boundaryNode` | -1 (back) |
| `sysNode` | 0 (RF default) |
| `noteNode`, `stepNode`, `arrowNode` | 1 (front) |

## Legacy extensions

Files with a `.schemaflip` or `.sysdraw` extension created before the SchemaMorph rename open
without any migration step — the JSON format is identical. The Load dialog
accepts `.schemamorph`, `.schemaflip`, and `.sysdraw` extensions.
