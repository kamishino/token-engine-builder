---
name: token-extract
description: 'Alternative entry to the pipeline: extract a candidate style-spec.json from an existing project (CSS/tokens/config). Use when a product already has colors/fonts in code and the interview should start from evidence, not taste.'
license: MIT
compatibility: Node.js >=22.12
allowed-tools: 'Bash Read Write'
---

# Token Extract — Existing Project → Candidate `style-spec.json`

Extraction is evidence, not migration: the scan is read-only and the candidate is a hypothesis. `token-style`'s read-back still decides.

## Steps

1. **Extract**:

   ```bash
   node ./scripts/extract.mjs --root . --out style-spec.json
   ```

   (`--force` overwrites; preview with `--dry-run`.) A `DESIGN.md` with Stitch frontmatter is parsed through its frontmatter (primary/secondary palette, typography scale, rounded, density preserved as recorded; components noted, not ingested); other Markdown falls through to prose color scanning at lowest confidence. Scoring rules: `references/heuristics.md`.
   - Done when: exit 0 and the top candidate + evidence lines are printed (exit 1 = no color signals → fall back to the `token-style` interview).

2. **Read back via token-style**: present the top candidate and its evidence ("Reading this as: anchor … from `<file>`"), let the user confirm, veto to another candidate, or override. Resolve the Kobayashi cluster the anchor falls in (`token-style/references/style-clusters.md`) and record `cluster` in the spec.
   - Done when: the user has seen the evidence and the spec carries the confirmed anchor (+ cluster when one resolved).
3. **Hand off** to `token-math` (`generate.mjs --spec style-spec.json`). Nothing scanned was modified.
   - Done when: token-math has generated from the confirmed spec.
