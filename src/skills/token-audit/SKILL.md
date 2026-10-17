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

1. **Run the gate** (both themes by default):

   ```bash
   node ./scripts/audit.mjs --tokens tokens --min-ratio 4.5
   ```

   Checks: every fg/bg role pair (body text, secondary text, action, button, card, input), every alias resolves, zero raw values above Tier 1. Role floors and marginal-pass reading: `references/contrast.md`.
   - Done when: the report prints per-theme PASS/FAIL lines and an exit code.

2. **Remediate failures** (no human needed, max 3 loops; ladder in `references/contrast.md`):
   - Contrast shortfall → move the offending primitive step one step further from its background (e.g. semantic alias `neutral.700` → `neutral.800`), or shift the anchor `l` in `style-spec.json` ≥ 0.05 and re-run `token-math`.
   - Unresolved alias → fix the target path; aliases are dotted from the merged tree root (`{color.brand.500}`).
   - Raw value above Tier 1 → move it into `primitive/` and alias it.
   - Done when: audit exits 0, or 3 loops elapsed → escalate with the failing pairs table.
3. **Report**: paste the ratio table; state PASS/FAIL per theme.
   - Done when: every pair from the report is accounted for in your reply.
