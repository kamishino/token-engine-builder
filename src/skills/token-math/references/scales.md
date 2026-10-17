# Scales — type, line-height, spacing, radius

Read when configuring typography/spacing in the style-spec or explaining generated values. Only implemented behavior is documented.

## Typography

- **Modular scale**: `size = base × ratioⁿ`, steps −2…+6 (`xs…5xl`). Ratio guide: 1.2 compact/corporate, 1.25 balanced default, 1.333 editorial/expressive, 1.618 hero-only.
- **Line heights**: unitless multipliers — `tight` 1.1, `snug` 1.25, `normal` 1.5, `relaxed` 1.75 (emitted as `--leading-*` in Tailwind output).
- **Fluid clamps**: `fluidClamp` interpolates a size between 360px and 1280px viewports; available in the engine, not emitted by default.

## Spacing

- **4px base unit** (finer than an 8pt grid; 8pt values are the even steps). Multipliers: 0,1,2,3,4,5,6,8,10,12,16,20,24.
- **Density**: `comfortable` ×1.0, `compact` ×0.875 across the whole scale.

## Radius

Spec-driven (`sm/md/lg/full`); `full` = 9999px pill convention. Character presets live in `token-style/references/design-mappings.md` (sharp 2/4/8, soft 4/8/16, round 8/16/24).
