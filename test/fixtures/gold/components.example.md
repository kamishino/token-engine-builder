/**
 * Do not edit directly, this file was auto-generated.
 */

# Component specifications

Theme: light

## alert

| Token | Value |
|---|---|
| bg | oklch(88% 0.0048 250deg) |
| text | oklch(28% 0.0038 250deg) |
| border | oklch(78% 0.0074 250deg) |
| icon | oklch(36% 0.0729 250deg) |
| radius | 0.5rem |
| padding | 1rem |

## avatar

| Token | Value |
|---|---|
| bg | oklch(88% 0.0048 250deg) |
| text | oklch(28% 0.0038 250deg) |
| border | oklch(78% 0.0074 250deg) |
| radius | 624.9375rem |
| size | 2rem |
| font-size | 0.8rem |

## badge

| Token | Value |
|---|---|
| bg | oklch(98% 0.0098 250deg) |
| text | oklch(28% 0.0038 250deg) |
| border | oklch(78% 0.0074 250deg) |
| radius | 624.9375rem |
| padding-x | 0.5rem |
| padding-y | 0.25rem |
| font-size | 0.64rem |

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

## dialog

| Token | Value |
|---|---|
| bg | oklch(98% 0.0098 250deg) |
| text | oklch(28% 0.0038 250deg) |
| overlay-bg | oklch(98% 0.0012 250deg) |
| border | oklch(60% 0.012 250deg) |
| radius | 1rem |
| padding | 2rem |

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

## table

| Token | Value |
|---|---|
| header-bg | oklch(96% 0.0027 250deg) |
| header-text | oklch(44% 0.0079 250deg) |
| row-bg | oklch(98% 0.0012 250deg) |
| row-hover-bg | oklch(88% 0.0048 250deg) |
| row-text | oklch(28% 0.0038 250deg) |
| border | oklch(78% 0.0074 250deg) |
| padding-x | 1rem |
| padding-y | 0.5rem |
| font-size | 0.8rem |

## tooltip

| Token | Value |
|---|---|
| bg | oklch(28% 0.0038 250deg) |
| text | oklch(98% 0.0012 250deg) |
| radius | 0.25rem |
| padding-x | 0.5rem |
| padding-y | 0.25rem |
| font-size | 0.64rem |

## States

Button carries enabled, hover, focus, and disabled states; input carries enabled, focus, error, and disabled; card carries enabled and hover; table carries row-hover; badge, alert, dialog, avatar, and tooltip define surface, border, and typography tokens across light and dark themes. All foreground, background, and meaningful boundary pairs are contrast-gated by token-engine audit; disabled states are tokenized here but WCAG-exempt from the audit gate.

## Composite patterns

Standard multi-component compositions binding components, layout, and semantic tokens:

### Form Field

Composition: Label (`typography.fontFamily`, `fontSize: 0.875rem`, `color: text.primary`) + Input (`component.input.*`) + Hint/Error text (`fontSize: 0.75rem`, `color: text.secondary` or `feedback.danger.text`). Layout: Vertical stack, `gap: layout.gap.xs` (0.25rem) between label and input, `gap: layout.gap.xs` before helper/error text.

### Card Section

Composition: Card Surface (`component.card.bg`, `radius.lg`, `border: border.default`) + Header (Title `fontSize: 1.25rem` + Subtitle `text.secondary`) + Body (`layout.gap.default`) + Footer actions (`component.button.*` primary/secondary). Layout: Inset padding `layout.inset.lg` (1.5rem), vertical stack `layout.gap.md` (1rem), action row `justify: flex-end`, `gap: layout.gap.sm` (0.5rem).

### Modal Shell

Composition: Backdrop Overlay (`bg.canvas` at 60% opacity) + Dialog Panel (`bg.raised`, `radius.lg`, `shadow.xl`) + Header (Title `fontSize: 1.5rem` + Close icon button) + Content area + Action footer (`button.bg` primary + secondary). Layout: Centered container `container.sm` (40rem max-width), panel padding `layout.inset.xl` (2rem), content gap `layout.gap.md` (1rem), sticky footer `layout.gap.sm` (0.5rem).
