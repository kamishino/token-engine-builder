# ADR-0002 — Palette-first style-spec (spec v2)

Status: accepted (2026-10-19)

## Context

Spec v1 derived the color system mathematically from one `brandAnchor`: `generate` rotated fixed harmony offsets for secondary/accent, returned fixed feedback anchors, always emitted 11-step ramps under role keys (`brand`, `secondary`, `accent`). That made the agent's creative judgement invisible — the same anchor always produced the same palette, harmony/feedback choices could not depart from the math, ramp density was not a user decision, and primitive keys carried roles instead of color identity.

## Decision

Spec v2 records an explicit creative palette: `palette` holds 3–5 entries `{role, name, anchor}` (exactly one `primary`; `name` is a unique color-name slug mapped from the meodai/color-names list), plus `rampSteps` (5, 9, or 11; absent = 11). `token-style` picks anchors and names creatively (harmony/feedback tables and Kobayashi bounds as guidance, departures stated at read-back); `token-math` deterministically expands every anchor to a ramp at the chosen step count, always emits `color.white`/`color.black`, expands feedback anchors to ramps, and generates the semantic theme files from the role→slug mapping with nearest-step selection. `harmony` survives as provenance only. Neutral/white/black/feedback keep functional keys.

## Consequences

- Clean cutover: v1 specs (`brandAnchor`, no `palette`) fail validation; the two example specs are migrated and fixtures (gold CSS, audit report) regenerated. No compatibility alias is kept.
- Primitive keys are brand-specific (e.g. `color.cerulean.500`); semantic aliases are generated, so alias targets always exist in the chosen step set — at 5 steps, nearest-step selection (ties darker) is the mechanism that keeps semantics valid.
- `token-extract` synthesizes secondary/accent via the analogous fallback so its candidate still satisfies the 3-color minimum; read-back may rename/re-pick.
- Verification adjustment (per plan contingency): dark-theme action targets moved from step 200/100 to 100/50 — mid-lightness anchors failed APCA on dark action at 200; ramp sets were not changed.
- Color naming is an agent-side act guided by `token-style/references/color-naming.md`; no dataset is bundled. Vendoring a hue-sector subset remains a follow-up if offline naming proves unreliable.
