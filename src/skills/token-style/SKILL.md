---
name: token-style
description: 'First in the pipeline: interview for brand aesthetic, then record the anchor as style-spec.json. Use when starting a design system, choosing brand color/type/density, or no style-spec.json exists yet.'
license: MIT
compatibility: Node.js >=22.12
allowed-tools: 'Ask Read Write'
---

# Token Style — Socratic Interview → `style-spec.json`

The leading word is **palette**: 3–5 named colors the whole system derives from. Elicit them; never compute tokens or ramps here.

## Steps

1. **Scan (existing projects only)**: follow `references/discovery-checklist.md` — bounded read-only scan, findings as evidence lines, report never migrate.
   - Done when: every read group has a finding (absence counts), or the workspace is greenfield and this step is skipped aloud.
2. **Interview** (native `ask`, one batch, ≤5 questions; unanswered = recommended default, stated aloud):
   - Brand personality in 3–5 adjectives? → resolve to one cluster via `references/style-clusters.md`; vague modifiers ("premium", "playful") → adjust via `references/design-mappings.md`.
   - Anchor color for the primary: named color, existing hex, or "you choose"? → convert to OKLCH `{ l, c, h }`; `l` 0.45–0.65 keeps both light/dark ramps viable.
   - Steps per color ramp: 5, 9, or 11? (default 11; ask only when the user cares) → `rampSteps`.
   - Typography: font family + feel (compact ratio 1.2 / comfortable 1.25 / expressive 1.333) and base line-height (compact 1.25 / normal 1.5 / airy 1.75, default 1.5 — it sets the vertical-rhythm baseline)?
   - Density: `comfortable` or `compact`?
   - Corner character: sharp (2/4/8), soft (4/8/16), or round (8/16/24) radii?
   - Done when: every field of `assets/style-spec.example.json` has an answer or a stated default.
3. **Propose the palette** (creative — this is your judgement step): from the cluster bounds and the harmony guidance in `token-math/references/color-architecture.md`, pick 3–5 colors: exactly one `primary`, plus `secondary`/`accent`/`other` as the brand needs. The harmony math is guidance, not law — departing from it deliberately is allowed and stated at read-back. Name each color per `references/color-naming.md` (unique kebab slug).
   - Done when: the palette has 3–5 entries, one primary, unique slugs, each with an OKLCH anchor.
4. **Read back**: state the whole pick before recording it — cluster, then per color "role — name — `oklch(...)` — <one-line reason>", flagging any deliberate departure from harmony math and any weak cluster match.
   - Done when: the user confirms, vetoes a color/cluster, or overrides with explicit colors.
5. **Record**: write `style-spec.json` matching `assets/style-spec.example.json` exactly (OKLCH numbers, no hex): `palette` entries `{role, name, anchor}`, `rampSteps`, `cluster` when one resolved, `harmony` when a guidance method was used. If `style-spec.json` already exists, show the current palette/cluster and ask before overwriting it. Neutral hue = primary anchor hue; neutral chroma 0.008–0.015 so grays carry brand temperature.
   - Done when: `style-spec.json` parses, palette has exactly one primary, and every anchor is `{ l: 0–1, c: ≥0, h: 0–360 }`.
6. **Hand off**: tell the user the next command is skill `token-math` (`generate.mjs --spec style-spec.json`).
   - Done when: the user sees the palette with names and OKLCH anchors, plus the hand-off command.

Judgement lives here; arithmetic does not. Ramp steps, contrast, and scales are generated downstream — a hand-guessed ramp here silently breaks the audit gate later.
