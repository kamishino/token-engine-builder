---
name: design-tokens
description: "Design, audit, and refactor W3C design tokens. Use when creating palettes, fixing contrast, migrating to OKLCH, setting up dark mode, refactoring raw hexes, or piercing Shadow DOM Web Components."
license: MIT
compatibility: ">=node-22.12"
allowed-tools: "Bash Read Write Edit Glob Grep"
---

# Design Tokens

Transform fragmented, hardcoded styling into an accessible, multi-theme W3C design token architecture with automated contrast certification.

## Architecture: Seams and Decoupling

Treat the design token system as a **deep module**:
- **Interface**: Semantic CSS custom properties (`var(--semantic-color-*)`, component `var(--component-*)`) compiled to `build/tokens.css` (+ `build/tokens.dark.css`), with Sass `$semantic-color-*` aliases where a styles tree consumes them.
- **Implementation**: Perceptually uniform OKLCH color science, APCA $|L_c| \ge 60$ contrast floors, and symmetrical multi-theme polarity inversion.
- **Seam**: The compiled CSS entry files, plus existing workspace package boundaries (`@tokens`) only where the project already packages tokens.
- **Locality & Leverage**: Alter brand decisions in one central token definition; all downstream components adapt automatically.
- **The Deletion Test**: Deleting the token definitions exposes raw values across dozens of components; keeping them encapsulates styling complexity behind a one-line seam.

Consult sibling references on demand:
- [`references/engine-and-build.md`](references/engine-and-build.md): Bundled CLI acceleration (`token-engine sync`), compiler-of-record rules, and cognitive fallback workflow.
- [`references/token-math.md`](references/token-math.md): The 11-step OKLCH lightness ramp, chroma scaling curves, and cognitive contrast heuristics.
- [`references/dtcg-tiers.md`](references/dtcg-tiers.md): The 3-tier W3C DTCG schema (`primitive/`, `semantic/`, `component/`), decoupling invariants, and canonical `tokens.config.json` contract.
- [`references/specimen-template.html`](references/specimen-template.html): Standalone HTML specimen scaffold with live theme toggles and contrast badges.

---

## Process

### 1. Silent Context Triage
Inspect repository structure before creating or editing files:
- **Codebase Maturity**: Check for existing stylesheets (`.css`, `.scss`, styled-components). In brownfield projects, read existing colors to identify baseline contrast debt. In greenfield projects, ask the user for their brand anchor and visual mood.
- **Tooling & Setup Detection**: Inspect for `setup-pre-tokens` artifacts (`sd.config.mjs`, `sd.dark.config.mjs`, `tokens/**/*.tokens.json`, `"tokens:build"` in `package.json` scripts). Check for existing spec files (`tokens.config.json` or `style-spec.json`). Detect package manager via lockfiles (`pnpm-lock.yaml` → `pnpm`, `yarn.lock` → `yarn`, `bun.lockb`/`bun.lock` → `bun`, else `npm`).
- **Engine Availability**: Check if `scripts/token-engine.mjs` exists in the folder containing this loaded `SKILL.md`.
- **Runtime & Seam Scoping**: Identify Shadow DOM Web Components (target `:host, :root`), Tailwind v4 (target `@theme`), or standard DOM (target `:root`). Check whether an existing `@tokens` package or bundler alias already exists.
- **Done when**: The execution lane is chosen (engine lane if bundled CLI exists, cognitive fallback otherwise) and the compiler of record is identified (target `tokens:build` if `sd.config.mjs` present, else engine build artifacts, else hand-maintained CSS).

### 2. Socratic Aesthetic Synthesis
Translate brand intent into harmonious OKLCH anchors:
- **Greenfield**: Guide palette selection with mood metaphors and aesthetic clusters.
- **Brownfield**: Consolidate mined colors into unified functional roles via semantic intent clustering (collapsing drifting hues into purposeful ramps).
  - *Engine option*: Run extraction to mine candidate anchors:
    `node <skill-root>/scripts/token-engine.mjs extract --root . --out tokens.config.json --audit-baseline`
