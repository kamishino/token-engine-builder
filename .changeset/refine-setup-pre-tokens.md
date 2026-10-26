---
'token-engine-builder': patch
---

Refine `setup-pre-tokens` skill:
- Align semantic token seeds with canonical `THEME_REGISTRY` targets across light and dark themes.
- Regenerate typography, spacing, and rhythm scales from `scales.ts` functions; align neutral-600 ramp with gold standard.
- Split Style Dictionary configuration into declarative `sd.config.mjs` and `sd.dark.config.mjs`, supporting `style-dictionary clean` and `--platform` flags.
- Fix Terrazzo Sass `@forward` relative path across styles root variations and add `terrazzo.dark.config.mjs` template payload.
- Correct app entry import paths in `SKILL.md` and `target-README.md` to root-relative specifiers.
- Streamline `SKILL.md` procedural driver with all completion gates and fork pointers preserved.
