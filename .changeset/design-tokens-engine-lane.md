---
'token-engine-builder': minor
---

Make `design-tokens` compatible with `setup-pre-tokens` and the `token-engine` CLI:
- Enable `Bash` tool in `design-tokens` to support bundled CLI acceleration alongside cognitive zero-binary fallback.
- Support `setup-pre-tokens` starter seeds via `token-engine sync --force --out build/engine --theme all`, adopting seeds into certified 3-tier token trees with audit stamps.
- Establish target Style Dictionary (`npm run tokens:build`) as the compiler of record for production CSS/SCSS stylesheets.
- Bundle token templates into `dist/design-tokens/templates` so the standalone CLI operates self-contained without sibling skill dependencies.
- Fix DTCG 3-tier schema references (`references/dtcg-tiers.md`), valid `tokens.config.json` StyleSpec contract, and specimen HTML custom property names.
- Port self-contained `color/oklch` transform into `setup-pre-tokens` Style Dictionary templates, ensuring consistent OKLCH CSS text between both compilers.
