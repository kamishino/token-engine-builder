# Contrast — role floors and remediation

Read when interpreting an audit report or remediating a failure. Ratios are WCAG 2.1, computed in OKLCH space via `colorjs.io/fn` `contrastWCAG21` (see `src/shared/colors.ts` in the builder repo). APCA is **not** computed — if a consumer contract ever demands it, that's a new dual gate, not a reinterpretation of these numbers.

## Role floors (what the gate enforces at `--min-ratio 4.5`)

| Role           | Pairs audited                                     | Floor |
| -------------- | ------------------------------------------------- | ----- |
| Body text      | `text.primary` on `bg.canvas`, on `bg.surface`    | 4.5:1 |
| Secondary text | `text.secondary` on `bg.canvas`                   | 4.5:1 |
| Action         | `action.primary-text` on `action.primary`         | 4.5:1 |
| Components     | `button.text/bg`, `card.text/bg`, `input.text/bg` | 4.5:1 |

Both themes (`light`, `dark`) must pass; a theme may not borrow margin from the other. Display/large text (≥24px bold) and non-text UI (borders, focus rings) have lower WCAG floors (3.0:1) but are **not** token pairs in this system — don't cite them to excuse a failing pair above.

## Reading a marginal pass

Light-cluster systems (anchor lightness ≥ 0.65) land action pairs near ≈4.5:1 by construction — light action surfaces sit two ramp steps below a light anchor. A 4.5–4.8 pass there is expected, not a defect; report it as marginal so the human knows the margin is thin.

## Remediation ladder (in order, max 3 loops)

1. **Move the semantic alias one step** further from its background (`neutral.700` → `neutral.800`; `brand.700` → `brand.800`). Smallest change, preserves the anchor.
2. **Shift the anchor** `l` by ≥ 0.05 in `style-spec.json` and re-run `token-math` — only when step moves can't fix it (whole ramp is misplaced).
3. **Escalate** with the failing pairs table after 3 loops. Lowering `--min-ratio` is the user's call, never a remediation.
