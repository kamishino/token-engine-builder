# Style clusters — Kobayashi adjective → OKLCH bounds

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

## Selection protocol

1. **Match**: map the 3–5 adjectives (+ product domain) to exactly one cluster. Weak match (no keyword hits) → say so, propose the nearest cluster, let the user veto — never silently default.
2. **Pick inside bounds**: choose the anchor `{l, c, h}` inside the cluster box. Favor the center unless the brand words pull toward an edge ("electric" → chroma ceiling; "understated" → chroma floor). The anchor lands exactly on ramp step 500 downstream.
3. **Neutral temperature** sets `neutralHue`: warm → anchor hue (or 65 if anchor is cool), cool → 220, slate → 240, neutral → anchor hue with `neutralChroma` at the low end (0.008). `neutralChroma` stays 0.008–0.015 regardless.
   Light clusters (lightness floor ≥ 0.65: pastel-pretty, dreamy-romantic, botanical-fresh, luxury-elegant, glacier-clear): pick the anchor **near the lightness floor** — light-theme action surfaces sit two steps below the anchor and starve for contrast above it. The audit gate verifies; a marginal pass (≈4.5:1) is expected for these clusters, not a defect.
4. **Swatch shifts** (optional refinement): vibrant = chroma +15–20% within bounds; subtle = chroma −25–35%.

Ported from the kamiflow `design-system-tokens` Kobayashi reference (16-cluster master table); bounds unchanged, preset aliases and 3-axis coordinates dropped.
