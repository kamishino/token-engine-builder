---
name: token-math
description: 'Second in the pipeline: generate the 3-tier DTCG token tree from style-spec.json. Use when the spec exists and tokens/ is missing or the anchor changed.'
license: MIT
compatibility: Node.js >=22.12
---

# Token Math — `style-spec.json` → 3-Tier Tokens

Deterministic: same spec in, same tokens out. The script does the math (OKLCH ramps, modular type scale, 4px spacing); you run it and report.

## Steps

1. **Generate**:

   ```bash
   node ./scripts/generate.mjs --spec style-spec.json --out tokens
   ```

   (`--force` overwrites an existing `tokens/`; ask before using it.) It copies `templates/tokens/` then rewrites Tier-1 primitives from the spec — brand anchor lands exactly on `color.brand.500`.
   - Done when: exit 0 and `tokens/1-primitive/color.tokens.json` contains the spec anchor at `brand.500`.

2. **Respect the tiers** in any manual edit afterwards: raw values only in `1-primitive/`; `2-semantic/` (one file per theme, same paths) and `3-component/` contain `{alias}` values only.
   - Done when: no `#hex`, `oklch(...)`, or px literal appears outside `1-primitive/`.
3. **Hand off** to `token-audit` before building anything.
   - Done when: audit has been run against this exact `tokens/` tree.

Schema for the input: `assets/style-spec.schema.json`. Re-running generate after a spec change is safe — Tier-1 files are derived, semantic/component templates are recopied (back up hand edits first).
