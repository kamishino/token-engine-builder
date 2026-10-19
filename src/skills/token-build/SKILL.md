---
name: token-build
description: 'Final stage of the pipeline: compile audited 3-tier tokens to CSS variables and Tailwind v4 @theme via Style Dictionary. Use when audit passes and CSS/Tailwind output is needed.'
license: MIT
compatibility: Node.js >=22.12
allowed-tools: 'Bash Read Write'
---

# Token Build — Tokens → CSS + Tailwind v4

Entry condition: `token-audit` exits 0 on this exact tree. Building unaudited tokens ships unmeasured contrast.

## Steps

1. **Build one theme at a time** (all semantic themes share paths; any `semantic/<name>.tokens.json` is buildable):

   ```bash
   node ./scripts/build.mjs --tokens tokens --out build --theme light
   node ./scripts/build.mjs --tokens tokens --out build/dark --theme dark
   node ./scripts/build.mjs --tokens tokens --out build/high-contrast --theme high-contrast
   ```

   Outputs per build: `tokens.css` (`:root` custom properties, OKLCH colors, rem dimensions), `theme.css` (Tailwind v4 `@theme`), and `components.md` (component specifications: state → token → resolved value per component). Optional `--prefix <name>` namespaces the CSS variables.
   - Done when: exit 0 and all three output files exist and are non-empty.

2. **Verify output**: spot-check that `tokens.css` contains `oklch(` values (not hex), `theme.css` contains `--color-` entries inside `@theme`, and `components.md` contains a `## button` section and a `focus-ring` row.
   - Done when: all spot-checks pass; a hex value means the `color/oklch` transform was bypassed — stop and investigate.
3. **Report** file paths + how the consumer imports them (`@import` the CSS; Tailwind v4 reads `@theme` automatically).
   - Done when: the user has copy-pasteable import lines for each built theme.

The bundled `templates/sd.config.json` documents the config shape; `build.mjs` applies the same shape programmatically with custom transforms, so no Style Dictionary install is needed in the consumer project.
