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

Run commands from the user's project root. `<skill-root>` is the absolute path to this skill's installed folder (the folder containing this `SKILL.md`); resolve it with your skill loader or by locating this file.

**Before running a command:** state the resolved value of `<skill-root>` (and any other `<...-root>` placeholder in the command) in your reply, then substitute it. If you cannot resolve it, stop and ask the user for the skill folder. Never run a command containing literal `<` or `>`.

Example: if this file is at `~/.claude/skills/token-extract/SKILL.md`, then `<skill-root>` is `~/.claude/skills/token-extract`.

1. **Extract**:

   ```bash
   node <skill-root>/scripts/extract.mjs --root . --out style-spec.json
   # Optional: generate an as-is pre-audit contrast baseline report before token generation:
   node <skill-root>/scripts/extract.mjs --root . --out style-spec.json --audit-baseline
   # Or from a rendered URL / HTML document:
   node <skill-root>/scripts/extract.mjs --url https://example.com --out style-spec.json
   node <skill-root>/scripts/extract.mjs --html page.html --out style-spec.json
   ```

   (`--force` overwrites; preview with `--dry-run`. `--url` requires Playwright with Chromium installed in the host environment; `--html` falls back to text scanning when Playwright is unavailable. Pass `--audit-baseline` with optional `--out-baseline <path>` to evaluate existing production contrast pairs before generation, emitting `.pre-audit-baseline.json` and `pre-audit-baseline.md`.) Automatically extracts theme and palette definitions from Tailwind v3 (`tailwind.config.{js,ts,cjs,mjs}`), Tailwind v4 (`@theme { --color-* }`), CSS root variables, and Stitch-format `DESIGN.md` frontmatter, preserving primary and secondary color roles into candidate `style-spec.json`. Other files fall through to heuristic pattern scanning. Scoring rules: `references/heuristics.md`.
   - Done when: exit 0 and the top candidate + evidence lines are printed (exit 1 = no color signals → fall back to the `token-style` interview).

2. **Read back via token-style**: present the top candidate and its evidence ("Reading this as: anchor … from `<file>`"), let the user confirm, veto to another candidate, or override. Hand the confirmed candidate to `token-style`, which owns the aesthetic cluster table and records `cluster` in the spec. Nothing scanned was modified.
   - Done when: the user has confirmed or overridden the anchor and the handoff to `token-style` is stated.
