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
- **Human presence**: The human is a present participant, never a per-action approver. **Checkpoint** — at a named seam, show evidence or an artifact, state your recommendation and reason, invite a reaction, and pause where the step says so. **Gate** — hard pause; proceeding without the human is unsafe. **Narration** — during deterministic stretches, state findings and results in one batched update per step; never seek confirmation for individual commands or file writes. Never ask the human for a fact you can read; always show the human a judgment you inferred from facts. An instruction to proceed autonomously ("just do it", "don't ask") is an **autonomous opt-out**: state it once, checkpoints become narrated stated-defaults, Gates still pause. A session that cannot receive replies counts as autonomous opt-out; list skipped checkpoints at yield.

---

## Process

### 1. Context Triage
Inspect repository structure before creating or editing files:
- **Codebase Maturity**: Check for existing stylesheets (`.css`, `.scss`, styled-components). In brownfield projects, follow [`references/discovery-and-evidence.md`](references/discovery-and-evidence.md) to inspect baseline contrast debt without modifying files. A missing group is itself a finding ('no styles found — greenfield').
- **Tooling & Setup Detection**: Inspect for `setup-pre-tokens` artifacts (`sd.config.mjs`, `sd.dark.config.mjs`, `tokens/**/*.tokens.json`, `"tokens:build"` in `package.json` scripts). Check for an existing `tokens.config.json`. Detect package manager via lockfiles (`pnpm-lock.yaml` → `pnpm`, `yarn.lock` → `yarn`, `bun.lockb`/`bun.lock` → `bun`, else `npm`). If the conversation contains a `setup-pre-tokens` **Handoff context** block, treat its lines as stated defaults and verify each against disk; disk evidence wins, and any conflict is named in the evidence brief.
- **Engine Availability**: Verify `scripts/token-engine.mjs` exists in the folder containing this loaded `SKILL.md`. If missing, stop and report the skill installation is incomplete — do not hand-author tokens.
- **Runtime & Seam Scoping**: Identify Shadow DOM Web Components (target `:host, :root`), Tailwind v4 (target `@theme`), or standard DOM (target `:root`). Check whether an existing `@tokens` package or bundler alias already exists.
- **Review-Only Requests**: For audit- or review-only tasks with no token mutations requested, run `diagnose` and render per [`references/diagnose-and-report.md`](references/diagnose-and-report.md). After rendering, present the top recommendation in chat and offer exactly two continuations — fix now (leaves review-only mode) or stop at the report; never mutate on a review-only request without that new instruction.
- **Checkpoint (evidence brief)**: State findings as evidence lines (`"<path>: <fact>"`, per [`references/discovery-and-evidence.md`](references/discovery-and-evidence.md)) plus the two calls they feed — greenfield vs brownfield, compiler of record — before Step 2. Pause for correction only when a call is ambiguous (mixed maturity signals, existing tokens with unclear replace-vs-keep posture, review-only vs mutation unclear); otherwise continue into Step 2 with findings as stated defaults.
- **Done when**: The compiler of record is identified (target `tokens:build` if `sd.config.mjs` present, else engine build artifacts, else hand-maintained CSS), engine presence is verified, and the evidence brief has been stated with any ambiguities resolved by the user.

### 2. Socratic Aesthetic Synthesis
Translate brand intent into harmonious OKLCH anchors:
- **Greenfield**: Guide palette selection with mood metaphors and aesthetic clusters. Conduct a structured interview using [`references/palette.md`](references/palette.md) (≤7 questions: asked as one batch, evidence defaults pre-stated, plain-language labels per the palette plain↔technical table; personality adjectives → cluster, primary anchor color, ramp steps [5, 9, 11], typography family + line-height [1.25, 1.5, 1.75], density [`comfortable` vs `compact`], corner radii presets). The pick is confirmed at the palette read-back checkpoint below before recording into `tokens.config.json` matching `assets/tokens.config.example.json`.
- **Brownfield**: Consolidate mined colors into unified functional roles via semantic intent clustering (collapsing drifting hues into purposeful ramps).
  - *Engine extraction*: Run extraction to mine candidate anchors from code, a URL, or an HTML file, consulting [`references/discovery-and-evidence.md`](references/discovery-and-evidence.md) to interpret scoring:
    `node <skill-root>/scripts/token-engine.mjs extract --root . --out tokens.config.json --audit-baseline`
    `node <skill-root>/scripts/token-engine.mjs extract --url <url> --out tokens.config.json`
    `node <skill-root>/scripts/token-engine.mjs extract --html <file.html> --out tokens.config.json`
  - Present the extract **candidate table** before proposing roles: relay the CLI `evidence:` lines (top candidates with source/name), mark the winner and the runners-up it beat, state why the winner won in scoring terms (role-name hits, chroma, recurrence — per [`references/discovery-and-evidence.md`](references/discovery-and-evidence.md)), list every clustering collapse (source colors → functional role) and every stated default (font, radius, density, type ratio). Generation never precedes this table.
- **Checkpoint (palette read-back)**: Read back the whole pick (cluster, role, name, OKLCH, reason; every vibe adjustment with its reason; brownfield: the candidate table verdicts) and pause. The user may approve, veto a winner in favor of a runner-up, or adjust defaults — a veto edits `tokens.config.json` at read-back or re-runs extract with `--force`. Record only after the reaction.
- **Done when**: The user has reacted to the palette read-back (approved or adjusted roles and anchors), or an autonomous opt-out is in effect with the read-back stated as recorded defaults.

