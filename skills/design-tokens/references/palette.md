# Palette Reference — Clusters, Mappings, Architecture, and Naming

Read during Phase 2 (Socratic Aesthetic Synthesis) when conducting the greenfield palette interview, adjusting anchors for vibe/brand intent, or naming primitive color keys.

## Style clusters — Kobayashi adjective → OKLCH bounds

Read when the user gives brand adjectives without a concrete color. Maps keywords to one of 16 psychological clusters (Kobayashi Color Image Scale), each an admissible OKLCH bounding box for the anchor pick. Ranges, never token values — the anchor inside the box is your creative pick, recorded in `tokens.config.json` (`cluster` field).

Center values in parentheses. Hue wraps past 360° where shown (`340…20`).

| Cluster            | Keywords / domain                                   | Hue           | Chroma           | Lightness | Neutral |
| ------------------ | --------------------------------------------------- | ------------- | ---------------- | --------- | ------- |
| `modern-tech`      | Dev tools, Cloud, SaaS · sleek, electric, cyan      | 240…270 (260) | 0.18…0.26 (0.22) | 0.45…0.65 | cool    |
| `zen-minimal`      | Wellness, Editorial · organic, earthy, moss, linen  | 60…110 (65)   | 0.05…0.12 (0.08) | 0.55…0.75 | warm    |
| `vibrant-bento`    | Consumer apps, Bento · magenta, violet              | 300…340 (320) | 0.22…0.30 (0.25) | 0.50…0.65 | neutral |
| `editorial-mono`   | Financial analytics, Publications · slate, charcoal | 220…260 (240) | 0.02…0.08 (0.03) | 0.35…0.55 | slate   |
| `pastel-pretty`    | Beauty, Confectionery, Kids · cute, peach, pink     | 340…20 (10)   | 0.10…0.18 (0.14) | 0.70…0.88 | warm    |
| `dreamy-romantic`  | Weddings, Florals, Luxury · lavender, lilac, rose   | 280…320 (300) | 0.06…0.14 (0.10) | 0.65…0.85 | cool    |
| `cheerful-casual`  | Food delivery, Social · cheerful, sunny, amber      | 30…60 (45)    | 0.16…0.24 (0.20) | 0.60…0.75 | warm    |
| `botanical-fresh`  | Sustainability, Biotech, Health · mint, crisp       | 140…180 (160) | 0.12…0.20 (0.16) | 0.65…0.80 | cool    |
| `luxury-elegant`   | High jewelry, Private banking · champagne, pearl    | 40…70 (55)    | 0.04…0.10 (0.07) | 0.70…0.88 | warm    |
| `heritage-classic` | Legal, Banking, Government · traditional, navy      | 210…240 (225) | 0.08…0.16 (0.12) | 0.30…0.48 | slate   |
| `opulent-gorgeous` | Fine dining, Spirits, Gaming · gold, crimson, rich  | 20…50 (35)    | 0.18…0.28 (0.23) | 0.50…0.70 | warm    |
| `fiery-dynamic`    | Sports, Fitness · scarlet, energetic                | 10…30 (20)    | 0.22…0.30 (0.26) | 0.45…0.60 | warm    |
| `glacier-clear`    | Clean energy, MedTech · crystalline, glacier        | 190…220 (205) | 0.12…0.20 (0.16) | 0.65…0.85 | cool    |
| `tranquil-calm`    | Meditation, Spas, Ergonomics · sage, serene         | 120…160 (140) | 0.04…0.10 (0.07) | 0.50…0.70 | cool    |
| `tailored-dandy`   | Menswear, Craft, Leather · tobacco, bronze          | 30…50 (40)    | 0.06…0.14 (0.10) | 0.30…0.50 | warm    |
| `spiced-ethnic`    | Global trade, Culinary · saffron, terracotta        | 30…70 (50)    | 0.14…0.22 (0.18) | 0.45…0.65 | warm    |

### Selection protocol

