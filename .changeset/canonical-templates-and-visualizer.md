---
"token-engine-builder": minor
---

Align 3-tier token template canon, visualizer typography and color ramp semantics, and skill seam consistency:

- **Canonical 3-tier template tree**: Unified token templates under `src/shared/templates/tokens` (`primitive/`, `semantic/`, `component/`) passing dual WCAG 2.1 AA and APCA audit standalone across light, dark, and high-contrast themes. Replaced divergent partial seeds in `setup-pre-tokens` with automated build mirroring to both skills.
- **Visualizer typography & semantics**: Added dedicated Typography specimen section (modular type scale sizes, line-heights, live specimens, and weights), sRGB HEX fallback readouts on ramp chips, reverse-mapped semantic role badges on bound steps, and a grouped Semantic Colors table with source traceabilities.
- **Skill seam & docs parity**: Clarified compiler-of-record precedence when `sd.config.mjs` is present vs absent, qualified repo-local `npx` vs bundled CLI execution in README and AGENTS.md, aligned CLI usage strings and flag registries (`--spec` on init, `--formatter`/`--linter` `none` options), and codified the intra-primitive alias exception for responsive grid gutters.
