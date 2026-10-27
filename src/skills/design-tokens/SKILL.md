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

---

## Process

### 1. Silent Context Triage
Inspect repository structure before creating or editing files:
- **Codebase Maturity**: Check for existing stylesheets (`.css`, `.scss`, styled-components). In brownfield projects, follow [`references/discovery-and-evidence.md`](references/discovery-and-evidence.md) to inspect baseline contrast debt without modifying files. In greenfield projects, ask the user for their brand anchor and visual mood.
- **Tooling & Setup Detection**: Inspect for `setup-pre-tokens` artifacts (`sd.config.mjs`, `sd.dark.config.mjs`, `tokens/**/*.tokens.json`, `"tokens:build"` in `package.json` scripts). Check for an existing `tokens.config.json`. Detect package manager via lockfiles (`pnpm-lock.yaml` → `pnpm`, `yarn.lock` → `yarn`, `bun.lockb`/`bun.lock` → `bun`, else `npm`).
- **Engine Availability**: Verify `scripts/token-engine.mjs` exists in the folder containing this loaded `SKILL.md`. If missing, stop and report the skill installation is incomplete — do not hand-author tokens.
- **Runtime & Seam Scoping**: Identify Shadow DOM Web Components (target `:host, :root`), Tailwind v4 (target `@theme`), or standard DOM (target `:root`). Check whether an existing `@tokens` package or bundler alias already exists.
- **Review-Only Requests**: For audit- or review-only tasks with no token mutations requested, run `diagnose` and render per [`references/diagnose-and-report.md`](references/diagnose-and-report.md).
- **Done when**: The compiler of record is identified (target `tokens:build` if `sd.config.mjs` present, else engine build artifacts, else hand-maintained CSS) and engine presence is verified.

### 2. Socratic Aesthetic Synthesis
Translate brand intent into harmonious OKLCH anchors:
- **Greenfield**: Guide palette selection with mood metaphors and aesthetic clusters. Conduct a structured interview using [`references/palette.md`](references/palette.md) (≤7 questions: personality adjectives → cluster, primary anchor color, ramp steps [5, 9, 11], typography family + line-height [1.25, 1.5, 1.75], density [`comfortable` vs `compact`], corner radii presets). Read back the whole pick (cluster, role, name, OKLCH, reason) before recording into `tokens.config.json` matching `assets/tokens.config.example.json`.
- **Brownfield**: Consolidate mined colors into unified functional roles via semantic intent clustering (collapsing drifting hues into purposeful ramps).
  - *Engine extraction*: Run extraction to mine candidate anchors from code, a URL, or an HTML file, consulting [`references/discovery-and-evidence.md`](references/discovery-and-evidence.md) to interpret scoring:
    `node <skill-root>/scripts/token-engine.mjs extract --root . --out tokens.config.json --audit-baseline`
    `node <skill-root>/scripts/token-engine.mjs extract --url <url> --out tokens.config.json`
    `node <skill-root>/scripts/token-engine.mjs extract --html <file.html> --out tokens.config.json`
- Propose the consolidated palette for human approval before generating tokens.
- **Done when**: The user approves the consolidated palette roles and anchors.

**Before running a command:** state the resolved value of `<skill-root>` in your reply, then substitute it. If you cannot resolve it, stop and ask the user for the `design-tokens` skill folder. Never run a command containing literal `<` or `>`.

### 3. Architect Tokens
Construct or replace the 3-tier DTCG token hierarchy:
- **Contract**: Formulate brand decisions in `tokens.config.json` per [`references/token-system.md`](references/token-system.md).
- **Execution**:
  1. Run unified sync from the project root:
     `node <skill-root>/scripts/token-engine.mjs sync --spec tokens.config.json --force --out build/engine --theme all`
     *Flags*: `--force` adopts and replaces seed starter tokens; `--out build/engine` parks advisory artifacts (`tokens.js`, `theme.css`, `DESIGN.md`) safely away from target build files; `--theme all` compiles all themes.
  2. If the project contains `sd.config.mjs`, run the target's build script:
     `<pm> run tokens:build`
     This is the compiler of record for `build/tokens.css`, `build/tokens.dark.css`, and `<stylesRoot>/abstracts/_variables.scss`.
  3. If sync exits 4 at audit, report failing contrast pairs and remediate via [`references/contrast.md`](references/contrast.md) (remediation ladder). Never pass `--allow-unaudited`.
  4. Targeted subcommands and flag reference are documented in [`references/engine-and-build.md`](references/engine-and-build.md) §6 (or via `node <skill-root>/scripts/token-engine.mjs <cmd> --help`); exit codes follow the 0 ok / 2 usage / 3 refusal / 4 audit fail / 5 validation taxonomy.
- **Done when**: The token tree contains complete feedback roles and component tokens, and `build/tokens.css` is regenerated.

### 4. Codebase Modernization
Wire tokens into host components:
- Pierce Shadow DOM boundaries by injecting compiled CSS inline into `:host` scopes.
- In Sass projects, consume generated `$semantic-color-*` and `$component-*` variables. Re-run `npm run tokens:build` after token updates so `abstracts/_variables.scss` stays current.
- Replace hardcoded color literals with semantic custom properties (`background: var(--semantic-color-bg-canvas)`). Consult [`references/token-system.md`](references/token-system.md) for layout-role bindings when replacing spacing literals.
- Establish `@tokens` package aliasing **only** if a workspace tokens package already exists or the user explicitly requests one (`sync --package @tokens`). In standard projects, import directly from `build/tokens.css`.
- **Done when**: Hardcoded styling literals in host components are migrated to semantic tokens.

### 5. Visual Proof
Generate visual verification through the engine's built-in visualizer:
- Run the visualizer compilation pass:
  `node <skill-root>/scripts/token-engine.mjs build --tokens tokens --out build/engine --theme all --visualizer --force`
- Launch `build/engine/visualizer.html` in the default browser using Bash (`open` on macOS, `start` on Windows, `xdg-open` on Linux). If launch fails, display the absolute path.
- If build exits 3 (missing or stale audit stamp), return to Step 3 sync — never pass `--allow-unaudited`.
- **Done when**: `build/engine/visualizer.html` exists and its location is reported to the user.

---

## Pre-Yield Checklist

Verify these observable states before completing work:
- [ ] Raw `#hex` or `rgba()` literals in styled components are migrated to `var(--semantic-color-*)` (or Sass `$` equivalents).
- [ ] Every component token resolves through a semantic token alias.
- [ ] `build/tokens.css` was regenerated this run and application stylesheet imports resolve cleanly.
- [ ] `token-engine sync` exited 0 with a verified audit stamp in `tokens/.token-engine-audit.json`.
- [ ] `build/engine/visualizer.html` generated this run and its path reported.