1. **Match**: map the 3–5 adjectives (+ product domain) to exactly one cluster. Weak match (no keyword hits) → say so, propose the nearest cluster, let the user veto — never silently default.
2. **Pick inside bounds**: choose the anchor `{l, c, h}` inside the cluster box. Favor the center unless the brand words pull toward an edge ("electric" → chroma ceiling; "understated" → chroma floor). The anchor lands exactly on ramp step 500 downstream.
3. **Neutral temperature** sets `neutralHue`: warm → anchor hue (or 65 if anchor is cool), cool → 220, slate → 240, neutral → anchor hue with `neutralChroma` at the low end (0.008). `neutralChroma` stays 0.008–0.015 regardless.
   Light clusters (lightness floor ≥ 0.65: pastel-pretty, dreamy-romantic, botanical-fresh, luxury-elegant, glacier-clear): pick the anchor **near the lightness floor** — light-theme action surfaces sit two steps below the anchor and starve for contrast above it. The audit gate verifies; a marginal pass (≈4.5:1) is expected for these clusters, not a defect.
4. **Swatch shifts** (optional refinement): vibrant = chroma +15–20% within bounds; subtle = chroma −25–35%.

Ported from the kamiflow `design-system-tokens` Kobayashi reference (16-cluster master table); bounds unchanged, preset aliases and 3-axis coordinates dropped.

## Vibe → spec adjustments

Read when user language is vague ("premium", "playful", "clean") or an anchor/spec pick needs adjusting. These rules _modify_ a cluster pick from the Style clusters section above; they never override an explicit user answer.

### Vibe → adjustments (relative to cluster center)

| Vibe                    | Adjustments (relative to cluster center)                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| Premium / luxury        | Chroma toward floor; `density: comfortable`; type ratio 1.333; radii soft (4/8/16), never pill-everything |
| Playful / fun           | Chroma toward ceiling; radii round (8/16/24); type ratio 1.25–1.333                                       |
| Minimal / clean         | Chroma floor; neutral chroma 0.008; radii sharp (2/4/8); type ratio 1.2                                   |
| Corporate / trustworthy | Hue into 210–260 unless cluster says otherwise; `density: comfortable`; radii soft                        |
| Data-dense / tool-like  | `density: compact`; type ratio 1.2; radii sharp                                                           |
| Organic / natural       | Neutral temperature warm; chroma mid-low; radii soft-to-round                                             |
| Dark-first              | Anchor lightness toward 0.45–0.55 (ramp must serve dark canvas first); verify both themes at audit        |

### Plain ↔ technical (for interview phrasing)

| Say to the user                | Means in tokens.config.json              |
| ------------------------------ | ---------------------------------------- |
| "Pill-shaped buttons"          | `radius.full` for interactive elements   |
| "Sharp, squared corners"       | radii 2/4/8                              |
| "Soft, rounded corners"        | radii 4/8/16                             |
| "Playful, extra-round corners" | radii 8/16/24                            |
| "Airy, lots of breathing room" | `density: comfortable`, spacing base 4px |
| "Tight, information-dense"     | `density: compact`                       |
| "Big dramatic headlines"       | type ratio 1.333                         |
| "Quiet, understated color"     | anchor chroma at cluster floor           |

### Guardrails (apply unless the user explicitly overrides)

- Anchor lightness 0.45–0.65 unless the cluster box is narrower — outside this band one theme's ramp starves.
- Never anchor on pure black or pure white; neutrals carry brand temperature (`neutralChroma` 0.008–0.015), never 0.
- One anchor hue family per system. A second hue is a new interview, not an adjustment.
- Chroma above the cluster ceiling reads neon on UI surfaces — treat the ceiling as hard.
- Every adjustment is stated aloud with its reason ("premium → chroma to floor"); silent drift from the cluster pick is how anchors become unexplainable.

## Palette architecture and harmonies

Read when the spec palette is being picked (`design-tokens` interview), set (`harmony`), or the user asks for secondary/accent/status colors. This file describes only what the pipeline implements.

### Foundation: the recorded palette

