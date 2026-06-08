# Security Policy

SchemaMorph is frontend-only: no server, no accounts, diagrams never leave the
browser (localStorage only).

## Reporting a vulnerability

Use GitHub's private vulnerability reporting ("Security" tab → "Report a
vulnerability"). Please do not open public issues for security reports.
Supported version: the latest deployed build.

## Design notes for reviewers

- Imported `.schemamorph` files (and legacy `.schemaflip` and `.sysdraw` files — same JSON format)
  are untrusted: zod-validated, size-capped (5 MB), rendered only through
  React's default escaping. Imported nodes reference catalog entries **by key**
  — files can never carry SVG or executable content.
- `dangerouslySetInnerHTML` is used in exactly two places
  (`src/components/canvas/SysNode.tsx` and `src/components/sidebar/Palette.tsx`),
  both rendering `archetype.symbolSvg` from the **bundled, CI-validated catalog** —
  never user input.
- CSP (`vercel.json`): `default-src 'self'`; the only external origin is
  Vercel Analytics.
