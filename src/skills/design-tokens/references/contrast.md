# Contrast — role floors and remediation

Read during Phase 3 (Architect Tokens) when interpreting contrast audit failures or remediating step/anchor overrides. Dual gate: WCAG 2.1 ratio via `colorjs.io/fn` `contrastWCAG21` AND real APCA via `contrastAPCA` (absolute |Lc|; APCA is polarity-signed, floors compare the absolute value). Both computed in OKLCH space (see `src/shared/colors.ts` in the builder repo). The metrics diverge in the dark theme in particular — a pair can pass WCAG and fail APCA (dark text on a mid-light action surface is the canonical case).

## Role floors (42 pairs per theme)

Text pairs gate at `--min-ratio` (default 4.5) AND `--min-apca` (default Lc 60). Meaningful borders gate at fixed non-text floors WCAG 3.0 / Lc 30 (printed with a `(border)` suffix). Decorative hairlines are measured and printed with a `(border, decorative)` suffix but never gated — WCAG 1.4.11 contrast requirements cover boundaries needed to identify components, not decorative separators.

| Role                              | Pairs audited                                                                    | Floors              |
| --------------------------------- | -------------------------------------------------------------------------------- | ------------------- |
| Body/secondary/tertiary/link text | text roles on `bg.canvas`/`surface`/`raised`                                     | 4.5:1 + Lc 60       |
| Action                            | `action.primary-text` on `action.primary` and `action.primary-hover`             | 4.5:1 + Lc 60       |
| Feedback                          | `feedback.<role>.text` on `feedback.<role>.bg` (×5)                              | 4.5:1 + Lc 60       |
| Components (text)                 | `button/card/input.text` on their bg                                             | 4.5:1 + Lc 60       |
| Meaningful borders                | `border.strong`, `border.focus`, `card.border`, `input.border` on their surfaces | 3.0:1 + Lc 30       |
| Decorative borders                | `border.default`, `border.subtle` on canvas/surface                              | measured, not gated |

`text.disabled` is recorded in the semantic set but exempt from pairing (WCAG disability exemption). Component disabled states (`button/input.disabled-bg`, `disabled-text`) are likewise tokenized and documented in the generated component specs, exempt from gating; hover, focus, and error state pairs ARE gated (text pairs at text floors, focus/error borders at border floors).

## Reading a marginal pass

Light-cluster systems (anchor lightness ≥ 0.65) land action pairs near ≈4.5:1 by construction — light action surfaces sit two ramp steps below a light anchor. A 4.5–4.8 pass there is expected, not a defect; report it as marginal so the human knows the margin is thin.

## Remediation ladder

1. **Record the step move in the spec** (`overrides.<theme>.<path>` → one step further from its background, e.g. `neutral.700` → `neutral.800`), then re-run `token-engine generate` (or `token-engine sync`). The audit report's `remedy:` suggestion automatically searches the failing role's own ramp (foreground first, background when no foreground step clears the floor); the recorded override is still the decision. Overrides are applied by generate into the semantic files and survive regeneration; editing a generated semantic file directly does not (and trips the provenance manifest).
2. **Shift the anchor** `l` by ≥ 0.05 in `tokens.config.json` and re-run `token-engine generate` — only when step moves can't fix it (whole ramp is misplaced).
3. **Escalate** with the failing pairs table after 3 loops. Lowering `--min-ratio` or `--min-apca` is the user's call, never a remediation.

## Quick ΔL check

When verifying contrast ratios mentally or spot-checking hand edits before running an audit, use these delta lightness ($\Delta L = |L_{\text{foreground}} - L_{\text{background}}|$) thresholds:

- **Text on Background**: Maintain $\Delta L \ge 0.45$.
  - Guarantees WCAG 2.1 AA $\ge 4.5:1$ (normal text).
  - Guarantees APCA $|Lc| \ge 60$ (readability floor).
- **Borders & Non-Text UI**: Maintain $\Delta L \ge 0.30$.
  - Guarantees WCAG 2.1 AA $\ge 3.0:1$ (graphical objects and user interface components).

The command `token-engine audit` remains the authoritative gatekeeper.