The spec's `palette` (3–5 entries: exactly one `primary`, plus `secondary`/`accent`/`other`) is the color system. The agent picks each anchor creatively — cluster bounds and the harmony table below are guidance, and deliberate departures are stated at read-back. `token-engine generate` is deterministic: every palette anchor expands to a ramp at the spec's `rampSteps` (5, 9, or 11; anchor exactly on step 500), keyed by the color's name slug (`color.<slug>.<step>`). Semantic theme files are generated from the role→slug mapping (action roles bind the primary slug; steps chosen by nearest available step). Two constants always exist beside the ramps: `color.white` (oklch 1 0 0) and `color.black` (oklch 0 0 0). The `neutral` ramp stays a functional key (temperature-tinted system gray), as do `white`/`black`/`feedback.*`.

### Harmony methods (creative guidance + extract fallback)

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

### Feedback anchors → ramps

Fixed accessible anchors, each expanded to a ramp at the chosen step count under `color.feedback.<role>.*`:

| Role      | Hue  | Chroma | Lightness |
| --------- | ---- | ------ | --------- |
| `success` | 150° | 0.18   | 0.58      |
| `warning` | 75°  | 0.20   | 0.72      |
| `danger`  | 25°  | 0.22   | 0.52      |
| `info`    | 230° | 0.19   | 0.59      |
| `help`    | 290° | 0.20   | 0.56      |

Semantic feedback roles are generated per theme by `theme-plan.ts` as `semantic.color.feedback.<role>.bg` and `semantic.color.feedback.<role>.text` pairs for all five roles (`success`, `warning`, `danger`, `info`, `help`), satisfying canonical contrast pairs during audit.

### Gamut (sRGB safety)

Every generated color is chroma-clamped into the sRGB gamut at generation (`clampToSrgb` in the engine): hue and lightness are preserved exactly, chroma is binary-searched down until the color renders in sRGB. An out-of-gamut anchor is clamped with a warning at generate time, and ramp step 500 is the _clamped_ anchor. This keeps the CSS `oklch()` output and the hex fallback in agreement on every display. Wide-gamut (P3) output is a deliberate non-goal of this system — it would be a separate output profile, not a relaxation of the clamp.

## Naming palette colors

Read when naming palette colors. Every palette color becomes a primitive group keyed by its name slug (`color.<slug>.<step>`), so the name is API surface — choose it like one.

### Rules

1. Map each anchor to the nearest name in the [meodai/color-names](https://github.com/meodai/color-names) list: match hue sector first, then lightness/chroma character (a pale blue is a "sky/powder" family name, a deep blue a "navy/midnight" one). A curated 144-color subset is vendored in `src/shared/color-names.ts` (12 names per sector across lightness/chroma tiers) and used by `token-engine extract` for deterministic slug assignment.
2. Slugify: lowercase, spaces → hyphens, strip everything except `a-z0-9-`. (`Cerulean Blue` → `cerulean-blue`.)
3. Slugs must be unique in the palette; on collision, add a character word (`sky` → `deep-sky`), never a number.
4. Names describe the color, not the role — roles (`primary`, `secondary`, `accent`, `other`) live in the spec's `role` field. A name that only makes sense for one brand ("acme-blue") is wrong; the same anchor in another brand gets the same name.
5. Functional keys are never renamed: `neutral`, `white`, `black`, `feedback.*` stay functional in every system.

### Hue sectors (OKLCH hue → name families)

| Hue     | Sector     | Example name families                  |
| ------- | ---------- | -------------------------------------- |
| 0–15    | red        | scarlet, crimson, brick                |
| 15–45   | orange     | tangerine, amber, rust                 |
| 45–70   | yellow     | saffron, ochre, butter                 |
| 70–100  | chartreuse | lime, pear, olive                      |
| 100–140 | green      | fern, emerald, moss                    |
| 140–170 | teal-green | lagoon (cool side), jade               |
| 170–200 | cyan       | lagoon, aqua, glacier                  |
| 200–230 | blue       | sky, azure, cerulean (deep)            |
| 230–260 | indigo     | cerulean (bright), indigo, navy (dark) |
| 260–290 | violet     | violet, lavender (pale)                |
| 290–320 | magenta    | orchid, fuchsia                        |
| 320–360 | pink       | rose, blush, coral (warm side)         |
