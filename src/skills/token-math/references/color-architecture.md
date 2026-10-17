# Color architecture — harmonies and feedback roles

Read when the style-spec sets `harmony`, or the user asks for secondary/accent/status colors. This file describes only what `generate.mjs` implements.

## Three pillars

1. **Brand**: the interview anchor → 11-step ramp (anchor exactly on step 500).
2. **Harmony** (opt-in): derived anchors rotated from the brand hue. First derived color becomes `color.secondary`, second `color.accent`, each expanded to its own ramp. No `harmony` in the spec → no derived ramps.
3. **Feedback**: fixed accessible anchors under `color.feedback.*` (single tokens, not ramps). They are primitives only — semantic/component feedback roles need per-theme foreground pairs and are not generated yet.

## Harmony methods

| Method | Hue offsets | Chroma factor | Character |
|---|---|---|---|
| `triadic` | +120°, +240° | 0.85 | Vibrant, balanced |
| `analogous` | +35°, −35° | 0.85 | Serene, cohesive |
| `complementary` | +180° | 1.00 | Punchy focal contrast (secondary only) |
| `split-complementary` | +150°, +210° | 0.90 | Expressive, less tension |
| `tetradic` | +90°, +180° | 0.80 | Rich multi-domain |
| `monochromatic` | 0° | 0.60 | Restraint, luxury (secondary only) |

Derived lightness preserves the anchor inside 0.42–0.68; derived chroma is capped at 0.30. Hue wraps modulo 360°.

## Feedback anchors

| Role | Hue | Chroma | Lightness |
|---|---|---|---|
| `success` | 150° | 0.18 | 0.58 |
| `warning` | 75° | 0.20 | 0.72 |
| `danger` | 25° | 0.22 | 0.52 |
| `info` | 230° | 0.19 | 0.59 |
| `help` | 290° | 0.20 | 0.56 |

Ported from the kamiflow color-architecture reference; harmony chroma multipliers and the hue-blind flat gamut cap were corrected to a single rule (factor × anchor chroma, capped at 0.30).
