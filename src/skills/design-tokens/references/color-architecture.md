# Color architecture — palette, harmonies, feedback

Read when the spec palette is being picked (`design-tokens` interview), set (`harmony`), or the user asks for secondary/accent/status colors. This file describes only what the pipeline implements.

## Foundation: the recorded palette

The spec's `palette` (3–5 entries: exactly one `primary`, plus `secondary`/`accent`/`other`) is the color system. The agent picks each anchor creatively — cluster bounds and the harmony table below are guidance, and deliberate departures are stated at read-back. `token-engine generate` is deterministic: every palette anchor expands to a ramp at the spec's `rampSteps` (5, 9, or 11; anchor exactly on step 500), keyed by the color's name slug (`color.<slug>.<step>`). Semantic theme files are generated from the role→slug mapping (action roles bind the primary slug; steps chosen by nearest available step). Two constants always exist beside the ramps: `color.white` (oklch 1 0 0) and `color.black` (oklch 0 0 0). The `neutral` ramp stays a functional key (temperature-tinted system gray), as do `white`/`black`/`feedback.*`.

## Harmony methods (creative guidance + extract fallback)

Guidance for proposing secondary/accent anchors; also the exact math `token-engine extract` uses to synthesize a full palette from one extracted candidate, and the engine fallback (`buildHarmony`) if derivation is ever requested.

| Method                | Hue offsets  | Chroma factor | Character                              |
| --------------------- | ------------ | ------------- | -------------------------------------- |
| `triadic`             | +120°, +240° | 0.85          | Vibrant, balanced                      |
| `analogous`           | +35°, −35°   | 0.85          | Serene, cohesive                       |
| `complementary`       | +180°        | 1.00          | Punchy focal contrast (secondary only) |
| `split-complementary` | +150°, +210° | 0.90          | Expressive, less tension               |
| `tetradic`            | +90°, +180°  | 0.80          | Rich multi-domain                      |
| `monochromatic`       | 0°           | 0.60          | Restraint, luxury (secondary only)     |

Derived lightness preserves the anchor inside 0.42–0.68; derived chroma is capped at 0.30. Hue wraps modulo 360°. Recording a method in the spec's `harmony` field is provenance only — generate does not derive from it.

## Feedback anchors → ramps

Fixed accessible anchors, each now expanded to a ramp at the chosen step count under `color.feedback.<role>.*`:

| Role      | Hue  | Chroma | Lightness |
| --------- | ---- | ------ | --------- |
| `success` | 150° | 0.18   | 0.58      |
| `warning` | 75°  | 0.20   | 0.72      |
| `danger`  | 25°  | 0.22   | 0.52      |
| `info`    | 230° | 0.19   | 0.59      |
| `help`    | 290° | 0.20   | 0.56      |

Feedback remains primitive-only — semantic/component feedback roles need per-theme foreground pairs and are not generated yet.

## Gamut (sRGB safety)

Every generated color is chroma-clamped into the sRGB gamut at generation (`clampToSrgb` in the engine): hue and lightness are preserved exactly, chroma is binary-searched down until the color renders in sRGB. An out-of-gamut anchor is clamped with a warning at generate time, and ramp step 500 is the _clamped_ anchor. This keeps the CSS `oklch()` output and the hex fallback in agreement on every display. Wide-gamut (P3) output is a deliberate non-goal of this system — it would be a separate output profile, not a relaxation of the clamp.
