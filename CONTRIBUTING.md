# Contributing to SchemaMorph

## Add a tool (no code!)

1. Find your tool's slug at <https://simpleicons.org> (e.g. `clickhouse`).
2. Add one entry to `src/catalog/tools.json`:
   ```json
   "clickhouse": { "archetype": "database", "label": "ClickHouse", "iconSlug": "clickhouse", "brandColor": "#FFCC01" }
   ```
   - `archetype`: one of the keys in `src/catalog/archetypes.json`
   - `iconSlug`: simple-icons slug for the tool — preferred icon source
   - `svgPath`: alternative for tools not in simple-icons (raw SVG path, 24×24 viewBox); use a sibling tool's path as a family glyph if needed
   - Every tool MUST have either `iconSlug` or `svgPath`. Bare initials-only badges are not acceptable for new entries.
3. If you added or changed an `iconSlug`, run `npm run generate:icons` to regenerate the bundled icon subset. CI will fail if this file is stale.
4. Run `npm run validate:catalog` — fix anything it flags.
5. Open a PR titled `catalog: add ClickHouse`. The preview deploy will show your tool rendering in both modes.

## Add an archetype (still no code)

Add an entry to `src/catalog/archetypes.json` with `label`, `brandColor`,
`symbolViewBox`, `symbolSvg` (inline SVG using `stroke="currentColor"`), and a
`defaultTool` that exists in `tools.json` with your archetype.

You may also add an optional `attributes` array of typed per-archetype attributes.
Each attribute needs `key` (unique, lowercase, hyphenated), `label` (display name),
and `type` (`enum` | `number` | `text` | `boolean`). Enum attributes must include
a non-empty `options` array; text attributes may include `suggestions` for autocomplete.
These pins appear in ConfigPanel and render as compact badges on node cards.

## Code contributions

- TDD: every behavior change ships with a test written first.
- `npm run typecheck && npm run lint && npm run test` must pass.
- New runtime dependencies need a justification in the PR description.
- PR titles follow Conventional Commits (`feat:`, `fix:`, `docs:`, `catalog:`, `perf:`, `style:`, `build:` …).

## File format

`.schemamorph` format changes are versioned independently of app releases and
documented in `docs/file-format.md` with a migration note per bump.

## Internal naming

The following internal module and symbol names intentionally retain the original
`sysdraw` identifier. Renaming them would churn every test with zero user-visible
benefit — they are documented here so contributors know this is deliberate:

- `src/lib/sysdraw-file.ts` — file module name
- `serializeSysdraw`, `parseSysdraw` — serialization functions
- `sysdrawFileSchema` — zod schema export
- `SysdrawFile` — TypeScript type
- `SYSDRAW_VERSION` — format version constant
- `DND_MIME = 'application/sysdraw-node'` — drag-and-drop MIME type (Canvas.tsx)
- `importSysdrawText` — import helper (useFileIO.ts)
