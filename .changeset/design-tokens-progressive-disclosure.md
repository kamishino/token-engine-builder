---
'token-engine-builder': minor
---

Reorganize design-tokens agent skill around progressive disclosure and tokens.config.json:
- Consolidated 15 individual references into 6 job-aligned reference documents loaded at point of need.
- Cut over engine and CLI defaults (`extract`, `generate`) entirely to `tokens.config.json`, removing legacy `style-spec.json` fallback auto-discovery.
- Renamed example asset to `assets/tokens.config.example.json` and updated test fixtures.
- Streamlined `SKILL.md` to core workflow, removing shallow upfront indices and delegating visual proof to the engine visualizer.
- Added orphan reference detection, forbidden literal checks across references, and reverse flag parity to `scripts/lint-skills.mjs`.
