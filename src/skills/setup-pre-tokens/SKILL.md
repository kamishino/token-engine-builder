---
name: setup-pre-tokens
description: "Set up a project's token/CSS prerequisites: formatter, Stylelint, Style Dictionary, Sass 7-1 + BEM, and 3-tier token seeds. Hand-invoked only; run before design-tokens."
license: MIT
compatibility: ">=node-22.12"
allowed-tools: "Bash Read Write Edit Glob Grep"
disable-model-invocation: true
---

# Setup Pre-Tokens

Prepare a frontend project with self-sufficient token and CSS prerequisites so `tokens:build` passes out-of-the-box, establishing the token foundation `design-tokens` then authors brand decisions on.

## Architecture: Seams and Decoupling

Treat the prerequisite foundation as a zero-decision mechanical substrate:
- **Interface & Implementation**: The `tokens:build` and `lint:styles` scripts, entry outputs (`build/tokens.css`, `build/tokens.dark.css`, `<stylesRoot>/main.scss`), pinned devDependencies, and Sass 7-1 module architecture (`@use`).
- **Seam**: This skill authors no brand decisions; it scaffolds the canonical default 3-tier token system, and `design-tokens` rebrands its values from `tokens.config.json`.
- **Locality & Leverage**: Centralize token compilation inside the target project, making it self-contained without external toolchain assumptions.

Consult sibling references on demand:
- [`references/detection-and-defaults.md`](references/detection-and-defaults.md): Triage detection matrix, installed evidence signatures, and pinned default packages.
- [`references/sass-7-1-bem.md`](references/sass-7-1-bem.md): Sass 7-1 folder roles, modern `@use` composition rules, and BEM selector conventions.
- [`references/fowler-tier-mapping.md`](references/fowler-tier-mapping.md): Mapping Martin Fowler's Option/Decision/Component model to repository DTCG canon.
- [`references/fork-biome.md`](references/fork-biome.md): Instructions and config delta when substituting Biome for Prettier.
- [`references/fork-terrazzo.md`](references/fork-terrazzo.md): Instructions and config delta when substituting Terrazzo for Style Dictionary v5.
- [`references/fork-css-transformers.md`](references/fork-css-transformers.md): Setup recipes for optional Lightning CSS or PostCSS integration.
- [`references/fork-css-architectures.md`](references/fork-css-architectures.md): Scaffolding instructions for ITCSS, Utility-First (Tailwind v4), or SMACSS.

---

## Process

### 1. Silent Triage
Inspect the project root (`process.cwd()`) before proposing changes:
- Verify `package.json` exists. If missing, stop and tell the user: "No package.json found — initialize the project first (e.g. `npm init` or your framework's create command), then re-invoke setup-pre-tokens."
- Detect the package manager and audit every toolchain slot per [`references/detection-and-defaults.md`](references/detection-and-defaults.md) (§1 slot matrix, §2 lockfile precedence). If `.pnp.cjs` exists, stop and report Yarn PnP as unsupported.
- Check for workspace root definitions (`workspaces` in `package.json`, `pnpm-workspace.yaml`, `lerna.json`, `nx.json`, `turbo.json`) to select workspace install flags.
- Record `node --version` and include it in the step-2 plan.
- Inspect working tree status with `git status --porcelain` if git is initialized; record uncommitted file presence for the confirmation note.
- **Done when**: Every toolchain slot is classified present or missing, with exact evidence paths identified.

### 2. Single-Touch Plan + Confirmation
Present ONE consolidated execution plan and await user confirmation:
- Enumerate missing slots with pre-selected defaults and switch keywords: Formatter: Prettier + Stylelint (reply `biome` to switch), Token Compiler: Style Dictionary (reply `terrazzo`), CSS Transformer: none (reply `lightning` or `postcss`), CSS Architecture: Sass 7-1 + BEM (reply `itcss`, `tailwind`, or `smacss`).
- List exact packages to install with pinned majors (`style-dictionary@^5`, `prettier@^3`, `stylelint@^17`, `sass@^1`, `stylelint-config-standard-scss@^17`, `postcss-scss@^4`).
- List every file to be created or modified (including `package.json` scripts and the git-dirtiness note from step 1 when the tree is dirty).
- Explicitly declare safety rules: existing configuration files are never overwritten; no git operations (commit, stage, stash) are performed.
- If existing rival tools are detected (e.g. both Prettier and Biome configs), preserve both, defer to the tool referenced in existing npm scripts, and prompt only if unreferenced.
- **Done when**: User responds with confirmation (any requested slot overrides in the reply are incorporated into the plan).

### 3. Install Dependencies
Execute package installation using the detected package manager:
- Run the detected package manager's install command from [`references/detection-and-defaults.md`](references/detection-and-defaults.md) §2 (workspace flag when step 1 found a workspace root) — one invocation covering all confirmed packages.
- On installation failure, halt immediately: display the command output verbatim, do not modify files, and do not retry with `--force` or `--legacy-peer-deps`.
- **Done when**: All confirmed packages appear in `package.json` `devDependencies` and the lockfile is updated.

### 4. Write Configs & Scripts
Scaffold missing tooling configurations and wire npm scripts:
- Copy config templates from `templates/configs/` relative to the skill directory, replacing `__STYLES_ROOT__` with the resolved styles directory (styles root resolved per [`references/detection-and-defaults.md`](references/detection-and-defaults.md) §3):
  - `.prettierrc.json` (if missing) and append missing entries to `.prettierignore` (`build/`, `__STYLES_ROOT__/abstracts/_variables.scss`).
  - `stylelint.config.mjs` (if missing).
  - `sd.config.mjs` (if missing). If dark semantic tokens exist or seeds are being scaffolded, also write `sd.dark.config.mjs`. If an existing Style Dictionary config is detected under another name, preserve it and target it in the build script without writing templates.
