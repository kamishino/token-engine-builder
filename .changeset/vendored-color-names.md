---
'token-engine-builder': minor
---

Vendored color-names subset (L6) shipped as X4: a curated 144-color dataset (12 names per hue sector across lightness and chroma tiers) with nearest-neighbor OKLCH cylindrical distance matching in `src/shared/color-names.ts`. `token-extract` now uses this lookup for deterministic slug assignment.
