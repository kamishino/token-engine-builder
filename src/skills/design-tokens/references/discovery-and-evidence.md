# Discovery & Evidence Reference

Read during Phase 1 (Silent Context Triage) on brownfield projects, or Phase 2 (Socratic Aesthetic Synthesis) when extracting or interpreting candidate styling.

## Scan before interviewing

Bounded, **read-only** scan: record each finding as one evidence line (`"<path>: <fact>"`), report — never migrate, rewrite, or import anything you read. Findings become interview defaults stated aloud, not silent assumptions.

### Read groups

| Group                  | What to read                                                                                                                         | Feeds                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Toolchain              | `package.json`, lockfiles, `tsconfig*`, framework configs (`vite.config.*`, `next.config.*`, `svelte.config.*`, `tailwind.config.*`) | Whether emitted CSS/Tailwind v4 output will be consumed as-is                        |
| Existing design system | `tokens*.json`, `*.tokens.*`, `theme*`, `styles/**`, `:root` custom-property blocks                                                  | Candidate anchor (existing brand color → OKLCH); reuse-vs-replace call, stated aloud |
| Components             | Top-level component dirs, `*.stories.*`, route/page dirs                                                                             | Density hint (data-dense tables → `compact`)                                         |
| Brand                  | `public/**` logos/favicons, `fonts/**`, brand guidelines                                                                             | Font stack default; anchor candidate from logo color                                 |
| Locales                | `locales/`, `i18n*`, `messages/**`                                                                                                   | Type-scale headroom (long-string languages argue against expressive ratios)          |

A missing group is still a finding ("no token files found — greenfield"). Never guess a fact you can read; never ask the human for one you can read either.

### How findings enter the record

- Existing brand color found → propose it as the anchor candidate (converted to OKLCH) at read-back; cluster resolution then _checks_ which cluster box it falls in instead of choosing freely.
- Existing tokens found → default posture is replace-the-color-layer, report-the-rest; explicit "keep" from the user overrides.
- Nothing found → pure interview path ([`palette.md`](palette.md)), no scan output to reconcile.

Adapted from the kamiflow `design-system-tokens` Pass 0 discovery checklist; decision-record and platform machinery dropped (this pipeline records `tokens.config.json` only).

## How extract scores candidates

Read when interpreting extract output or questioning a candidate. Implemented in `src/shared/extract.ts` (builder repo); this file explains, never overrides.

### Scan scope

Files: `.css .scss .json .ts .tsx .js .jsx .html`, plus `.md` through the DESIGN.md path below. Recursive, sorted. Skipped directories: `node_modules`, `.git`, `dist`, `release`, `coverage`, `.next`. Unparseable colors are skipped silently (they are evidence of nothing). CSS custom properties named `--color-<role>` (including `:root` blocks) record matching primary, secondary, and accent roles; role names are normalized (`--color-`, `-<step>` stripped).

### DESIGN.md frontmatter (highest precedence)

A Markdown file starting with a `---` frontmatter block is parsed as a Stitch DESIGN.md, not prose-scanned: `colors.primary`/`colors.secondary` are preserved as the recorded palette (never re-derived), `typography.fontSans`/`scale`, `rounded` (sm/md/lg), and `spacing.density` map to spec fields when present, and the `components` list is noted as evidence, not ingested. The palette is completed to 3 colors with analogous synthesis only for missing roles, and `harmony: 'analogous'` is recorded only when synthesis supplied a missing role. Cluster resolution is not performed by the scanner and happens at `design-tokens` read-back (ADR-0004 forbids a second bounds table in code). Markdown without frontmatter falls through to the generic color scan below at lowest confidence.

### Color scoring (per distinct color, grouped by serialized OKLCH)

| Signal                                               | Points         |
| ---------------------------------------------------- | -------------- |
| Name contains brand/primary/accent                   | +60            |
| Name contains main/cta/link/button                   | +20            |
| Name contains bg/background/surface/text/border/base | −40            |
| Chroma ≥ 0.03                                        | + chroma × 100 |
| Chroma < 0.03 (neutral)                              | −50            |
| Lightness 0.35–0.75                                  | +20 (else −20) |
| Each additional occurrence                           | +2             |

The winner becomes the candidate anchor. Backgrounds and text colors are common but score low by design — the anchor should be the brand signal, not the canvas.

### Other signals

- **Font**: first `font-family` declaration found (quotes stripped). Absent → Inter/system default, stated in output.
- **Radius**: most frequent `border-radius` px value becomes `md`; `sm` = md/2, `lg` = md×2.
- **Name**: `package.json` name (scope stripped), else the root folder name.
- **Everything else** (neutral hue = anchor hue, spacing 4px, ratio 1.25, density comfortable) is a stated default for the read-back to change, not a finding.

## State → next action

The engine's state evaluation command is authoritative:
```bash
node <skill-root>/scripts/token-engine.mjs route --root . --json
```
Deterministic transitions (missing tokens → `generate`, missing audit stamp → `audit`, missing build → `build`, certified → `diagnose`) are executed automatically or suggested by `route`. Two states require agent judgment:

| State | Detected Condition | Next Action | Rationale |
| :--- | :--- | :--- | :--- |
| **No specification** | `tokens.config.json` missing | `extract` or Socratic interview | Extract candidate anchors if code colors exist; otherwise run the Socratic interview per [`palette.md`](palette.md). |
| **Invalid specification** | `tokens.config.json` fails validation | Socratic review | Review printed schema validation errors and correct required fields in `tokens.config.json`. |
