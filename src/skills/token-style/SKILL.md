---
name: token-style
description: 'First in the pipeline: interview for brand aesthetic, then record the anchor as style-spec.json. Use when starting a design system, choosing brand color/type/density, or no style-spec.json exists yet.'
license: MIT
compatibility: Node.js >=22.12
allowed-tools: 'Read Write'
---

# Token Style — Socratic Interview → `style-spec.json`

The leading word is **palette**: 3–5 named colors the whole system derives from. Elicit them; never compute tokens or ramps here.

## Steps

1. **Scan (existing projects only)**: follow `references/discovery-checklist.md` — bounded read-only scan, findings as evidence lines, report never migrate.
   - Done when: every read group has a finding (absence counts), or the workspace is greenfield and this step is skipped aloud.
2. **Interview** (one batch, ≤7 questions; split into two batches only when the host's question tool caps the batch; use the host's question tool if available, otherwise ask in chat; unanswered = recommended default, stated aloud):
   - Brand personality in 3–5 adjectives? → resolve to one cluster via `references/style-clusters.md`; vague modifiers ("premium", "playful") → adjust via `references/design-mappings.md`.
   - Anchor color for the primary: named color, existing hex, or "you choose"? → convert to OKLCH `{ l, c, h }`; `l` 0.45–0.65 keeps both light/dark ramps viable.
   - Steps per color ramp: 5, 9, or 11? (default 11; ask only when the user cares) → `rampSteps`.
   - Typography: font family + feel (compact ratio 1.2 / comfortable 1.25 / expressive 1.333) and base line-height (compact 1.25 / normal 1.5 / airy 1.75, default 1.5 — it sets the vertical-rhythm baseline)?
   - Density: `comfortable` or `compact`?
   - Corner character: sharp (2/4/8), soft (4/8/16), or round (8/16/24) radii?
   - Done when: every field of `assets/style-spec.example.json` has an answer or a stated default.
3. **Propose the palette** (creative — this is your judgement step): from the cluster bounds and the harmony guidance in `references/color-architecture.md`, pick 3–5 colors: exactly one `primary`, plus `secondary`/`accent`/`other` as the brand needs. The harmony math is guidance, not law — departing from it deliberately is allowed and stated at read-back. Name each color per `references/color-naming.md` (unique kebab slug from the vendored catalog; a non-catalog slug is allowed only as a stated departure and warns at generate).
4. **Read back**: state the whole pick before recording it — cluster, then per color "role — name — `oklch(...)` — <one-line reason>", flagging any deliberate departure from harmony math and any weak cluster match.
   - Done when: the user confirms, vetoes a color/cluster, or overrides with explicit colors.
5. **Record**: write `style-spec.json` matching `assets/style-spec.example.json` exactly (OKLCH numbers, no hex): `palette` entries `{role, name, anchor}`, `rampSteps`, `cluster` when one resolved (plus `clusterBounds` copied from the cluster's row in `references/style-clusters.md`), `harmony` when a guidance method was used, and a `guide` block (2–3 sentence `overview` plus 3–5 `dos`/`donts` for the generated DESIGN.md; omit it only when the user has nothing to add). If `style-spec.json` already exists, show the current palette/cluster and ask before overwriting it. Neutral hue = primary anchor hue; neutral chroma 0.008–0.015 so grays carry brand temperature.
   - Done when: `style-spec.json` parses, palette has exactly one primary, and every anchor is `{ l: 0–1, c: ≥0, h: 0–360 }`.
     Run the next command from the user's project root. `<token-math-root>` is the `token-math` skill's installed folder; resolve it with your skill loader, or invoke the `token-math` skill by name.

**Before running a command:** state the resolved value of `<token-math-root>` in your reply, then substitute it. If you cannot resolve it, stop and ask the user for the `token-math` skill folder. Never run a command containing literal `<` or `>`.

Example: if `token-math/SKILL.md` is at `~/.claude/skills/token-math/SKILL.md`, then `<token-math-root>` is `~/.claude/skills/token-math`.

6. **Hand off**: tell the user the next command is skill `token-math` (`node <token-math-root>/scripts/generate.mjs --spec style-spec.json --out tokens`).
   - Done when: the user sees the palette with names and OKLCH anchors, plus the hand-off command.

Judgement lives here; arithmetic does not. Ramp steps, contrast, and scales are generated downstream — a hand-guessed ramp here silently breaks the audit gate later.
