# Extraction heuristics — how candidates are scored

Read when interpreting extract output or questioning a candidate. Implemented in `scripts/extract.ts`; this file explains, never overrides.

## Scan scope

Files: `.css .scss .json .ts .tsx .js .jsx .html`, plus `.md` through the DESIGN.md path below. Recursive, sorted. Skipped directories: `node_modules`, `.git`, `dist`, `release`, `coverage`, `.next`. Unparseable colors are skipped silently (they are evidence of nothing).

## DESIGN.md frontmatter (highest precedence)

A Markdown file starting with a `---` frontmatter block is parsed as a Stitch DESIGN.md, not prose-scanned: `colors.primary`/`colors.secondary` are preserved as the recorded palette (never re-derived), `typography.fontSans`/`scale`, `rounded` (sm/md/lg), and `spacing.density` map to spec fields when present, and the `components` list is noted as evidence, not ingested. The palette is completed to 3 colors with analogous synthesis only for missing roles. After construction, the primary anchor is checked against the Kobayashi cluster bounds: exactly one containing cluster is recorded as `cluster`; otherwise the output says so (creative departure to confirm at read-back). Markdown without frontmatter falls through to the generic color scan below at lowest confidence.

## Color scoring (per distinct color, grouped by serialized OKLCH)

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

## Other signals

- **Font**: first `font-family` declaration found (quotes stripped). Absent → Inter/system default, stated in output.
- **Radius**: most frequent `border-radius` px value becomes `md`; `sm` = md/2, `lg` = md×2.
- **Name**: `package.json` name (scope stripped), else the root folder name.
- Everything else (neutral hue = anchor hue, spacing 4px, ratio 1.25, density comfortable) is a stated default for the read-back to change, not a finding.
