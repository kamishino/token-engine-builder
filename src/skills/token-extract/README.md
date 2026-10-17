# token-extract

Alternative entry to the pipeline: scans an existing project (CSS/SCSS/JSON/JS/TS/HTML) for color, font, and radius signals and writes a candidate `style-spec.json`. Read-only — nothing scanned is modified, and the candidate still passes through `token-style`'s read-back before any math runs.

## Install

```bash
cp -r dist/token-extract ~/agents/skills/token-extract
```

Requires Node `>=22.12`. No install step: dependencies are inlined into `scripts/extract.mjs` at build time.

## Use

```bash
node ~/agents/skills/token-extract/scripts/extract.mjs --root . --out style-spec.json
```

Prints the top-5 candidate anchors with their source files as evidence. `--dry-run` prints the candidate spec + evidence as JSON (a gold example lives in `examples/extraction-report.example.json`); `--force` overwrites an existing spec. Scoring rules: `references/heuristics.md`. The full procedure is in [SKILL.md](SKILL.md).

## Next

Confirm the candidate in `token-style` (read-back), then generate with `token-math`.
