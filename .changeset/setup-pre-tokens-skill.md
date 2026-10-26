---
'token-engine-builder': minor
---

Add `setup-pre-tokens` scriptless skill for setting up token and CSS prerequisites:
- Hand-invoked, pure cognitive skill (`disable-model-invocation: true`) acting as step 0 before `design-tokens`.
- Installs pinned devDependencies (Prettier, Stylelint, Style Dictionary v5, Sass) and scaffolds missing configs.
- Generates Dart Sass 7-1 modular architecture with BEM naming conventions and modern `@use`/`@forward` composition.
- Seeds a complete 3-tier DTCG token hierarchy (`primitive/`, `semantic/`, `component/`) with light and dark theme symmetry.
- Configures Style Dictionary to build `:root` and `[data-theme="dark"]` CSS custom properties alongside SCSS variables aliasing `var(--...)`.
- Includes complete fork guides for Biome, Terrazzo, CSS transformers (Lightning CSS, PostCSS), and alternative CSS architectures (ITCSS, Utility-First Tailwind v4, SMACSS).
