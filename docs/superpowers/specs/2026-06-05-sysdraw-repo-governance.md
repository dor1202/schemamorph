# SysDraw — Repo Specs & Guards

**Date:** 2026-06-05
**Status:** Approved
**Companion to:** [2026-06-05-sysdraw-design.md](./2026-06-05-sysdraw-design.md)

## License

**MIT** — `LICENSE` at repo root. Maximum contributor-friendliness and adoption; standard for frontend OSS.

## Branch & Merge Rules

- `main` is protected: no direct pushes, no force pushes, PRs only.
- Required before merge: all CI checks green + 1 approving review.
- **Squash-merge only** — linear history; PR title becomes the commit subject.
- PR titles follow Conventional Commits (`feat:`, `fix:`, `docs:`, `catalog:`...) — enforced by a PR-title lint action, not commit-by-commit hooks (friendlier to casual contributors).
- Head branches auto-deleted after merge.

## CI Pipeline (GitHub Actions, required checks)

Runs on every PR and push to `main`:

1. **typecheck** — `tsc --noEmit`
2. **lint** — ESLint + Prettier check
3. **test** — Vitest (unit + component)
4. **catalog validation** — zod-validate `archetypes.json` / `tools.json` / `protocols.json`; verify every `iconSlug` exists in simple-icons; clear per-entry failure messages (the no-code contribution guard)
5. **build** — `vite build` must succeed
6. **audit** — `npm audit --audit-level=high` (non-blocking warning ≤ moderate, blocking ≥ high)

Deploy: Vercel builds previews per PR; production deploy on push to `main` after checks pass.

## Dependency Guards

- Committed `package-lock.json`.
- Dependabot: weekly, npm + github-actions ecosystems, grouped minor/patch PRs.
- New runtime dependencies require maintainer justification in the PR description (keep bundle small — guard noted in PR template).

## Community Files

| File | Content |
|---|---|
| `LICENSE` | MIT |
| `README.md` | What/why, live demo link, screenshots of both modes, quickstart, "add a tool in 4 lines" teaser |
| `CONTRIBUTING.md` | Dev setup; **add-a-tool walkthrough** (JSON entry → PR → preview deploy → merge); add-an-archetype walkthrough; code contribution guide (TDD expected) |
| `CODE_OF_CONDUCT.md` | Contributor Covenant v2.1 |
| `SECURITY.md` | Private vulnerability reporting via GitHub Security Advisories; supported version = latest deploy |
| `CODEOWNERS` | Default: maintainers. `src/catalog/` separately listed so catalog PRs route review correctly |

## Issue & PR Templates

- **Issue templates (forms):**
  - `bug_report.yml` — repro steps, browser, attach `.sysdraw` file
  - `feature_request.yml`
  - `new_tool_request.yml` — tool name, archetype, simple-icons slug, brand color (pre-structured so the issue is nearly the JSON entry)
- **PR template:** checklist — tests added (TDD), catalog entries validated locally (`npm run validate:catalog`), no new runtime deps without justification, screenshots for UI changes

## Repo Settings

- Discussions enabled (Q&A + show-and-tell for diagrams).
- Labels: `good first issue` (catalog additions are the canonical one), `catalog`, `bug`, `enhancement`.
- Secret scanning + push protection enabled (default for public repos).

## Releases

- Continuous deploy from `main` — the site is always latest.
- Tagged GitHub Releases (`v1.0.0`...) at milestones with auto-generated notes.
- `.sysdraw` **file-format version is independent** of app version; format changes documented in `docs/file-format.md` with a migration note per bump.
