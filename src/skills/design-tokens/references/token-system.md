# Token System — DTCG Schema, Contract, Scales, and Ramp Math

Read during Phase 3 (Architect Tokens) when formulating `tokens.config.json`, verifying DTCG tier decoupling, binding layout roles, or explaining generated ramp values.

## 3-tier DTCG schema

The design system decouples styling into three strictly separated tiers:

```text
┌─────────────────┐      ┌──────────────────┐      ┌───────────────────┐
│ Tier 1:         │      │ Tier 2:          │      │ Tier 3:           │
│ Primitive       │ ───> │ Semantic         │ ───> │ Component         │
│ (Raw Math)      │      │ (Intent Aliases) │      │ (Scoped Aliases)  │
└─────────────────┘      └──────────────────┘      └───────────────────┘
```

### Tier 1: Primitive Tokens (`tokens/primitive/`)
- **Rule**: Contains raw literal values only (`oklch()`, `px`, font family strings).
- **Prohibition**: Zero `{alias}` references allowed.
- **Example**:
  ```json
  {
    "color": {
      "primary": {
        "600": {
          "$value": { "colorSpace": "oklch", "components": [0.55, 0.18, 250] },
          "$type": "color"
        }
      }
    }
  }
  ```
  *(Note: CSS string values like `"oklch(55% 0.18 250deg)"` are loader-compatible; DTCG objects are generator canon).*

### Tier 2: Semantic Tokens (`tokens/semantic/`)
- **Rule**: Maps functional intent to primitive tokens via `{alias}` references. Defined per theme (`light.tokens.json`, `dark.tokens.json`, `high-contrast.tokens.json`) with identical path schemas.
- **Prohibition**: Zero raw color literals allowed.
- **Example**:
  ```json
  {
    "semantic": {
      "color": {
        "action": {
          "primary": { "$value": "{color.primary.800}", "$type": "color" }
        }
      }
    }
  }
  ```

### Tier 3: Component Tokens (`tokens/component/`)
- **Rule**: Maps individual component slots to semantic tokens via `{alias}` references.
- **Prohibition**: Zero direct references to primitive colors allowed (spacing and radius may alias primitives by convention).
- **Example**:
  ```json
  {
    "component": {
      "button": {
        "bg": { "$value": "{semantic.color.action.primary}", "$type": "color" }
      }
    }
  }
  ```

## tokens.config.json contract

The minimal, portable style contract used to generate 3-tier token structures (for a complete worked example, see `assets/tokens.config.example.json`):

```json
{
  "name": "brand-tokens",
  "palette": [
    { "role": "primary", "name": "cerulean", "anchor": { "l": 0.6, "c": 0.15, "h": 250 } },
    { "role": "secondary", "name": "amethyst", "anchor": { "l": 0.6, "c": 0.12, "h": 285 } },
    { "role": "accent", "name": "sky", "anchor": { "l": 0.6, "c": 0.1, "h": 215 } }
  ],
  "typography": {
    "baseSizePx": 16,
    "ratio": 1.25,
    "fontFamily": "Inter, system-ui, sans-serif"
  }
}
```

*(Optional contract fields: `neutralHue`, `neutralChroma`, `density`, `rampSteps`, `harmony`, `themes`, `overrides` — see `src/shared/spec.ts` for full schema definition).*

## Scales, rhythm, and layout roles

Read when configuring `tokens.config.json` or explaining generated values. Only implemented behavior is documented.

### Atomic layout (relationships, not raw steps)

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

### Vertical rhythm

- Baseline = `round(baseSize × baseLineHeight / 4) × 4`, where `baseLineHeight` is a `tokens.config.json` choice (compact 1.25 / normal 1.5 / airy 1.75, default 1.5): 16px base → 20px (1.25), 24px (1.5), 28px (1.75).
- Every font-size step has a paired `line-height` (same key): line height snaps UP to the baseline subdivision grid (baseline/6, ≥2px; `ceil(size × 1.2 / snapUnit) × snapUnit` px), stored as a unitless multiplier — text stays on rhythm at any size and any base line-height.
- `rhythm` scale: `half` (baseline/2), `baseline`, and multiples 1–6 for vertical margins/section spacing.

