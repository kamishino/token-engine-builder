# Skills Evaluation — src/skills

## Scope and method

This document evaluates the seven design-system skills packaged in this repository (`src/skills/`):

1. `ask-kami` (entry router)
2. `token-extract` (alternative entry: evidence-first extraction)
3. `token-style` (Socratic brand discovery interview)
4. `token-math` (deterministic 3-tier DTCG token tree generator)
5. `token-audit` (dual WCAG 2.1 + APCA contrast gatekeeper)
6. `token-build` (Style Dictionary v5 compiler to CSS, Tailwind v4 `@theme`, and 8 UI profiles)
7. `improve-design-system` (diagnostic review and visual HTML report)

- **Evaluation date:** 2026-10-21
- **Files audited:** all seven `SKILL.md` files, all seven per-skill `README.md` files, all seven `agents/openai.yaml` manifests, `.claude/plugin.json`, `ask-kami/references/routing-table.md`, cross-skill reference targets (`style-clusters.md`, `color-architecture.md`, `scales.md`, `style-spec.example.json`), `scripts/build-engine.mjs`, `vite.config.ts`, `AGENTS.md`, and top-level `README.md`.
- **Command verification:** executed full clean repo validation (`npm run check`), verifying `typecheck`, `lint`, `lint:skills`, `test` (141 tests), `build` (7 bundled scripts across 6 skills), and `lint:css` (zero gold drift).
- **Scope constraint:** this evaluation makes no source-code changes. The command run wrote only to gitignored `dist/`. The actionable execution spec for remediating all findings is catalogued separately in `local://skills-fix-plan.md`.

## Executive summary

The audit identified **ten total findings**: four High severity, four Medium severity, and two Low severity.

The top four architectural issues are:

1. **Command path ambiguity (H1):** Agent instructions specify `node ./scripts/...`, but user inputs are cwd-relative. No single working directory allows both the script and its input/output flags to resolve when running from a consumer project.
2. **Cross-skill file coupling (H2):** Four separate file paths reach into sibling skill folders (`token-style/references/...`, `../token-style/assets/...`, `token-math/references/...`), breaking the foundational architecture invariant that each `dist/<skill>/` runs standalone after copy.
3. **Invocation model conflict (H3):** OpenAI manifests (`agents/openai.yaml`) disable implicit invocation across all seven skills, whereas Claude frontmatter lacks `disable-model-invocation: true`. Descriptions are model-facing trigger lists, creating divergent activation semantics across hosts.
4. **Install path mismatch (H4):** Documentation and per-skill READMEs instruct copying to or running from `~/agents/skills` (without a leading dot), whereas `scripts/link-skills.mjs` and host runtimes expect `~/.agents/skills` (with a dot).

**Invocation recommendation:** adopt a **Mixed** model where entry routers and diagnostic review (`ask-kami`, `improve-design-system`) are strictly user-invoked, while deterministic pipeline stages (`token-extract`, `token-style`, `token-math`, `token-audit`, `token-build`) are model-invoked with parity across Claude Code and OpenAI Agent runtimes.

---

## Findings

### H1 — Agent-facing CLI invocations assume contradictory working directories (High)

- **Evidence:**
  - `src/skills/ask-kami/SKILL.md:24`: `node ./scripts/route.mjs --root .`
  - `src/skills/ask-kami/references/routing-table.md:9-15`: `node ./scripts/extract.mjs ...`, `node ./scripts/generate.mjs ...`, `node ./scripts/audit.mjs ...`, `node ./scripts/build.mjs ...`, `node ./scripts/diagnose.mjs ...`
  - `src/skills/token-extract/SKILL.md:18-21`: `node ./scripts/extract.mjs --root . --out style-spec.json`
  - `src/skills/token-math/SKILL.md:18`: `node ./scripts/generate.mjs --spec style-spec.json --out tokens`
  - `src/skills/token-audit/SKILL.md:18`: `node ./scripts/audit.mjs --tokens tokens --min-ratio 4.5`
  - `src/skills/token-build/SKILL.md:18-20,37-40`: `node ./scripts/build.mjs --tokens tokens --out build --theme light`, `node ./scripts/figma.mjs ...`
  - `src/skills/improve-design-system/SKILL.md:24`: `node ./scripts/diagnose.mjs --root .`
  - Per-skill READMEs conversely document the deployed absolute pattern: `node ~/agents/skills/<skill>/scripts/<script>.mjs` (e.g. `src/skills/token-math/README.md:16`).
