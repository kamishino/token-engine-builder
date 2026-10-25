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

Run commands from the user's project root. `<skill-root>` is the absolute path to this skill's installed folder (the folder containing this `SKILL.md`); resolve it with your skill loader or by locating this file.

**Before running a command:** state the resolved value of `<skill-root>` (and any other `<...-root>` placeholder in the command) in your reply, then substitute it. If you cannot resolve it, stop and ask the user for the skill folder. Never run a command containing literal `<` or `>`.

Example: if this file is at `~/.claude/skills/token-build/SKILL.md`, then `<skill-root>` is `~/.claude/skills/token-build`.

1. **Build themes** (single theme or `--theme all` to batch build all semantic themes):

   ```bash
   # Multi-theme batch build (recommended):
   node <skill-root>/scripts/build.mjs --tokens tokens --out build --theme all

   # Single theme build:
   node <skill-root>/scripts/build.mjs --tokens tokens --out build --theme light
   node <skill-root>/scripts/build.mjs --tokens tokens --out build/dark --theme dark
   node <skill-root>/scripts/build.mjs --tokens tokens --out build/high-contrast --theme high-contrast
   ```

   Outputs per build: `tokens.css` (custom properties with OKLCH colors and rem dimensions), `tokens.js` (typed ESM dictionary exports and themes object), `tokens.d.ts` (TypeScript definitions), `theme.css` (Tailwind v4 `@theme`), `components.md` (component specifications: state → token → resolved value per component), and `DESIGN.md` (Stitch-format guide; pass `--spec <style-spec.json>` to render frontmatter/prose from the recorded palette and guide block). Pass `--selector <string>` (default `:root`) to scope custom properties (e.g. `--selector ":host, :root"` for Web Components/Shadow DOM). Pass `--theme all` to compile a consolidated `tokens.css` with dark/light mode switching plus per-theme split files. Pass `--package [name]` to scaffold an import-ready `package.json`. Pass `--format css|ts|all` (default `all`) to filter emitted artifacts. Pass `--force` to overwrite existing outputs deliberately. Preview actions with `--dry-run`. Optional `--visualizer` emits `visualizer.html` (zero-dep interactive HTML inspector for color ramps and component specimens). Optional `--prefix <name>` namespaces the CSS variables. UI-library profiles: `--profile shadcn|bootstrap|primevue|antd|mui|chakra|radix|fluent` emits one dual-theme CSS file instead (see `references/ui-library-profiles.md`).
   - Done when: exit 0 and all expected output files exist and are non-empty.

2. **Verify output**: build automatically asserts that `tokens.css` contains `oklch(` values, `theme.css` carries a populated `@theme` block with `--color-*` entries, and `DESIGN.md` frontmatter `colors.primary` equals the sRGB-clamped spec anchor (when `--spec` was passed), exiting 1 on failure. Spot-check that `components.md` contains `## button` and `## Composite patterns` sections.
   - Done when: exit 0, all expected output files exist and are non-empty, and `components.md` contains both `## button` and `## Composite patterns`.
3. **Report** file paths + how the consumer imports them (`@import` the CSS; Tailwind v4 reads `@theme` automatically).
   - Done when: the user has copy-pasteable import lines for each built theme.

### Figma Sync Bridge

Synchronize W3C DTCG tokens with Figma Variables via `node <skill-root>/scripts/figma.mjs`:

```bash
# Export DTCG tokens directory to Figma Variables JSON
node <skill-root>/scripts/figma.mjs --to-figma tokens --out figma-variables.json

# Import Figma Variables JSON into DTCG 3-tier tokens
node <skill-root>/scripts/figma.mjs --from-figma figma-variables.json --out tokens [--force]
```

Import refuses to overwrite an existing tokens directory or an already-imported token file without `--force`.
