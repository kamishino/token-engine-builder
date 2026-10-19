---
name: token-math
description: 'Second in the pipeline: generate the 3-tier DTCG token tree from style-spec.json. Use when the spec exists and tokens/ is missing or the anchor changed.'
license: MIT
compatibility: Node.js >=22.12
allowed-tools: 'Bash Read Write'
---

# Token Math — `style-spec.json` → 3-Tier Tokens

Deterministic: same spec in, same tokens out. The script does the math (OKLCH ramps, modular type scale, 4px spacing); you run it and report.

## Steps

1. **Generate**:

   ```bash
   node ./scripts/generate.mjs --spec style-spec.json --out tokens
   ```

   (`--force` overwrites an existing `tokens/`; ask before using it. Preview with `--dry-run` first.) It copies `templates/tokens/` then rewrites primitives from the spec palette — every palette anchor lands exactly on its ramp's step 500 (sRGB-clamped, warning printed). See `references/color-architecture.md` for palette/harmony guidance and `references/scales.md` for scale rules. Layout roles, grid primitives, and rhythm scales are generated with the tree — components bind `layout.*` roles, not raw spacing steps.
   - Done when: exit 0 and `tokens/primitive/color.tokens.json` contains each palette slug with its anchor at step 500.

2. **Respect the tiers** in any manual edit afterwards: raw values only in `primitive/`; `semantic/` (one file per theme, same paths) and `component/` contain `{alias}` values only.
   - Done when: no `#hex`, `oklch(...)`, or px literal appears outside `primitive/`.
3. **Hand off** to `token-audit` before building anything.
   - Done when: audit has been run against this exact `tokens/` tree.

Schema for the input: `assets/style-spec.schema.json`. Re-running generate after a spec change is safe — Tier-1 files are derived, semantic/component templates are recopied (back up hand edits first).
