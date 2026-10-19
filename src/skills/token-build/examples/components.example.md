/**
 * Do not edit directly, this file was auto-generated.
 */

# Component specifications

Theme: light

## button

| Token | Value |
|---|---|
| bg | oklch(36% 0.0729 250deg) |
| bg-hover | oklch(28% 0.0471 250deg) |
| text | oklch(98% 0.0012 250deg) |
| focus-ring | oklch(44% 0.0986 250deg) |
| disabled-bg | oklch(88% 0.0048 250deg) |
| disabled-text | oklch(69% 0.0097 250deg) |
| radius | 0.5rem |
| padding-x | 1rem |
| padding-y | 0.5rem |
| font-size | 1rem |

## card

| Token | Value |
|---|---|
| bg | oklch(96% 0.0027 250deg) |
| bg-hover | oklch(98% 0.0098 250deg) |
| text | oklch(28% 0.0038 250deg) |
| border | oklch(60% 0.012 250deg) |
| radius | 1rem |
| padding | 1.5rem |

## input

| Token | Value |
|---|---|
| bg | oklch(98% 0.0012 250deg) |
| text | oklch(28% 0.0038 250deg) |
| border | oklch(60% 0.012 250deg) |
| focus-border | oklch(44% 0.0986 250deg) |
| error-border | oklch(28% 0.1069 25deg) |
| disabled-bg | oklch(88% 0.0048 250deg) |
| disabled-text | oklch(69% 0.0097 250deg) |
| radius | 0.25rem |
| padding-x | 0.75rem |
| padding-y | 0.5rem |
| font-size | 1rem |

## States

Button carries enabled, hover, focus, and disabled states; input carries enabled, focus, error, and disabled; card carries enabled and hover. Hover, focus, and error state pairs are contrast-gated by token-audit; disabled states are tokenized here but WCAG-exempt from the audit gate.