- **Why it matters:** Agent skills are invoked while the agent is operating within a consumer's project directory. If the agent executes `node ./scripts/generate.mjs`, Node looks for `./scripts/` in the consumer's repository, which does not exist. If the agent changes working directory to the skill folder to satisfy `./scripts`, all input/output flags (`--spec style-spec.json`, `--out tokens`, `--root .`) resolve against the skill package itself instead of the consumer project.
- **Verification nature:** Static structural fact confirmed by path resolution inspection in `src/shared/paths.ts` (`fromCwd` binds to `process.cwd()`).
- **Recommended fix:** Standardize all agent instructions in `SKILL.md` and `routing-table.md` to reference the canonical installed script path: `node ~/.agents/skills/<skill>/scripts/<script>.mjs`. Explicitly document the cwd contract once per skill: `"Run commands from the user's project root; ~/.agents/skills/<skill> is this skill's installed directory."`

---

### H2 — Cross-skill file references break standalone package isolation (High)

- **Evidence:**
  - `src/skills/token-extract/SKILL.md:27`: `Resolve the Kobayashi cluster the anchor falls in (token-style/references/style-clusters.md) and record cluster in the spec.`
  - `src/skills/token-style/SKILL.md:25`: `from the cluster bounds and the harmony guidance in token-math/references/color-architecture.md, pick 3–5 colors...`
  - `src/skills/token-math/SKILL.md:29`: `Input contract: the StyleSpec JSON consumed by scripts/generate.mjs; see ../token-style/assets/style-spec.example.json for the canonical example.`
  - `src/skills/token-math/README.md:19`: `see ../token-style/assets/style-spec.example.json`
  - `src/skills/token-math/references/scales.md:35`: `- Radius: spec-driven (sm/md/lg/full); character presets in token-style/references/design-mappings.md.`
- **Why it matters:** `ARCHITECTURE.md` §1 and `README.md` explicitly guarantee that each skill folder under `dist/<skill>/` is standalone and runs independently after being copied into an agent skills directory. When a user installs only `token-extract` or `token-math`, relative paths targeting sibling folders (`token-style/references/` or `../token-style/assets/`) fail with unresolvable file errors.
- **Verification nature:** Static filesystem and link audit. `syncSkillPackages` in `scripts/build-engine.mjs` copies `references/` and `assets/` only within the boundaries of each individual skill directory.
- **Recommended fix:**
  1. Remove cluster resolution from `token-extract/SKILL.md:27`; hand off the candidate anchor directly to `token-style`, which owns aesthetic cluster classification.
  2. Copy `color-architecture.md` into `src/skills/token-style/references/` so `token-style` owns its palette selection guidance locally.
  3. Copy `style-spec.example.json` into `src/skills/token-math/assets/` and point `token-math/SKILL.md:29` and `README.md:19` to its local asset.
  4. Inline the radius character presets (`sharp 2/4/8`, `soft 4/8/16`, `round 8/16/24`) directly into `token-math/references/scales.md:35`.

---

### H3 — Invocation models diverge between Claude Code and OpenAI Agent runtimes (High)

- **Evidence:**
  - `src/skills/*/agents/openai.yaml:4-5` in all 7 skills:
    ```yaml
    policy:
      allow_implicit_invocation: false
    ```
  - `src/skills/*/SKILL.md:1-6` in all 7 skills: frontmatter omits `disable-model-invocation: true`.
  - All 7 `SKILL.md` descriptions use pushy, model-facing trigger phrasing: `"Use when starting a design system..."`, `"Use when the user asks where to start..."`, `"Use after generating or editing tokens..."`.
- **Why it matters:** In Claude Code, omitting `disable-model-invocation: true` means every skill is model-invoked and loaded into the model's auto-callable tool registry. In OpenAI Agent / Codex environments, `allow_implicit_invocation: false` prohibits autonomous invocation, turning every skill into a user-typed command. Furthermore, human-invoked skills should have concise, trigger-free descriptions to minimize context load, whereas model-invoked skills require trigger keywords. Having opposite settings across hosts breaks predictable agent orchestration.
- **Verification nature:** Static manifest inspection compared against the specification rules defined in `docs/research/matt-pocock-skills-architecture.md` §2 and `docs/research/skills-architecture-comparison.md` §1.
- **Recommended fix:** Align hosts around the **Mixed** model:
  - Mark `ask-kami` and `improve-design-system` as user-invoked in both runtimes: add `disable-model-invocation: true` to their `SKILL.md` frontmatter, retain `policy.allow_implicit_invocation: false` in `agents/openai.yaml`, and condense descriptions to human-facing command summaries.
  - Mark `token-extract`, `token-style`, `token-math`, `token-audit`, and `token-build` as model-invoked: delete the `policy:` block from their `agents/openai.yaml` manifests and retain their trigger-rich `SKILL.md` descriptions.