**Before running a command:** state the resolved value of `<skill-root>` in your reply, then substitute it. If you cannot resolve it, stop and ask the user for the `design-tokens` skill folder. Never run a command containing literal `<` or `>`.

### 3. Architect Tokens
Construct or replace the 3-tier DTCG token hierarchy:
- **Contract**: Formulate brand decisions in `tokens.config.json` per [`references/token-system.md`](references/token-system.md).
- **Execution**:
  1. **Narration**: state in one line that all tiers regenerate from the recorded spec (`--force` adopts the existing tree); after sync, state the audit outcome and every remediation applied (override path old → new, or anchor old → new).
  2. Run unified sync from the project root:
     `node <skill-root>/scripts/token-engine.mjs sync --spec tokens.config.json --force --out build/engine --theme all`
     *Flags*: `--force` adopts the existing tree and regenerates all tiers from the spec; `--out build/engine` parks advisory artifacts (`tokens.js`, `theme.css`, `DESIGN.md`) safely away from target build files; `--theme all` compiles all themes.
  3. If the project contains `sd.config.mjs`, run the target's build script:
     `<pm> run tokens:build`
     This is the compiler of record for `build/tokens.css`, `build/tokens.dark.css`, and `<stylesRoot>/abstracts/_variables.scss`. If no `sd.config.mjs` exists, the engine output `build/engine/tokens.css` is the compiled record and the import target.
  4. If sync exits 4 at audit, report failing contrast pairs and remediate via [`references/contrast.md`](references/contrast.md) (remediation ladder). Step-move overrides are autonomous and narrated; an anchor shift is a checkpoint — see `contrast.md` ladder step 2. Never pass `--allow-unaudited`.
  5. Targeted subcommands and flag reference are documented in [`references/engine-and-build.md`](references/engine-and-build.md) §6 (or via `node <skill-root>/scripts/token-engine.mjs <cmd> --help`); exit codes follow the 0 ok / 2 usage / 3 refusal / 4 audit fail / 5 validation taxonomy.
- **Done when**: The token tree contains complete feedback roles and component tokens, `build/tokens.css` (via `tokens:build`) or `build/engine/tokens.css` is regenerated, every remediation override/anchor shift has been stated, and marginal pairs (4.5–4.8) are carried to Step 5 — never silently passed.

### 4. Codebase Modernization
Wire tokens into host components:
- **Checkpoint (migration preview)**: Before editing, state the scope — files containing color/spacing literals, literal counts per file, exclusions (generated files, token JSON). Proceed in the same turn when every literal maps unambiguously to a semantic role; pause only for unmapped literals (list them; the user assigns a role or excludes them) or for scope outside the styles/components tree found in Step 1.
- Pierce Shadow DOM boundaries by injecting compiled CSS inline into `:host` scopes.
- In Sass projects, consume generated `$semantic-color-*` and `$component-*` variables. Re-run `npm run tokens:build` after token updates so `abstracts/_variables.scss` stays current.
- Replace hardcoded color literals with semantic custom properties (`background: var(--semantic-color-bg-canvas)`). Consult [`references/token-system.md`](references/token-system.md) for layout-role bindings when replacing spacing literals.
- Establish `@tokens` package aliasing **only** if a workspace tokens package already exists or the user explicitly requests one (`sync --package @tokens`). In standard projects, import directly from `build/tokens.css` (or `build/engine/tokens.css` when `sd.config.mjs` is absent).
- **Narration**: after migrating, state literals migrated per file and every remaining literal with its reason (unmapped, excluded, generated).
- **Done when**: Hardcoded styling literals in host components are migrated to semantic tokens, the migration preview was stated, and every unmapped literal has a recorded disposition (role assigned or excluded by the user, or stated under autonomous opt-out).

### 5. Visual Proof
Generate visual verification through the engine's built-in visualizer:
- Run the visualizer compilation pass:
  `node <skill-root>/scripts/token-engine.mjs build --tokens tokens --out build/engine --theme all --visualizer --force`
- Launch `build/engine/visualizer.html` in the default browser using Bash (`open` on macOS, `start` on Windows, `xdg-open` on Linux). If launch fails, display the absolute path.
- **Checkpoint (visual review)**: Tell the user what to inspect — ramps (anchor at step 500), semantic role badges, typography specimen, component specimens, and any marginal pairs carried from Step 3 — and pause for a reaction. Accept → done. Adjust (color, density, radii, type) → return to the Step 2 read-back (edit `tokens.config.json`), re-run Step 3 sync, regenerate the visualizer, and re-present. Under autonomous opt-out, report the path and note the review was skipped by opt-out.
- If build exits 3 (missing or stale audit stamp), return to Step 3 sync — never pass `--allow-unaudited`.
- **Done when**: `build/engine/visualizer.html` exists, was presented for human review, and the reaction is recorded (accepted, adjustments applied and re-presented, or autonomous opt-out stated).

---

## Pre-Yield Checklist

Verify these observable states before completing work:
- [ ] Raw `#hex` or `rgba()` literals in styled components are migrated to `var(--semantic-color-*)` (or Sass `$` equivalents).
- [ ] Every component token resolves through a semantic token alias.
- [ ] `build/tokens.css` (via `tokens:build`) or `build/engine/tokens.css` was regenerated this run and application stylesheet imports resolve cleanly.
- [ ] `token-engine sync` exited 0 with a verified audit stamp in `tokens/.token-engine-audit.json`.
- [ ] Human reaction to the visualizer is recorded (accepted / adjustments applied / autonomous opt-out stated), and the palette read-back reaction preceded generation.
