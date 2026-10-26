---
name: setup-pre-tokens
description: "Set up a project's token/CSS prerequisites: formatter, Stylelint, Style Dictionary, Sass 7-1 + BEM, and 3-tier token seeds. Hand-invoked only; run before design-tokens."
license: MIT
compatibility: ">=node-22.12"
allowed-tools: "Bash Read Write Edit Glob Grep"
disable-model-invocation: true
---

# Setup Pre-Tokens

Prepare a frontend project with self-sufficient token and CSS prerequisites so `tokens:build` passes out-of-the-box, establishing a clean `@tokens` foundation before `design-tokens` authors brand decisions.

## Architecture: Seams & Decoupling

Treat the prerequisite foundation as a zero-decision mechanical substrate:
- **Interface**: The `tokens:build` and `lint:styles` scripts, plus the entry outputs (`build/tokens.css`, `build/tokens.dark.css`, and `<stylesRoot>/main.scss`).
- **Implementation**: Pinned devDependencies, non-destructive config scaffolding, Sass 7-1 module architecture (`@use`), and minimal 3-tier token seeds.
- **Seam**: This skill authors no brand decisions; seed tokens are valid structural placeholders that `design-tokens` completely replaces.
- **Locality & Leverage**: Centralize token compilation inside the target project, making it self-contained without external toolchain assumptions.

Consult sibling references on demand:
- [`references/detection-and-defaults.md`](references/detection-and-defaults.md): Triage detection matrix, installed evidence signatures, and pinned default packages.
- [`references/sass-7-1-bem.md`](references/sass-7-1-bem.md): Sass 7-1 folder roles, modern `@use` composition rules, and BEM selector conventions.
- [`references/fowler-tier-mapping.md`](references/fowler-tier-mapping.md): Mapping Martin Fowler's Option/Decision/Component model to repository DTCG canon.
- [`references/fork-biome.md`](references/fork-biome.md): Complete instructions and config delta when substituting Biome for Prettier.
- [`references/fork-terrazzo.md`](references/fork-terrazzo.md): Complete instructions and config delta when substituting Terrazzo for Style Dictionary v5.
- [`references/fork-css-transformers.md`](references/fork-css-transformers.md): Setup recipes for optional Lightning CSS or PostCSS integration.
- [`references/fork-css-architectures.md`](references/fork-css-architectures.md): Scaffolding instructions for ITCSS, Utility-First (Tailwind v4), or SMACSS.

---

## Process

### 1. Silent Triage
Inspect the project root (`process.cwd()`) before proposing changes:
- Verify `package.json` exists. If missing, halt immediately: inform the user to initialize the project first (e.g. `npm init`) before running this skill.
- Detect package manager by lockfile precedence: `pnpm-lock.yaml` → `pnpm`, `yarn.lock` → `yarn`, `bun.lockb` or `bun.lock` → `bun`, else fallback to `npm`. If `.pnp.cjs` exists, stop and report Yarn PnP as unsupported.
- Check for workspace root definitions (`workspaces` in `package.json`, `pnpm-workspace.yaml`, `lerna.json`, `nx.json`, `turbo.json`) to select workspace install flags.
- Consult [`references/detection-and-defaults.md`](references/detection-and-defaults.md) to audit existing tools: formatter, style linter, token compiler, CSS transformer, Sass, token hierarchy (`tokens/`), and stylesheet tree (`src/styles/` or `styles/`).
- Inspect working tree status with `git status --porcelain` if git is initialized; record uncommitted file presence for the confirmation note.
- **Done when**: Every toolchain slot is classified present or missing, with exact evidence paths identified.

### 2. Single-Touch Plan + Confirmation
Present ONE consolidated execution plan and await user confirmation:
- Enumerate missing slots with pre-selected defaults and switch keywords: Formatter (`prettier` default / `biome`), Token Compiler (`style-dictionary` default / `terrazzo`), CSS Transformer (`none` default / `lightning` / `postcss`), CSS Architecture (`sass-7-1` default / `itcss` / `tailwind` / `smacss`).
- List exact packages to install with pinned majors (`style-dictionary@^5`, `prettier@^3`, `stylelint@^17`, `sass@^1`, `stylelint-config-standard-scss@^17`, `postcss-scss@^4`).
- List every file to be created or modified (including `package.json` scripts).
- Explicitly declare safety rules: existing configuration files are never overwritten; no git operations (commit, stage, stash) are performed.
- If existing rival tools are detected (e.g. both Prettier and Biome configs), preserve both, defer to the tool referenced in existing npm scripts, and prompt only if unreferenced.
- **Done when**: User responds with confirmation (any requested slot overrides in the reply are incorporated into the plan).

