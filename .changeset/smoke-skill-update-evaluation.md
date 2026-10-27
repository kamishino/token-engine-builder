---
'token-engine-builder': patch
---

Harden smoke evaluation harness and CI verification for skill update:

- **Harness expansions (`smoke-all.mjs`)**: Added scenario `P4` (asserts canonical 3-tier template inventory and byte-for-byte mirroring parity across skills), scenario `S2` (asserts engine-only compiler-of-record behavior without `sd.config.mjs`), scenario `A7` (asserts shipped canonical seed templates pass standalone audit), and strengthened scenario `B5` (asserts visualizer typography table, font-weight samples, sRGB HEX fallbacks, and semantic role badges).
- **Harness repairs & CI wiring (`smoke-design-tokens.mjs`)**: Repaired template source path in Phase 5 to reference `dist/setup-pre-tokens/templates/tokens`, prioritized local built CLI binary, added Phase 6 Visual Proof check, and wired the script into `package.json` `"smoke"` and `.github/workflows/check.yml`.
- **Evaluation documentation**: Authored comprehensive smoke evaluation and agent journey report at `docs/feedback/2026-10-27-skill-update-smoke-evaluation-report.md`.