- Add missing scripts to `package.json` without overwriting existing entries:
  - `"tokens:build"`: `"style-dictionary build --config sd.config.mjs && style-dictionary build --config sd.dark.config.mjs"` (omit the dark command when dark tokens are absent).
  - `"lint:styles"`: `"stylelint \"__STYLES_ROOT__/**/*.scss\""`
  - `"format"`: `"prettier --write ."`
  - `"format:check"`: `"prettier --check ."`
- Forks confirmed in step 2 replace the payloads and scripts above per their reference, loaded now: Biome → [`references/fork-biome.md`](references/fork-biome.md); Terrazzo → [`references/fork-terrazzo.md`](references/fork-terrazzo.md) (no `sd.config` templates); transformer → [`references/fork-css-transformers.md`](references/fork-css-transformers.md); ITCSS/Tailwind/SMACSS → [`references/fork-css-architectures.md`](references/fork-css-architectures.md) (CSS stylelint config, CSS lint glob, `sd.config.mjs` without `scssAliases` where documented).
- **Done when**: All required configs exist on disk and `package.json` contains valid scripts.

### 5. Scaffold Tokens & Styles
Populate initial 3-tier token seeds and Sass 7-1 architecture:
- **Tokens**: If `tokens/` is absent or contains no `*.tokens.json` files, copy `templates/tokens/**` to `tokens/` (full canonical defaults: primitive ramps incl. feedback, semantic `light`/`dark`/`high-contrast`, 9 component files). If tokens already exist, leave them untouched.
- **Sass 7-1**: Scaffold `<stylesRoot>/` directories (`abstracts/`, `base/`, `components/`, `layout/`, `pages/`, `themes/`, `vendors/`). Each folder receives an `_index.scss`. Seed partials: `base/_reset.scss`, `base/_typography.scss`, `components/_button.scss`, `abstracts/_mixins.scss`, and the root entry `<stylesRoot>/main.scss`. For ITCSS, Tailwind, or SMACSS, scaffold the folder/entry structure from [`references/fork-css-architectures.md`](references/fork-css-architectures.md) instead of `templates/styles/`.
- Copy `templates/target-README.md` to `<stylesRoot>/README.md` if missing.
- **Done when**: Token and stylesheet directories contain the complete structure without overwriting pre-existing user files.

### 6. Build and Verify
Execute verification pipeline using the detected package manager (`<pm> run <script>`):
1. **Token Compilation**: Run `tokens:build`. Verify exit 0 and check generated artifacts: `build/tokens.css`, `build/tokens.dark.css` (if dark semantic tokens present), and `<stylesRoot>/abstracts/_variables.scss`.
2. **Style Linting**: Run `lint:styles`. Verify exit 0 and absence of stylelint errors.
3. **Sass Compilation**: Run `<pm-exec> sass --no-source-map <stylesRoot>/main.scss build/.main.verify.css`. Verify exit 0, then delete `build/.main.verify.css`.
4. **Formatting Check**: `<pm-exec> prettier --check` (or `biome check` on the Biome fork) against created files. Verify all created files comply.
5. **Tier Invariant Audit**: grep `tokens/semantic/` and `tokens/component/` for `oklch\(|#[0-9a-fA-F]{3,8}|[0-9](px|rem)` outside `"{…}"` alias strings — expect zero hits.
- If verification fails on newly created files, correct them. If pre-existing files fail, report findings without modifying them.
- **Done when**: Checks 1–5 execute and pass with zero errors, or the failure is reported with output.

### 7. Report & Handoff
Present summary of completed setup:
- List installed / kept / created / skipped with reasons.
- Give the entry imports as root-relative paths in order — `build/tokens.css`, `build/tokens.dark.css`, `<stylesRoot>/main.scss` — plus one worked example computed from the detected entry file's location (entry at `src/main.*` with styles root `src/styles`: `import '../build/tokens.css'; import '../build/tokens.dark.css'; import './styles/main.scss';`). Compute every specifier relative to the actual entry file; create the entry files only, never edit framework entry files.
- Document dark mode activation via `document.documentElement.dataset.theme = 'dark'`.
- Suggest the conventional commit message: `chore(styles): set up token and Sass prerequisites`.
- Hand off to `design-tokens`: prompt the user to invoke `/design-tokens` to customize the palette, contrast ramps, and component tokens.
- **Done when**: Final report is rendered with exact import paths and handoff guidance; no git mutations executed.

---

## Pre-Yield Checklist

Verify these observable states before completing work:
- [ ] Required devDependencies are installed in `package.json` with pinned major ranges.
- [ ] No pre-existing user configuration files were overwritten.
- [ ] `tokens:build` compiles `build/tokens.css` (+ `build/tokens.dark.css` when dark tokens exist) and generates `<stylesRoot>/abstracts/_variables.scss`.
- [ ] `lint:styles` runs cleanly against the stylesheet tree.
- [ ] Sass compiles `<stylesRoot>/main.scss` cleanly without errors or deprecated syntax.
- [ ] Format check on created files passes.
- [ ] Tier grep returns zero hits outside primitive ramps.
- [ ] No framework application source code was edited (sole exception: Vite `css.transformer` when the Lightning fork was confirmed).
- [ ] Zero git mutations (commit, stage, stash) were executed by the agent.