### 3. Install Dependencies
Execute package installation using the detected package manager:
- `npm`: `npm install -D <packages>`
- `pnpm`: `pnpm add -D <packages>` (append `-w` if workspace root detected)
- `yarn`: `yarn add -D <packages>`
- `bun`: `bun add -d <packages>`
- On installation failure, halt immediately: display the command output verbatim, do not modify files, and do not retry with `--force` or `--legacy-peer-deps`.
- **Done when**: All confirmed packages appear in `package.json` `devDependencies` and the lockfile is updated.

### 4. Write Configs & Scripts
Scaffold missing tooling configurations and wire npm scripts:
- Copy config templates from `templates/configs/` relative to the skill directory, replacing `__STYLES_ROOT__` with the resolved styles directory (default `src/styles` if `src/` exists, else `styles`):
  - `.prettierrc.json` (if missing) and append missing entries to `.prettierignore` (`build/`, `__STYLES_ROOT__/abstracts/_variables.scss`).
  - `stylelint.config.mjs` (if missing).
  - `sd.config.mjs` (if missing). If an existing Style Dictionary config is detected under another name, preserve it and target it in the build script.
- Add missing scripts to `package.json` without overwriting existing entries:
  - `"tokens:build"`: `"style-dictionary build --config sd.config.mjs"`
  - `"lint:styles"`: `"stylelint \"__STYLES_ROOT__/**/*.scss\""`
  - `"format"`: `"prettier --write ."`
  - `"format:check"`: `"prettier --check ."`
- If Biome was selected, consult [`references/fork-biome.md`](references/fork-biome.md) for script and config variants.
- **Done when**: All required configs exist on disk and `package.json` contains valid scripts.

### 5. Scaffold Tokens & Styles
Populate initial 3-tier token seeds and Sass 7-1 architecture:
- **Tokens**: If `tokens/` is absent or contains no `*.tokens.json` files, copy `templates/tokens/**` to `tokens/` (primitive ramps, semantic `light`/`dark` themes, and component `button`). If tokens already exist, leave them untouched.
- **Sass 7-1**: Scaffold `<stylesRoot>/` directories (`abstracts/`, `base/`, `components/`, `layout/`, `pages/`, `themes/`, `vendors/`). Each folder receives an `_index.scss`.
- Seed partials: `base/_reset.scss`, `base/_typography.scss`, `components/_button.scss`, `abstracts/_mixins.scss`, and the root entry `<stylesRoot>/main.scss`.
- Copy `templates/target-README.md` to `<stylesRoot>/README.md` if missing.
- **Done when**: Token and stylesheet directories contain the complete structure without overwriting pre-existing user files.

### 6. Build and Verify
Execute verification pipeline using the detected package manager (`<pm> run <script>`):
1. **Token Compilation**: Run `tokens:build`. Verify exit 0 and check generated artifacts: `build/tokens.css`, `build/tokens.dark.css` (if dark semantic tokens present), and `<stylesRoot>/abstracts/_variables.scss`.
2. **Style Linting**: Run `lint:styles`. Verify exit 0 and absence of stylelint errors.
3. **Sass Compilation**: Run `<pm-exec> sass --no-source-map <stylesRoot>/main.scss build/.main.verify.css`. Verify exit 0, then delete `build/.main.verify.css`.
4. **Formatting Check**: Run `<pm-exec> prettier --check` against created files. Verify all created files comply.
5. **Tier Invariant Audit**: Search `tokens/semantic/` and `tokens/component/` to ensure zero raw `#hex` or `oklch()` literals leak outside `{alias}` strings.
- If verification fails on newly created files, correct them. If pre-existing files fail, report findings without modifying them.
- **Done when**: Steps 1–5 execute and pass with zero errors.

### 7. Report & Handoff
Present summary of completed setup:
- List installed dependencies, scaffolded configurations, and created files.
- Provide the exact import statements for the host application entry (e.g. `main.tsx` or `index.html`):
  1. `import './build/tokens.css';`
  2. `import './build/tokens.dark.css';`
  3. `import './<stylesRoot>/main.scss';`
- Document dark mode activation via `document.documentElement.dataset.theme = 'dark'`.
- Suggest the conventional commit message: `chore(styles): set up token and Sass prerequisites`.
- Hand off to `design-tokens`: prompt the user to invoke `/design-tokens` to customize the palette, contrast ramps, and component tokens.
- **Done when**: Final report is rendered with exact import paths and handoff guidance; no git mutations executed.

---

## Pre-Yield Checklist

Verify these observable states before completing work:
- [ ] Required devDependencies are installed in `package.json` with pinned major ranges.
- [ ] No pre-existing user configuration files were overwritten.
- [ ] `tokens:build` compiles `build/tokens.css` and generates `<stylesRoot>/abstracts/_variables.scss`.
- [ ] `lint:styles` runs cleanly against the Sass 7-1 tree.
- [ ] Sass compiles `<stylesRoot>/main.scss` cleanly without errors or deprecated syntax.
- [ ] No framework application source code was edited without explicit confirmation.
- [ ] Zero git mutations (commit, stage, stash) were executed by the agent.
