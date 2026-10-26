# DTCG 3-Tier Schema & Decoupling Reference

Architectural specifications for W3C Design Tokens Community Group (DTCG) formats and tier boundaries.

---

## 1. The 3-Tier Hierarchy

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
---

## 2. Canonical `tokens.config.json` Contract

The minimal, portable style contract used to generate 3-tier token structures (also accepts `style-spec.json` for backwards compatibility):

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
