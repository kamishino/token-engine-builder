# ADR-0003 — Configurable baseline, complete roles, full audit matrix

Status: accepted (2026-10-19)

## Context

The vertical-rhythm baseline hardcoded a 1.5 line-height multiplier, so brands choosing a different base line-height silently broke the rhythm derivation. The semantic role set covered only 11 roles (no subtle, tertiary, disabled, focus, link, or feedback roles), and the audit gate checked 7 text pairs per theme — borders were never contrast-compared, so bg/fg/border relationships shipped unmeasured. A deps check also evaluated replacing the hand-rolled sRGB clamp with colorjs.io's `toGamut`.

## Decision

1. `typography.baseLineHeight` joins the style-spec (default 1.5, validated 1–2.5). `baselinePx(base, baseLineHeight)` = `round(base × baseLineHeight / 4) × 4`; paired line-heights snap up to the baseline/6 subdivision grid. Rhythm survives any chosen base line-height.
2. The semantic role set is completed in generated semantics and templates: `bg.subtle`, `text.tertiary`, `text.disabled`, `text.link`, `border.subtle`, `border.focus`, and per-role `feedback.{bg,text}` for success/warning/danger/info/help.
3. The audit matrix grows from 7 to 24 pairs per theme with kind floors: text 4.5 + Lc 60 (flag-driven), meaningful borders (strong, focus, component borders) fixed at WCAG 3.0 + Lc 30, and decorative hairlines (default, subtle) measured and printed but not gated — WCAG 1.4.11 binds meaningful boundaries, not decorative separators. `text.disabled` is recorded but exempt (disability exemption). Verification adjustments made under the step-not-floors contingency: dark `text.tertiary` moved 400 → 300 (Lc 49.3 → pass), and card borders re-bound to `border.strong` so the card boundary is a meaningful, gated one.
4. The binary-search sRGB clamp is kept: measured against `toGamut(method: 'css')` on probe colors, the library shifted hue up to 3.5° and lightness up to 0.009, while the search holds both exact. No dependency was adopted or added by the deps check (ZIP writer and hash helpers have no suitable installed equivalent).

## Consequences
3. The audit matrix grows from 7 to 24 pairs per theme with kind floors: text 4.5 + Lc 60 (flag-driven), meaningful borders (strong, focus, component borders) fixed at WCAG 3.0 + Lc 30, and decorative hairlines (default, subtle) measured and printed but not gated — WCAG 1.4.11 binds meaningful boundaries, not decorative separators. `text.disabled` is recorded but exempt (disability exemption). Verification adjustments made under the step-not-floors contingency: dark `text.tertiary` moved 400 → 300 (Lc 49.3 → pass), card borders re-bound to `border.strong` so the card boundary is a meaningful, gated one, and light action/link deepened 700 → 800 after the sRGB clamp dropped the compact example's marginal action pair from 4.53 to 4.29.
- Audit reports are longer and stricter: any new semantic role must ship with its pairs or the matrix silently misses it — the pair list and role set now move together.
- Decorative border values remain a design choice (hairlines stay subtle); their measured ratios are visible in every report, so a future decision to gate them is data-driven.
- Existing specs without `baseLineHeight` default to 1.5 and generate identical rhythm output to before.
