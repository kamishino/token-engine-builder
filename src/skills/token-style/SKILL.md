---
name: token-style
description: 'First in the pipeline: interview for brand aesthetic, then record the anchor as style-spec.json. Use when starting a design system, choosing brand color/type/density, or no style-spec.json exists yet.'
license: MIT
compatibility: Node.js >=22.12
allowed-tools: 'Ask Read Write'
---

# Token Style — Socratic Interview → `style-spec.json`

The leading word is **anchor**: one OKLCH color the whole system derives from. Elicit it; never compute tokens here.

## Steps

1. **Scan (existing projects only)**: follow `references/discovery-checklist.md` — bounded read-only scan, findings as evidence lines, report never migrate.
   - Done when: every read group has a finding (absence counts), or the workspace is greenfield and this step is skipped aloud.
2. **Interview** (native `ask`, one batch, ≤5 questions; unanswered = recommended default, stated aloud):
   - Brand personality in 3–5 adjectives? → resolve to one cluster via `references/style-clusters.md`; vague modifiers ("premium", "playful") → adjust via `references/design-mappings.md`.
   - Anchor color: named color, existing hex, or "you choose"? → convert to OKLCH `{ l, c, h }`; `l` 0.45–0.65 keeps both light/dark ramps viable.
   - Typography: font family + feel (compact ratio 1.2 / comfortable 1.25 / expressive 1.333)?
   - Density: `comfortable` or `compact`?
   - Corner character: sharp (2/4/8), soft (4/8/16), or round (8/16/24) radii?
   - Done when: every field of `assets/style-spec.example.json` has an answer or a stated default.
3. **Read back**: state the pick before recording it — "Reading this as: `<cluster>`, anchor `oklch(<l> <c> <h>)` because <one-line reason>." A weak cluster match is named as weak.
   - Done when: the user confirms, vetoes to another cluster, or overrides with an explicit color.
4. **Record**: write `style-spec.json` matching `assets/style-spec.example.json` exactly (OKLCH numbers, no hex), including `cluster` when one resolved. If `style-spec.json` already exists, show the current anchor/cluster and ask before overwriting it. Neutral hue = anchor hue; neutral chroma 0.008–0.015 so grays carry brand temperature.
   - Done when: `style-spec.json` parses and `brandAnchor` is `{ l: 0–1, c: ≥0, h: 0–360 }`.
5. **Hand off**: tell the user the next command is skill `token-math` (`generate.mjs --spec style-spec.json`).
   - Done when: the user sees the anchor in OKLCH and the hand-off command.

Judgement lives here; arithmetic does not. Ramp steps, contrast, and scales are generated downstream — a hand-guessed ramp here silently breaks the audit gate later.
