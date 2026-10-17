# token-math

Second in the pipeline: scaffolds the 3-tier DTCG token tree from `templates/` and populates Tier-1 primitives from a `style-spec.json`. Deterministic — same spec in, same tokens out.

## Install

```bash
cp -r dist/token-math ~/agents/skills/token-math
```

Requires Node `>=22.12`. No install step: dependencies are inlined into `scripts/generate.mjs` at build time.

## Use

```bash
node ~/agents/skills/token-math/scripts/generate.mjs --spec style-spec.json --out tokens
```

`--force` overwrites an existing `tokens/` (the agent should ask first). The brand anchor lands exactly on `color.brand.500`; tiers 2–3 stay alias-only. Schema: `assets/style-spec.schema.json`. The full procedure is in [SKILL.md](SKILL.md).

## Next

Hand `tokens/` to the `token-audit` skill before building anything.
