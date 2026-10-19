/**
 * Do not edit directly, this file was auto-generated.
 */

---
version: "1"
name: "Example Brand"
description: "Example Brand is a calm, trustworthy SaaS product."
colors:
  primary: "#2784d5"
  secondary: "#7973c9"
typography:
  fontSans: "Inter, system-ui, sans-serif"
  scale: "1.25"
rounded:
  sm: "0.25rem"
  md: "0.5rem"
  lg: "1rem"
spacing:
  base: "0.25rem"
  density: "comfortable"
components: ["button", "card", "input"]
---

# Example Brand Design Contract

## Overview

Example Brand is a calm, trustworthy SaaS product. Its interface pairs a cerulean-led palette with generous spacing so dense data stays readable.

## Colors

- `semantic.color.action.primary`: `oklch(36% 0.0729 250deg)`
- `semantic.color.action.primary-hover`: `oklch(28% 0.0471 250deg)`
- `semantic.color.action.primary-text`: `oklch(98% 0.0012 250deg)`
- `semantic.color.bg.canvas`: `oklch(98% 0.0012 250deg)`
- `semantic.color.bg.raised`: `oklch(98% 0.0098 250deg)`
- `semantic.color.bg.subtle`: `oklch(88% 0.0048 250deg)`
- `semantic.color.bg.surface`: `oklch(96% 0.0027 250deg)`
- `semantic.color.border.default`: `oklch(78% 0.0074 250deg)`
- `semantic.color.border.focus`: `oklch(44% 0.0986 250deg)`
- `semantic.color.border.strong`: `oklch(60% 0.012 250deg)`
- `semantic.color.border.subtle`: `oklch(88% 0.0048 250deg)`
- `semantic.color.feedback.danger.bg`: `oklch(88% 0.0503 25deg)`
- `semantic.color.feedback.danger.text`: `oklch(28% 0.1069 25deg)`
- `semantic.color.feedback.help.bg`: `oklch(92% 0.0412 290deg)`
- `semantic.color.feedback.help.text`: `oklch(32% 0.0971 290deg)`
- `semantic.color.feedback.info.bg`: `oklch(95% 0.0298 230deg)`
- `semantic.color.feedback.info.text`: `oklch(35% 0.0697 230deg)`
- `semantic.color.feedback.success.bg`: `oklch(94% 0.0411 150deg)`
- `semantic.color.feedback.success.text`: `oklch(34% 0.0874 150deg)`
- `semantic.color.feedback.warning.bg`: `oklch(98% 0.0159 75deg)`
- `semantic.color.feedback.warning.text`: `oklch(48% 0.0971 75deg)`
- `semantic.color.text.disabled`: `oklch(69% 0.0097 250deg)`
- `semantic.color.text.inverse`: `oklch(98% 0.0012 250deg)`
- `semantic.color.text.link`: `oklch(36% 0.0729 250deg)`
- `semantic.color.text.primary`: `oklch(28% 0.0038 250deg)`
- `semantic.color.text.secondary`: `oklch(44% 0.0079 250deg)`
- `semantic.color.text.tertiary`: `oklch(52% 0.0099 250deg)`

## Typography

Font stack: `Inter, system-ui, sans-serif`

| Step | Size | Line height |
|---|---|---|
| 2xl | 1.9531rem | 1.28 |
| 3xl | 2.4414rem | 1.229 |
| 4xl | 3.0518rem | 1.229 |
| 5xl | 3.8147rem | 1.245 |
| base | 1rem | 1.25 |
| lg | 1.25rem | 1.2 |
| sm | 0.8rem | 1.25 |
| xl | 1.5625rem | 1.28 |
| xs | 0.64rem | 1.563 |

## Layout

- `layout.gap.default`: `1rem`
- `layout.gap.loose`: `1.5rem`
- `layout.gap.related`: `0.75rem`
- `layout.gap.tight`: `0.5rem`
- `layout.inset.base`: `0.75rem`
- `layout.inset.lg`: `1.5rem`
- `layout.inset.md`: `1rem`
- `layout.inset.none`: `0`
- `layout.inset.sm`: `0.5rem`
- `layout.inset.xl`: `2rem`
- `layout.inset.xs`: `0.25rem`
- `layout.page`: `4rem`
- `layout.section`: `3rem`
- `breakpoint.lg`: `64rem`
- `breakpoint.md`: `48rem`
- `breakpoint.sm`: `40rem`
- `breakpoint.xl`: `80rem`
- `container.2xl`: `96rem`
- `container.lg`: `64rem`
- `container.md`: `48rem`
- `container.sm`: `40rem`
- `container.xl`: `80rem`
- `grid.gutter.lg`: `2rem`
- `grid.gutter.md`: `1.5rem`
- `grid.gutter.sm`: `1rem`

## Elevation & Depth

- `shadow.lg`: `0 12px 32px -8px oklch(20% 0 0deg / 16%)`
- `shadow.md`: `0 4px 12px -2px oklch(20% 0 0deg / 12%)`
- `shadow.sm`: `0 1px 2px 0 oklch(20% 0 0deg / 8%)`
- `shadow.xl`: `0 24px 48px -12px oklch(20% 0 0deg / 20%)`

## Shapes

- `radius.full`: `624.9375rem`
- `radius.lg`: `1rem`
- `radius.md`: `0.5rem`
- `radius.none`: `0`
- `radius.sm`: `0.25rem`

## Components

- button
- card
- input

See `components.md` for per-component state tables (state → token → resolved value).

## Do's and Don'ts

- Do: Bind semantic and layout roles in components
- Do: Keep action color for primary calls to action only
- Don't: Do not introduce raw hex values above the primitive tier
- Don't: Do not use the accent color for body text
