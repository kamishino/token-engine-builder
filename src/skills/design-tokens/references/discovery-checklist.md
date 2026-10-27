# Discovery checklist — scan before interviewing

Read when the workspace is an existing project (not greenfield). Bounded, **read-only** scan: record each finding as one evidence line (`"<path>: <fact>"`), report — never migrate, rewrite, or import anything you read. Findings become interview defaults stated aloud, not silent assumptions.

## Read groups

| Group                  | What to read                                                                                                                         | Feeds                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Toolchain              | `package.json`, lockfiles, `tsconfig*`, framework configs (`vite.config.*`, `next.config.*`, `svelte.config.*`, `tailwind.config.*`) | Whether emitted CSS/Tailwind v4 output will be consumed as-is                        |
| Existing design system | `tokens*.json`, `*.tokens.*`, `theme*`, `styles/**`, `:root` custom-property blocks                                                  | Candidate anchor (existing brand color → OKLCH); reuse-vs-replace call, stated aloud |
| Components             | Top-level component dirs, `*.stories.*`, route/page dirs                                                                             | Density hint (data-dense tables → `compact`)                                         |
| Brand                  | `public/**` logos/favicons, `fonts/**`, brand guidelines                                                                             | Font stack default; anchor candidate from logo color                                 |
| Locales                | `locales/`, `i18n*`, `messages/**`                                                                                                   | Type-scale headroom (long-string languages argue against expressive ratios)          |

A missing group is still a finding ("no token files found — greenfield"). Never guess a fact you can read; never ask the human for one you can read either.

## How findings enter the record

- Existing brand color found → propose it as the anchor candidate (converted to OKLCH) at read-back; cluster resolution then _checks_ which cluster box it falls in instead of choosing freely.
- Existing tokens found → default posture is replace-the-color-layer, report-the-rest; explicit "keep" from the user overrides.
- Nothing found → pure interview path (`style-clusters.md`), no scan output to reconcile.

Adapted from the kamiflow `design-system-tokens` Pass 0 discovery checklist; decision-record and platform machinery dropped (this pipeline records `tokens.config.json` only).
