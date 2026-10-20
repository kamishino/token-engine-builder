---
name: token-build
description: 'Final stage of the pipeline: compile audited 3-tier tokens to CSS variables and Tailwind v4 @theme via Style Dictionary. Use when audit passes and CSS/Tailwind output is needed.'
license: MIT
compatibility: Node.js >=22.12
allowed-tools: 'Bash Read Write'
---

# Token Build — Tokens → CSS + Tailwind v4

Entry condition: `token-audit` exits 0 on this exact tree — enforced technically: build recomputes the token-tree hash and refuses without a fresh passing audit stamp (`.token-engine-audit.json`). `--allow-unaudited` bypasses with a printed warning, for emergencies only. Building unaudited tokens ships unmeasured contrast.

## Steps

1. **Build one theme at a time** (all semantic themes share paths; any `semantic/<name>.tokens.json` is buildable):

   ```bash
   node ./scripts/build.mjs --tokens tokens --out build --theme light
   node ./scripts/build.mjs --tokens tokens --out build/dark --theme dark
   node ./scripts/build.mjs --tokens tokens --out build/high-contrast --theme high-contrast
   ```

   Outputs per build: `tokens.css` (`:root` custom properties, OKLCH colors, rem dimensions), `theme.css` (Tailwind v4 `@theme`), `components.md` (component specifications: state → token → resolved value per component), and `DESIGN.md` (Stitch-format guide; pass `--spec <style-spec.json>` to render frontmatter/prose from the recorded palette and guide block). Optional `--visualizer` emits `visualizer.html` (zero-dep interactive HTML inspector for color ramps and component specimens). Optional `--prefix <name>` namespaces the CSS variables. UI-library profiles: `--profile shadcn|bootstrap|primevue|antd|mui|chakra|radix|fluent` emits one dual-theme CSS file instead (see `references/ui-library-profiles.md`).
   - Done when: exit 0 and all expected output files exist and are non-empty.

2. **Verify output**: spot-check that `tokens.css` contains `oklch(` values (not hex), `theme.css` contains `--color-` entries inside `@theme`, `components.md` contains `## button` and `## Composite patterns` sections, and `DESIGN.md` frontmatter `colors.primary` equals the hex of the spec's primary palette anchor (when `--spec` was passed).
   - Done when: all spot-checks pass; a hex value means the `color/oklch` transform was bypassed — stop and investigate.
3. **Report** file paths + how the consumer imports them (`@import` the CSS; Tailwind v4 reads `@theme` automatically).
   - Done when: the user has copy-pasteable import lines for each built theme.

### Figma Sync Bridge

Synchronize W3C DTCG tokens with Figma Variables via `./scripts/figma.mjs`:

```bash
# Export DTCG tokens directory to Figma Variables JSON
node ./scripts/figma.mjs --to-figma tokens --out figma-variables.json

# Import Figma Variables JSON into DTCG 3-tier tokens
node ./scripts/figma.mjs --from-figma figma-variables.json --out tokens
```
