# SchemaMorph Roadmap

Deferred features with enough implementation detail to hand to a contributor.

---

## Embeddable Package & Plugin System

**Goal:** Let other products embed SchemaMorph the way Google Cloud, Meta,
CodeSandbox, Obsidian, Replit, Slite, Notion, and HackerRank embed Excalidraw —
a drop-in React component plus a plugin surface for host-app customization.

### Embeddable component (`@schemamorph/react`)

- Extract the canvas + store + config panel into a library entry point
  (`src/lib-entry.tsx`) exporting `<SchemaMorph />` with props:
  `initialData?: SysdrawFile`, `onChange?(file: SysdrawFile)`, `viewMode?`,
  `nodeStyle?`, `theme?`, `readOnly?` (maps to lock mode), `hideToolbar?`,
  `hidePalette?`.
- Build: Vite library mode (`build.lib`) producing ESM + CJS + types;
  `react`, `react-dom`, `@xyflow/react` become peerDependencies.
- The store must become instance-scoped (factory + React context) instead of a
  module singleton — two embeds on one page must not share state. This is the
  main refactor cost.
- Publish as `@schemamorph/react` on npm; the standalone app becomes the first
  consumer of the package.

### Plugin hooks (after the package exists)

- `catalogExtensions`: host injects extra archetypes/tools at mount
  (validated with the same zod schemas).
- `nodeRenderers`: override or add node renderers per archetype.
- `toolbarItems`: host-defined toolbar buttons (e.g. "Save to our backend").
- `onExport` interceptors (host captures PNG/file bytes instead of download).

### Target integrations (aspirational, drives API design)

Docs/wiki tools (Notion/Slite-style page embeds), IDE sandboxes
(CodeSandbox/Replit-style), note apps (Obsidian plugin), interview platforms
(HackerRank-style system-design questions with locked starter diagrams —
`readOnly` + `initialData` covers this).

---

## Sponsors Section

**Goal:** Sustainable maintenance funding once the project has traction.

- Add `.github/FUNDING.yml` (GitHub Sponsors and/or Open Collective) — enables
  the "Sponsor" button on the repo.
- README gains a **Sponsors** section (Excalidraw-style logo wall): tiered
  placement (logo + link for org sponsors, name list for individuals); update
  via a small script or manually per release.
- Mention sponsorship in CONTRIBUTING.md ("other ways to support").
- Prerequisite: real-world usage first — don't add the section while empty;
  an empty sponsor wall reads worse than none.

---

## CoC Contact Method

**User step:** `CODE_OF_CONDUCT.md` currently contains the placeholder `[INSERT CONTACT METHOD]` on line ~40. Replace it with a real email address or a link to GitHub Discussions before the first public release.

No code change required — edit the markdown file directly.
