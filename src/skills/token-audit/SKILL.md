---
name: token-audit
description: 'Third in the pipeline: audit a 3-tier token tree as a WCAG + APCA gatekeeper. Use after generating or editing tokens, before building or shipping them; exit 1 blocks the build.'
license: MIT
compatibility: Node.js >=22.12
allowed-tools: 'Bash Read'
---

# Token Audit — WCAG + APCA Gatekeeper

Binary dual gate: every pair must clear BOTH WCAG ratio (--min-ratio, default 4.5) and APCA |Lc| (--min-apca, default 60). Exit 0 ships, exit 1 stops. Never soften a failure by lowering either floor without the user saying so.

## Steps

Run commands from the user's project root. `<skill-root>` is the absolute path to this skill's installed folder (the folder containing this `SKILL.md`); resolve it with your skill loader or by locating this file.

**Before running a command:** state the resolved value of `<skill-root>` (and any other `<...-root>` placeholder in the command) in your reply, then substitute it. If you cannot resolve it, stop and ask the user for the skill folder. Never run a command containing literal `<` or `>`.

Example: if this file is at `~/.claude/skills/token-audit/SKILL.md`, then `<skill-root>` is `~/.claude/skills/token-audit`.

1. **Run the gate** (every theme under `semantic/` by default):

   ```bash
   node <skill-root>/scripts/audit.mjs --tokens tokens --min-ratio 4.5
   ```

   Checks: every fg/bg role pair (body text, secondary text, action, button, card, input), every alias resolves, zero raw values above Tier 1. Role floors and marginal-pass reading: `references/contrast.md`. Pass `--theme <name>` to check a single theme instead of all discovered themes. Pass `--json` for machine-readable JSON output. Pass `--spec <style-spec.json>` to take the text floor from the spec's recorded `targets.minWcagRatio` when `--min-ratio` is not given explicitly.
   - Done when: the report prints per-theme PASS/FAIL lines and an exit code.

2. **Remediate failures** (no human needed, max 3 loops; ladder in `references/contrast.md`):
   - Contrast shortfall → audit prints a `remedy:` alias computed from the same ramp; record that alias (or a farther step) in `overrides.<theme>.<semantic.path>` in `style-spec.json` (e.g. `semantic.color.text.tertiary` → `{color.neutral.700}`), then re-run `token-math` — never edit a generated semantic file (regeneration would erase it and trip provenance).
   - Unresolved alias → fix the target path; aliases are dotted from the merged tree root (`{color.cerulean.500}`).
   - Raw value above Tier 1 → move it into `primitive/` and alias it.
   - Done when: audit exits 0, or 3 loops elapsed → escalate with the failing pairs table.
3. **Report**: paste the ratio table; state PASS/FAIL per theme.
   - Done when: every pair from the report is accounted for in your reply.
