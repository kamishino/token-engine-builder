---
'token-engine-builder': minor
---

Implement Dual-Audit architecture and strategic toolchain improvements:
- `ask-kami`: Added automated codebase context pre-audit (`maturity`, `runtime`, `packageManager`), displaying context in router state and auto-tailoring downstream command flags (e.g. `--selector ":host, :root"` when Web Components are detected).
- `ask-kami`: Added `--scaffold` interactive toolchain companion flag to emit clean starter configurations for formatters (Prettier, Biome), linters (Stylelint `color-no-hex`, ESLint), and CSS imports without forced dependency installs.
- `token-extract`: Added `--audit-baseline` and `--out-baseline <path>` to pair production CSS color rules (rule co-occurrence + container fallback), evaluate WCAG and APCA contrast, and emit `.pre-audit-baseline.json` and `pre-audit-baseline.md`.
- `token-audit`: Added `--baseline <path>` to match baseline pairs with post-generation tokens by semantic role tag and emit a Before-vs-After delta scorecard highlighting resolved contrast debt.
