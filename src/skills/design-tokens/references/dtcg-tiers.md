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
      "blue": {
        "600": { "$value": "oklch(0.55 0.18 250)", "$type": "color" }
      }
    }
  }
  ```

### Tier 2: Semantic Tokens (`tokens/semantic/`)
- **Rule**: Maps functional intent to primitive tokens via `{alias}` references. Defined per theme (`light.json`, `dark.json`, `high-contrast.json`) with identical path schemas.
- **Prohibition**: Zero raw color literals allowed.
- **Example**:
  ```json
  {
    "color": {
      "action": {
        "primary": { "$value": "{color.blue.600}", "$type": "color" }
      }
    }
  }
  ```

### Tier 3: Component Tokens (`tokens/component/`)
- **Rule**: Maps individual component slots to semantic tokens via `{alias}` references.
- **Prohibition**: Zero direct references to primitive tokens allowed.
- **Example**:
  ```json
  {
    "button": {
      "primary": {
        "background": { "$value": "{color.action.primary}", "$type": "color" }
      }
    }
  }
  ```

---

## 2. Canonical `tokens.config.json` Contract

The minimal, portable style contract used to generate 3-tier token structures (also accepts `style-spec.json` for backwards compatibility):

```json
{
  "name": "Design System",
  "palette": [
    { "role": "primary", "anchor": "oklch(60% 0.15 250deg)" },
    { "role": "secondary", "anchor": "oklch(65% 0.12 180deg)" },
    { "role": "accent", "anchor": "oklch(75% 0.16 70deg)" }
  ],
  "neutral": { "hue": 250 },
  "typography": {
    "baseSize": 16,
    "ratio": 1.25,
    "fontFamily": "Inter, sans-serif"
  }
}
```