---

### H4 — Install path documentation omits leading dot required by deploy toolchain (High)

- **Evidence:**
  - `README.md:5`: `copy that folder to ~/agents/skills/<skill-name>/`
  - `AGENTS.md:7`: `Each skill is standalone after copy to ~/agents/skills/<skill>/`
  - `src/skills/*/README.md`: all install commands state `cp -r dist/<skill> ~/agents/skills/<skill>`
  - `scripts/link-skills.mjs:4`: documentation header specifies `(default ~/.agents/skills)`
  - `README.md:59,76` and `AGENTS.md:24`: deploy commands state `junction-link dist/* into ~/.agents/skills`
- **Why it matters:** Users following manual install instructions in `README.md` or per-skill `README.md` files copy artifacts into `~/agents/skills/` (a visible folder in `$HOME`). However, the automated deployment toolchain (`npm run deploy` via `scripts/link-skills.mjs`), host agent discoverers (e.g. Claude Code, Codex, Skills Protocol), and standard conventions look in `~/.agents/skills/` (a dotfile directory in `$HOME`). Following the written documentation results in skills failing to load because they sit in the wrong directory.
- **Verification nature:** Grep and script header comparison against `scripts/link-skills.mjs`.
- **Recommended fix:** Standardize all documentation, `AGENTS.md`, and per-skill `README.md` files on the canonical path: `~/.agents/skills/<skill>`. Ensure all H1 script path remediations target `~/.agents/skills/`.

---

### M1 — `token-style` interview contract is internally contradictory and tool-coupled (Medium)

- **Evidence:**
  - `src/skills/token-style/SKILL.md:17`: `2. **Interview** (native ask, one batch, ≤5 questions; unanswered = recommended default, stated aloud):`
  - `src/skills/token-style/SKILL.md:18-23`: enumerates seven distinct question bullets (1: brand personality cluster, 2: primary anchor color, 3: ramp steps count, 4: typography font and scale ratio, 5: base line-height vertical rhythm, 6: spacing density, 7: corner radii presets).
  - `src/skills/token-style/SKILL.md:6`: `allowed-tools: 'Ask Read Write'`
- **Why it matters:** Stating a strict limit of `"≤5 questions"` while listing seven mandatory question dimensions creates model confusion. In practice, models either drop crucial styling parameters (e.g. skipping base line-height or density) or violate the explicit five-question constraint. Furthermore, binding to `"native ask"` and `allowed-tools: 'Ask'` is non-portable across harnesses that lack a structured question tool or call it `AskUserQuestion`.
- **Verification nature:** Textual contradiction in `src/skills/token-style/SKILL.md`.
- **Recommended fix:** Update step 2 to allow up to seven questions (`"one batch, ≤7 questions; split into two batches only when the host's question tool caps the batch; use the host's question tool if available, otherwise ask in chat"`). Change `allowed-tools` to `'Read Write'`, decoupling the skill from proprietary question-tool naming while keeping chat as the universally functional baseline.

---

### M2 — Handoff completion criteria depend on downstream skill execution (Medium)

- **Evidence:**
  - `src/skills/token-extract/SKILL.md:29-30`: `3. **Hand off** to token-math (generate.mjs --spec style-spec.json)... - Done when: token-math has generated from the confirmed spec.`
  - `src/skills/token-math/SKILL.md:26-27`: `3. **Hand off** to token-audit before building anything. - Done when: audit has been run against this exact tokens/ tree.`
- **Why it matters:** A completion criterion (`Done when:`) must evaluate whether the current skill completed its own task. Setting the done condition to the _completion of the subsequent skill_ forces the agent to either prematurely claim a future task succeeded or overstep boundaries by autonomously executing downstream scripts before yielding to the user.
- **Verification nature:** Agent behavior anti-pattern identified by `docs/research/skill-md-best-practices.md` §3.
- **Recommended fix:** Bound completion criteria strictly to the skill's own deliverable:
  - `token-extract`: Done when the user has confirmed or overridden the anchor and the next-step command is presented.
  - `token-math`: Done when exit 0, files exist, and the user has the exact `token-audit` command.