### Horizontal rhythm (grid primitives)

- `breakpoint` sm 640 / md 768 / lg 1024 / xl 1280 (px).
- `container` sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536 (px).
- `grid.gutter` sm/md/lg alias spacing 4/6/8 — gutters breathe with density.

### Typography & spacing (unchanged rules)

- Modular scale: `size = base × ratioⁿ`, steps −2…+6 (`xs…5xl`). Ratio guide: 1.2 compact/corporate, 1.25 balanced default, 1.333 editorial/expressive, 1.618 hero-only.
- Spacing primitives: 4px base unit, multipliers 0,1,2,3,4,5,6,8,10,12,16,20,24; density comfortable ×1.0 / compact ×0.875.
- Radius: spec-driven (`sm/md/lg/full`); (character presets: see [`palette.md`](palette.md)).
- Fluid clamps: `fluidClamp` interpolates a size between 360px and 1280px viewports; available in the engine, not emitted by default.

## Ramp math the engine applies

The engine computes ramps deterministically (`token-engine generate` / `token-engine sync`). Use these mathematical specifications and coordinate tables to explain generated values, choose override steps, or hand-edit aliases.

### The 11-step OKLCH lightness ramp

Every color scale spans 11 perceptually uniform steps (50 to 950). Values follow these exact lightness targets and chroma multipliers:

| Step | Lightness ($L$) | Chroma ($C$) Multiplier | Functional Role |
| :--- | :--- | :--- | :--- |
| **50** | `0.98` | $\le 0.03$ (subtle tint) | Canvas background (Light mode) |
| **100** | `0.93` | $0.05$ | Surface background / Subtle borders |
| **200** | `0.86` | $0.08$ | Raised cards / Muted badges |
| **300** | `0.76` | $0.12$ | Decorative borders |
| **400** | `0.65` | $0.15$ | Secondary accents |
| **500** | `0.55` | $\text{Peak } C$ ($0.15 - 0.20$) | Primary brand anchor |
| **600** | `0.45` | $0.90 \times \text{Peak } C$ | Primary hover / Focus rings |
| **700** | `0.35` | $0.75 \times \text{Peak } C$ | High-contrast actions |
| **800** | `0.25` | $0.50 \times \text{Peak } C$ | Raised surfaces (Dark mode) |
| **900** | `0.15` | $0.30 \times \text{Peak } C$ | Surface background (Dark mode) |
| **950** | `0.08` | $\le 0.03$ (deep obsidian) | Canvas background (Dark mode) |

#### Chroma scaling & gamut clamping
- **Peak Chroma Zone**: Concentrate maximum chroma at steps 500 and 600 where the sRGB gamut volume is widest for midtones.
- **Tapering Curve**: Smoothly taper chroma toward zero at step 50 ($L=0.98$) and step 950 ($L=0.08$) to avoid sRGB gamut clipping and prevent unnatural neon pastel artifacts.

### Dark mode polarity inversion

Construct dark mode semantics by inverting lightness coordinates symmetrically across neutral roles while preserving brand anchor chroma:

```text
Light Mode Step          Dark Mode Step
─────────────────        ──────────────
50 (Canvas)        <──>  950 (Canvas)
100 (Surface)      <──>  900 (Surface)
200 (Raised)       <──>  800 (Raised)
900 (Primary Text) <──>  100 (Primary Text)
700 (Muted Text)   <──>  200 (Muted Text)
```

- **Brand Anchor Preservation**: Maintain hue and peak chroma on action buttons across both themes.
- **Surface Elevation**: Elevate dark mode surfaces by increasing lightness ($L=0.08$ for canvas, $L=0.15$ for surface, $L=0.25$ for raised modals).
