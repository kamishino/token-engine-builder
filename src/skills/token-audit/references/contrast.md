# Contrast — role floors and remediation

Read when interpreting an audit report or remediating a failure. Dual gate: WCAG 2.1 ratio via `colorjs.io/fn` `contrastWCAG21` AND real APCA via `contrastAPCA` (absolute |Lc|; APCA is polarity-signed, floors compare the absolute value). Both computed in OKLCH space (see `src/shared/colors.ts` in the builder repo). The metrics diverge in the dark theme in particular — a pair can pass WCAG and fail APCA (dark text on a mid-light action surface is the canonical case).

## Role floors (what the gate enforces at `--min-ratio 4.5 --min-apca 60`)

| Role           | Pairs audited                                     | WCAG floor | APCA floor |
| -------------- | ------------------------------------------------- | ---------- | ---------- |
| Body text      | `text.primary` on `bg.canvas`, on `bg.surface`    | 4.5:1      | Lc 60      |
| Secondary text | `text.secondary` on `bg.canvas`                   | 4.5:1      | Lc 60      |
| Action         | `action.primary-text` on `action.primary`         | 4.5:1      | Lc 60      |
| Components     | `button.text/bg`, `card.text/bg`, `input.text/bg` | 4.5:1      | Lc 60      |

Every theme present under `semantic/` must pass; a theme may not borrow margin from another. Display/large text (≥24px bold) and non-text UI (borders, focus rings) have lower floors in both systems but are **not** token pairs here — don't cite them to excuse a failing pair above.

## Reading a marginal pass

Light-cluster systems (anchor lightness ≥ 0.65) land action pairs near ≈4.5:1 by construction — light action surfaces sit two ramp steps below a light anchor. A 4.5–4.8 pass there is expected, not a defect; report it as marginal so the human knows the margin is thin.

## Remediation ladder (in order, max 3 loops)

1. **Move the semantic alias one step** further from its background (`neutral.700` → `neutral.800`; `brand.700` → `brand.800`). Smallest change, preserves the anchor.
2. **Shift the anchor** `l` by ≥ 0.05 in `style-spec.json` and re-run `token-math` — only when step moves can't fix it (whole ramp is misplaced).
3. **Escalate** with the failing pairs table after 3 loops. Lowering `--min-ratio` or `--min-apca` is the user's call, never a remediation.