- Propose the consolidated palette for human approval before generating or authoring tokens.
- **Done when**: The user approves the consolidated palette roles and anchors.

**Before running a command:** state the resolved value of `<skill-root>` in your reply, then substitute it. If you cannot resolve it, stop and ask the user for the `design-tokens` skill folder. Never run a command containing literal `<` or `>`.

### 3. Architect Tokens
Construct or replace the 3-tier DTCG token hierarchy:
- **Contract**: Formulate brand decisions in `tokens.config.json` (3 OKLCH brand anchors, neutral hue, typography modular scale). See [`references/dtcg-tiers.md`](references/dtcg-tiers.md).
- **Branch A: Engine Lane (Fast-Path Acceleration)**:
  1. Run unified sync from the project root:
     `node <skill-root>/scripts/token-engine.mjs sync --spec tokens.config.json --force --out build/engine --theme all`
     *Flags*: `--force` adopts and replaces seed starter tokens; `--out build/engine` parks advisory artifacts (`tokens.js`, `theme.css`, `DESIGN.md`) safely away from target build files; `--theme all` compiles all themes.
  2. If the project contains `sd.config.mjs`, run the target's build script:
     `<pm> run tokens:build`
     This is the compiler of record for `build/tokens.css`, `build/tokens.dark.css`, and `<stylesRoot>/abstracts/_variables.scss`.
  3. If sync exits 1 at audit, report failing contrast pairs and adjust anchors in `tokens.config.json`. Never pass `--allow-unaudited`.
- **Branch B: Cognitive Lane (Zero-Binary Fallback)**:
  1. Author token files directly under `tokens/` per [`references/dtcg-tiers.md`](references/dtcg-tiers.md) and [`references/token-math.md`](references/token-math.md): DTCG object color primitives, all 17 semantic roles + feedback roles (`light.tokens.json`, `dark.tokens.json`), and component tokens.
  2. Compile CSS: run `npm run tokens:build` if `sd.config.mjs` is present, else author `build/tokens.css` directly from resolved variables.
- **Done when**: The token tree contains complete feedback roles and component tokens, and `build/tokens.css` is regenerated.

### 4. Codebase Modernization
Wire tokens into host components:
- Pierce Shadow DOM boundaries by injecting compiled CSS inline into `:host` scopes.
- In Sass projects, consume generated `$semantic-color-*` and `$component-*` variables. Re-run `npm run tokens:build` after token updates so `abstracts/_variables.scss` stays current.
- Replace hardcoded color literals with semantic custom properties (`background: var(--semantic-color-bg-canvas)`).
- Establish `@tokens` package aliasing **only** if a workspace tokens package already exists or the user explicitly requests one (`sync --package @tokens`). In standard projects, import directly from `build/tokens.css`.
- **Done when**: Hardcoded styling literals in host components are migrated to semantic tokens.

### 5. Visual Specimen Proof
Generate a self-contained HTML specimen in the OS temp directory (`<tmpdir>/design-token-specimen-<timestamp>.html`) based on [`references/specimen-template.html`](references/specimen-template.html) populated with compiled values from `build/tokens.css`.
- Launch the specimen in the default browser using Bash (`open` on macOS, `start` on Windows, `xdg-open` on Linux). If launch fails, display the absolute path.
- **Done when**: The specimen file exists on disk and its location is reported to the user.

---

## Pre-Yield Checklist

Verify these observable states before completing work:
- [ ] Raw `#hex` or `rgba()` literals in styled components are migrated to `var(--semantic-color-*)` (or Sass `$` equivalents).
- [ ] Every component token resolves through a semantic token alias.
- [ ] `build/tokens.css` was regenerated this run and application stylesheet imports resolve cleanly.
- [ ] Engine lane: `token-engine sync` exited 0 with a verified audit stamp in `tokens/.token-engine-audit.json`.
- [ ] Cognitive lane: Canvas and action contrast spot-verified at $\Delta L \ge 0.45$ per `token-math.md` and `tokens:build` (when present) exits 0.
