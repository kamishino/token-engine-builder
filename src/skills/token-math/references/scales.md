# Scales — atomic layout, vertical/horizontal rhythm, type, spacing

Read when configuring the style-spec or explaining generated values. Only implemented behavior is documented.

## Atomic layout (relationships, not raw steps)

Components bind **layout roles**, never raw spacing steps. Layout tokens are generated into every semantic theme file:

| Token                                       | Relationship                                                | Aliases               |
| ------------------------------------------- | ----------------------------------------------------------- | --------------------- |
| `layout.inset.*` (none/xs/sm/base/md/lg/xl) | inside a component (padding), subcomponent → organism scale | spacing 0/1/2/3/4/6/8 |
| `layout.gap.tight`                          | subcomponent ↔ subcomponent                                 | spacing 2             |
| `layout.gap.related`                        | subcomponent ↔ component                                    | spacing 3             |
| `layout.gap.default`                        | component ↔ component                                       | spacing 4             |
| `layout.gap.loose`                          | organism internal separation                                | spacing 6             |
| `layout.section`                            | template section separation                                 | rhythm 2              |
| `layout.page`                               | page-level separation                                       | spacing 16            |

## Vertical rhythm

- Baseline = `round(baseSize × baseLineHeight / 4) × 4`, where `baseLineHeight` is a style-spec choice (compact 1.25 / normal 1.5 / airy 1.75, default 1.5): 16px base → 20px (1.25), 24px (1.5), 28px (1.75).
- Every font-size step has a paired `line-height` (same key): line height snaps UP to the baseline subdivision grid (baseline/6, ≥2px; `ceil(size × 1.2 / snapUnit) × snapUnit` px), stored as a unitless multiplier — text stays on rhythm at any size and any base line-height.
- `rhythm` scale: `half` (baseline/2), `baseline`, and multiples 1–6 for vertical margins/section spacing.

## Horizontal rhythm (grid primitives)

- `breakpoint` sm 640 / md 768 / lg 1024 / xl 1280 (px).
- `container` sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536 (px).
- `grid.gutter` sm/md/lg alias spacing 4/6/8 — gutters breathe with density.

## Typography & spacing (unchanged rules)

- Modular scale: `size = base × ratioⁿ`, steps −2…+6 (`xs…5xl`). Ratio guide: 1.2 compact/corporate, 1.25 balanced default, 1.333 editorial/expressive, 1.618 hero-only.
- Spacing primitives: 4px base unit, multipliers 0,1,2,3,4,5,6,8,10,12,16,20,24; density comfortable ×1.0 / compact ×0.875.
- Radius: spec-driven (`sm/md/lg/full`); character presets in `token-style/references/design-mappings.md`.
- Fluid clamps: `fluidClamp` interpolates a size between 360px and 1280px viewports; available in the engine, not emitted by default.