---

### M3 — `token-build` verification criterion omits specified spot-checks (Medium)

- **Evidence:**
  - `src/skills/token-build/SKILL.md:26`: Step 2 instructs the agent: `Spot-check that components.md contains ## button and ## Composite patterns sections.`
  - `src/skills/token-build/SKILL.md:27`: `Done when: exit 0 and all expected output files exist and are non-empty.` (identical to Step 1's done condition at line 24).
- **Why it matters:** The completion criterion fails to reflect the qualitative verification rule described in the step body. An agent following `Done when:` strictly can verify that `components.md` exists and immediately exit, bypassing the verification of the button and composite pattern documentation sections.
- **Verification nature:** Inspection of `src/skills/token-build/SKILL.md:24-27`.
- **Recommended fix:** Update Step 2's criterion to: `Done when: exit 0, all expected output files exist and are non-empty, and components.md contains both ## button and ## Composite patterns.`

---

### M4 — Router and handoff commands reference incorrect script locations and flags (Medium)

- **Evidence:**
  - `src/skills/ask-kami/references/routing-table.md:9-15`: lists commands as `./scripts/extract.mjs`, `./scripts/generate.mjs`, `./scripts/audit.mjs`, `./scripts/build.mjs`, `./scripts/diagnose.mjs`. The router skill directory `ask-kami/scripts/` contains only `route.mjs`.
  - `src/skills/token-style/SKILL.md:30`: `generate.mjs --spec style-spec.json` (omits script path and `--out tokens`).
  - `src/skills/token-extract/SKILL.md:29-30`: hands off directly to `token-math`, skipping the required read-back in `token-style` mandated by `token-extract/README.md:24`.
  - `src/skills/token-math/SKILL.md:26`: hands off to `token-audit` with no command string.
- **Why it matters:** A central promise of `ask-kami` and the pipeline handoffs is providing the user with exact, copy-pasteable commands. Handing off incomplete command snippets (`generate.mjs` without path or required `--out`) or paths that assume all scripts sit in the router's local folder causes execution failures.
- **Verification nature:** Cross-file script audit across `src/skills/*/scripts/` and `routing-table.md`.
- **Recommended fix:**
  1. Update `routing-table.md` commands to use canonical installed paths: `node ~/.agents/skills/<owning-skill>/scripts/<script>.mjs` with all mandatory flags (`--out tokens`, `--tokens tokens`, `--min-ratio 4.5`, etc.).
  2. In `token-style/SKILL.md:30`, provide the complete command: `node ~/.agents/skills/token-math/scripts/generate.mjs --spec style-spec.json --out tokens`.
  3. Delete `token-extract/SKILL.md:29-30` (the premature `token-math` handoff); Step 2 already correctly hands off to `token-style` for confirmation.
  4. In `token-math/SKILL.md:26`, provide the full audit command: `node ~/.agents/skills/token-audit/scripts/audit.mjs --tokens tokens --min-ratio 4.5`.

---

### L1 — Package synchronization documentation omits copied asset directories (Low)

- **Evidence:**
  - `AGENTS.md:7`: `(SKILL.md + templates/ + assets/ mirror, chmod 0o755)`
  - `vite.config.ts:13`: `SKILL.md + templates/ + assets/ + examples/ copied verbatim; bundled scripts made executable.`
  - `scripts/build-engine.mjs:30`:
    ```javascript
    for (const dir of ['templates', 'assets', 'examples', 'references', 'agents']) {
      const from = join(src, dir);
      if (existsSync(from)) cpSync(from, join(dest, dir), { recursive: true });
    }
    ```
- **Why it matters:** `scripts/build-engine.mjs` correctly packages five directories (`templates`, `assets`, `examples`, `references`, `agents`). However, the onboarding documentation in `AGENTS.md` and the plugin comments in `vite.config.ts` describe an older, partial list that omits `references/` and `agents/`. Maintainers reading `AGENTS.md` may believe reference files are not copied into `dist/`.
- **Verification nature:** Code comparison between `vite.config.ts`, `AGENTS.md`, and `scripts/build-engine.mjs`.
- **Recommended fix:** Update `AGENTS.md` and `vite.config.ts` to document that `templates/`, `assets/`, `examples/`, `references/`, and `agents/` are mirrored into `dist/`.

---

### L2 — Research documents contain stale historical skill counts and assertions (Low)

- **Evidence:**
  - `docs/research/skills-architecture-comparison.md:33`: `src/skills/ holds four pipeline skills with no bucket/plugin/promotion layer...`
  - `docs/research/skills-architecture-comparison.md:34`: `Our skills carry neither marker...` (claims no `allowed-tools` or `agents/openai.yaml` exist).
  - `docs/research/skills-architecture-comparison.md:37`: `Our verification gate is explicitly "smoke, not tests" with no test suite...`
  - `docs/research/skill-md-best-practices.md:35`: `there is no references/ dir...`
- **Why it matters:** These research notes were written early in the project lifecycle (prior to the addition of `ask-kami`, `token-extract`, `improve-design-system`, the 141-test suite, and `agents/openai.yaml`). While historical notes are expected to age, unannotated claims that the repository has "no test suite" and "four skills" mislead engineers reviewing architecture history.
- **Verification nature:** Comparison of `docs/research/` against current repository structure.
- **Recommended fix:** Add a standard markdown blockquote header to `skills-architecture-comparison.md` and `skill-md-best-practices.md`:
  `> **Historical note:** This research note records architectural comparisons from v0.3.0–v0.4.0 (4 skills, pre-test-suite). See README.md and ARCHITECTURE.md for current system status.`

---

## Recommended invocation split

To reconcile the High-severity conflict between `SKILL.md` descriptions and `agents/openai.yaml` (Finding H3), the repository should implement the following **Mixed** configuration:

| Skill                   | Invocation Mode   | `SKILL.md` Frontmatter & Description                                                                                                                                      | `agents/openai.yaml` Policy                                 | Rationale                                                                                                                  |
| ----------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `ask-kami`              | **User-invoked**  | `disable-model-invocation: true`<br>`description: 'Design-system entry router: detect spec, tokens, audit, and build state, then name the next skill and exact command.'` | `policy:`<br>&nbsp;&nbsp;`allow_implicit_invocation: false` | Entry router. Should activate only when the human explicitly asks for system orientation, never unprompted during coding.  |
| `improve-design-system` | **User-invoked**  | `disable-model-invocation: true`<br>`description: 'Review a design system, find gaps, and write a self-contained HTML report with resolution steps.'`                     | `policy:`<br>&nbsp;&nbsp;`allow_implicit_invocation: false` | Diagnostic audit and HTML report generator. Heavyweight inspection triggered intentionally by the user.                    |
| `token-extract`         | **Model-invoked** | Omit `disable-model-invocation`<br>Keep trigger description (`Use when a product already has colors/fonts in code...`)                                                    | Omit `policy:` block entirely                               | Alternative entrypoint. The agent should autonomously suggest extracting tokens when examining existing CSS/Tailwind code. |
| `token-style`           | **Model-invoked** | Omit `disable-model-invocation`<br>Keep trigger description (`Use when starting a design system...`)                                                                      | Omit `policy:` block entirely                               | Greenfield entrypoint. The agent should autonomously suggest brand discovery when no spec exists.                          |
| `token-math`            | **Model-invoked** | Omit `disable-model-invocation`<br>Keep trigger description (`Use when the spec exists and tokens/ is missing...`)                                                        | Omit `policy:` block entirely                               | Pipeline worker. The agent should reach for mathematical derivation as soon as a `style-spec.json` is ready.               |
| `token-audit`           | **Model-invoked** | Omit `disable-model-invocation`<br>Keep trigger description (`Use after generating or editing tokens...`)                                                                 | Omit `policy:` block entirely                               | Mandatory gatekeeper. The agent should automatically audit contrast after generating or modifying tokens.                  |
| `token-build`           | **Model-invoked** | Omit `disable-model-invocation`<br>Keep trigger description (`Use when audit passes and CSS/Tailwind output is needed.`)                                                  | Omit `policy:` block entirely                               | Output compiler. The agent should compile CSS once audit passes.                                                           |

---

## Verification

### Automated toolchain check (`npm run check`)

Executed live on 2026-10-21 against Node `v22.12.0`:

| Stage          | Command                          |  Result  | Notes                                                                      |
| -------------- | -------------------------------- | :------: | -------------------------------------------------------------------------- |
| **Typecheck**  | `tsc --noEmit`                   | **PASS** | 0 type errors across `src/shared/`, `src/skills/`, and `scripts/`.         |
| **Lint**       | `eslint .`                       | **PASS** | 0 ESLint warnings/errors; `colorjs.io/fn` partial import rule satisfied.   |
| **Skill Lint** | `node scripts/lint-skills.mjs`   | **PASS** | Frontmatter blocks, prose forbidden literals, and CLI flag parity pass.    |
| **Unit Tests** | `node --test test/**/*.test.mjs` | **PASS** | **141/141 passing** (0 failures, 0 skipped, runtime ~3.95s).               |
| **Build**      | `node scripts/build-all.mjs`     | **PASS** | 7 standalone scripts bundled across 6 skills to `dist/`.                   |
| **CSS Smoke**  | `node scripts/sample-css.mjs`    | **PASS** | Emitted CSS across 10 profiles passes Stylelint and matches gold fixtures. |

### Static grep verification

1. **Relative script references (H1):**

   ```bash
   grep -R "node ./scripts" src/skills
   ```

   _Matches:_ 11 total instances across `ask-kami/SKILL.md`, `routing-table.md`, `token-extract/SKILL.md`, `token-math/SKILL.md`, `token-audit/SKILL.md`, `token-build/SKILL.md`, and `improve-design-system/SKILL.md`.

2. **Cross-skill relative paths (H2):**

   ```bash
   grep -R -E "(token-style|token-math|token-audit|token-build|token-extract|ask-kami|improve-design-system)/(references|assets|scripts)/|\.\./token-" src/skills
   ```

   _Matches:_ exactly 4 cross-skill relative links (`token-extract/SKILL.md:27`, `token-style/SKILL.md:25`, `token-math/SKILL.md:29`, `token-math/references/scales.md:35`).

3. **Invocation policy divergence (H3):**
   ```bash
   grep -R -E "allow_implicit_invocation|disable-model-invocation" src/skills
   ```
   _Matches:_ exactly 7 instances of `allow_implicit_invocation: false` in `src/skills/*/agents/openai.yaml`; 0 instances of `disable-model-invocation` in `src/skills/*/SKILL.md`.

### Areas not verified in this run

- **Trigger evaluation benchmarking:** No trigger eval suite exists under `test/` to empirically test model activation rates against near-miss user queries.
- **Full scenario smoke harness:** `npm run smoke` (`scripts/smoke-all.mjs`, running 39 end-to-end integration scenarios) was not run in this evaluation turn (the full `npm run check` pipeline was executed instead).
- **Interactive runtime simulation:** Skills were evaluated against static contracts and automated builds; live interactive dialogue testing of `token-style` with a human was not conducted.

---

## Prioritized fix order

Remediations should be implemented in four logical tiers:

1. **P0 — Package integrity and execution correctness (Immediate):**
   - **H1:** Change all `node ./scripts/<name>.mjs` commands to `node ~/.agents/skills/<skill>/scripts/<name>.mjs`.
   - **H2:** Eliminate the four cross-skill reference paths; localize assets and delegate read-back cleanly.
   - **H4:** Standardize all docs, `AGENTS.md`, and per-skill READMEs on `~/.agents/skills/`.
   - **M4:** Update `ask-kami/references/routing-table.md` commands to use owning skill paths and full flags. Remove premature `token-math` handoff from `token-extract`.

2. **P1 — Invocation alignment and interview contract:**
   - **H3:** Apply the recommended Mixed invocation split across `SKILL.md` and `agents/openai.yaml`.
   - **M1:** Rationalize `token-style` question batching to `≤7 questions` and change `allowed-tools` to `'Read Write'`.

3. **P2 — Completion criteria and verification accuracy:**
   - **M2:** Reframe `token-extract` and `token-math` handoff completion criteria around skill deliverable handoff.
   - **M3:** Require `components.md` button and composite pattern spot-checks in `token-build` Step 2 `Done when:`.
   - Add explicit `Done when:` criteria for `ask-kami` state detection and `improve-design-system` evidence gathering.

4. **P3 — Documentation maintenance:**
   - **L1:** Update `AGENTS.md`, `vite.config.ts`, and top-level `README.md` to document that `references/`, `examples/`, and `agents/` are bundled.
   - **L2:** Add historical context blockquotes to early research notes.
