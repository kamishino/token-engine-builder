---
'token-engine-builder': major
---

Remove the 7 deprecated legacy skills (token-style, token-extract, token-math, token-audit, token-build, ask-kami, improve-design-system). All capabilities live in the token-engine CLI and the design-tokens skill. CLI subcommands now return the documented exit-code taxonomy (2 usage, 3 refusal, 4 audit, 5 validation) instead of collapsing failures to 1. Audit now fails on alias cycles anywhere in the token tree and on semantic tokens missing from any audited theme; layout.* spec overrides are accepted.

### Migration Table

| Retired Skill | Replacement Subcommand | Flagship Skill Step | Description |
| :--- | :--- | :--- | :--- |
| `token-style` | `token-engine init` | `design-tokens` Step 2 (Socratic Aesthetic Synthesis) | Socratic brand discovery interview and `tokens.config.json` initialization |
| `token-extract` | `token-engine extract` | `design-tokens` Step 2 (Brownfield Extraction) | Mine color and typography signals from CSS, HTML, or rendered URLs |
| `token-math` | `token-engine generate` | `design-tokens` Step 3 (Architect Tokens) | Generate 3-tier DTCG token JSON tree from specification |
| `token-audit` | `token-engine audit` | `design-tokens` Step 3 (Audit Gatekeeper) | WCAG 2.1 AA and APCA contrast verification across 42 canonical pairs |
| `token-build` | `token-engine build` | `design-tokens` Step 3 / 4 (Compilation & Wire) | Compile tokens to CSS, Tailwind v4 `@theme`, TS/JS, and UI profiles |
| `ask-kami` | `token-engine route` | `design-tokens` Step 1 (Silent Triage) | Inspect design system state and determine next recommended action |
| `improve-design-system` | `token-engine diagnose` | `design-tokens` Step 1 / 3 | Deep design system health evaluation, tamper checks, and findings reports |
