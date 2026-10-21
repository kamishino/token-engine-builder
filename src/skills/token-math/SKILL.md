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

Run commands from the user's project root directory; `~/.agents/skills/token-math` is this skill's installed folder.

1. **Generate**:

   ```bash
   node ~/.agents/skills/token-math/scripts/generate.mjs --spec style-spec.json --out tokens
   ```

   (`--force` overwrites an existing `tokens/`; ask before using it. Preview with `--dry-run` first.) It copies `templates/tokens/` then rewrites primitives from the spec palette — every palette anchor lands exactly on its ramp's step 500 (sRGB-clamped, warning printed). See `references/color-architecture.md` for palette/harmony guidance and `references/scales.md` for scale rules. Layout roles, grid primitives, and rhythm scales are generated with the tree — components bind `layout.*` roles, not raw spacing steps.
   - Done when: exit 0 and `tokens/primitive/color.tokens.json` contains each palette slug with its anchor at step 500.

2. **Tier discipline**: raw values only in `primitive/`; `semantic/` (one file per theme, same paths) and `component/` contain `{alias}` values only. Remediate contrast or alias issues via `overrides` in `style-spec.json`, never by hand-editing generated files (the tamper guard will refuse builds).
   - Done when: no `#hex`, `oklch(...)`, or px literal appears outside `primitive/`.
3. **Hand off** to `token-audit` with `node ~/.agents/skills/token-audit/scripts/audit.mjs --tokens tokens --min-ratio 4.5`.
   - Done when: the user has the `tokens/` path and the exact `token-audit` command.

Input contract: the `StyleSpec` JSON consumed by `scripts/generate.mjs`; see `assets/style-spec.example.json` for the canonical example. Re-running generate after a spec change is safe — Tier-1 files are derived and semantic themes are regenerated with durable overrides applied.
