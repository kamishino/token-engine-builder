# token-audit

Third in the pipeline: the WCAG 2.1 gatekeeper over a 3-tier token tree. Binary gate — exit 0 ships, exit 1 stops the build.

## Install

```bash
cp -r dist/token-audit ~/agents/skills/token-audit
```

Requires Node `>=22.12`. No install step: dependencies are inlined into `scripts/audit.mjs` at build time.

## Use

```bash
node ~/agents/skills/token-audit/scripts/audit.mjs --tokens tokens --min-ratio 4.5
```

Checks the canonical contrast pairs per theme, resolves every alias, and rejects raw values above Tier 1. `--json` prints a machine-readable report (a gold example lives in `examples/audit-report.example.json`). Never lower `--min-ratio` to pass. The full procedure is in [SKILL.md](SKILL.md).

## Next

On exit 0, hand `tokens/` to the `token-build` skill. On exit 1, remediate per SKILL.md (max 3 loops, then escalate).
