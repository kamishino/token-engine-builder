---
title: Skill Update Smoke Evaluation Report — Canonical Templates & Visualizer (f748e51)
date: 2026-10-27
author: AI Coding Assistant (omp)
evaluated-skill: design-tokens
setup-skill: setup-pre-tokens
evaluated-commit: f748e51
cli-engine: token-engine
status: verified
tags: [design-tokens, setup-pre-tokens, dtcg, smoke-test, visualizer, agent-experience]
---

# Skill Update Smoke Evaluation Report: Canonical 3-Tier Templates & Visualizer

## Executive Summary

Following commit `f748e51` (`feat(tokens): unify 3-tier template canon and elevate visualizer`), we designed, implemented, and executed a comprehensive smoke evaluation suite to validate the updated skills architecture. The update eliminated the divergent starter seeds by establishing a single canonical 3-tier DTCG token hierarchy under `src/shared/templates/tokens/` mirrored into both `design-tokens` and `setup-pre-tokens`, elevated the standalone HTML visualizer with live typography specimens and reverse-mapped semantic role badges, and aligned CLI flag registries with user documentation.

### Key Performance Indicators

- **Overall Suite Verdict:** **100% PASS** across all verification gates and smoke scenarios.
- **Harness Integration Coverage:** **44 / 44 scenarios passing** in `scripts/smoke-all.mjs` (+3 net new scenarios `P4`, `S2`, `A7`; +2 strengthened scenarios `P1`, `B5`).
- **Autonomous Agent Journey:** **40 / 40 assertions passing** in `scripts/smoke-design-tokens.mjs` across 6 lifecycle phases in **2,776ms**.
- **Static Skill Contract Verification:** **2 / 2 skills (7 CLI commands)** passing in `scripts/smoke-skill-contract.mjs`.
- **Unit & Build Regression Gate:** **183 / 183 tests passing**, 0 gold CSS differences, 0 Stylelint errors (`npm run check` in 21.64s).
- **Template Byte Parity:** **20 / 20 token files (100%)** byte-for-byte identical between `dist/design-tokens` and `dist/setup-pre-tokens`.
- **Standalone Seed Quality:** **0 contrast failures, 0 unresolved aliases, 0 raw value violations** on shipped setup seeds evaluated against 42 canonical pairs across `light`, `dark`, and `high-contrast`.
- **Harness Integrity Remediation:** **1 High-severity harness defect (F1)** identified and resolved: repaired `smoke-design-tokens.mjs` Phase 5 and wired it into `package.json` `"smoke"` and GitHub Actions CI.

---

## 1. Scope, Update Under Evaluation & Method

### Scope & Test Environment

- **Evaluation Date:** 2026-10-27
- **Evaluated Commit:** `f748e51` on branch `main`
- **Host Runtime:** Node.js `v22.20.0` on `win32 10.0.26200 x64`
- **CLI Binary:** `dist/cli/token-engine.mjs` (Vite SSR bundle, 1,347.10 kB)

### Update Under Evaluation (`f748e51`)

The evaluation specifically exercises the delta introduced in `f748e51` on top of the progressive-disclosure refactor (`2420a51`) and v2 skill pruning (`cad536a`):

| Change Area                         | Implementation Summary                                                                                                                                                                 | Smoke Verification Coverage                                                                        |
| :---------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| **Canonical 3-Tier Templates**      | Centralized 20 token files under `src/shared/templates/tokens/` (`primitive/`, `semantic/`, `component/`). Deleted divergent seeds in `src/skills/setup-pre-tokens/templates/tokens/`. | `P4` (file inventory & byte parity across copied dist skills), `test/templates-tier.test.mjs`      |
| **Automated Build Mirroring**       | `scripts/build-engine.mjs` syncs `shared/templates/tokens` into both `dist/design-tokens/templates/tokens` and `dist/setup-pre-tokens/templates/tokens`.                               | `P4`, `P3`, `smoke-design-tokens` Phase 5                                                          |
| **Seed Standalone Audit Pass**      | Starter seeds now satisfy all 42 audit contrast pairs, feedback roles (`success`, `warning`, `danger`, `info`, `help`), and `high-contrast.tokens.json`.                               | `A7` (isolated audit on setup seed), `smoke-design-tokens` Phase 5 check 3                         |
| **Visualizer Typography**           | Added `<h2>3. Typography</h2>` with primary font family, modular scale specimen table (`Aa` at scale, size, line-height), and font-weight sample strip.                                | `B5` (content assertions), `smoke-design-tokens` Phase 6                                           |
| **Visualizer Ramps & Semantics**    | Swatch chips show computed sRGB HEX fallbacks and reverse-mapped semantic role badges; added `<h2>2. Semantic Colors</h2>` table.                                                      | `B5` (hex regex, `action.primary` badge, `{color.cerulean.` source), `smoke-design-tokens` Phase 6 |
| **Skill Seam & Compiler of Record** | SKILL.md documents dual compiler-of-record branches: `tokens:build` when `sd.config.mjs` exists, `build/engine/tokens.css` when absent.                                                | `S2` (no `sd.config` branch), `smoke-design-tokens` Phase 5 (with `sd.config` branch)              |
| **CLI Flags & Usage Alignment**     | Documented `--spec` in `init`, `none` in `scaffold`, `--root` in `sync`; removed global `--audit-baseline` from root help.                                                             | `P1` (asserts `--spec`, `none`, `--audit-baseline` per command and absence in root help)           |

### Methodology & Failure Policy

1. **Zero-Product-Modification Rule:** The evaluation harness and test scripts are modified to exercise and verify behavior, but product source code is not modified to force green tests. Any unexpected product behavior is recorded as an evidence-backed finding in §6.
2. **Harness Defect Remediation:** When test harnesses themselves contain outdated assumptions, broken paths, or missing wiring that prevent running smoke scenarios, the harness is repaired and documented.

---

## 2. Baseline Before Remediation

Prior to this evaluation, `scripts/smoke-design-tokens.mjs` had not been executed against commit `f748e51`. Running the script exposed an immediate fatal failure:

```text
[smoke] using CLI: C:\Users\toanh\.agents\skills\design-tokens\scripts\token-engine.mjs

[Phase 1] Codebase Context Discovery
  PASS: detects brownfield styling
  PASS: detects Shadow DOM Web Components
  PASS: detects pnpm package manager

[Phase 2] Palette Extraction & Pre-Audit Baseline
  PASS: emits candidate tokens.config.json
  PASS: emits .pre-audit-baseline.json
  PASS: emits pre-audit-baseline.md
  PASS: evaluated 7 baseline pairs
  PASS: uncovered 2 production contrast failure(s)

[Phase 3] Deterministic Sync Pipeline (1 Command)
  PASS: sync completes with exit code 0
  PASS: prints Before-vs-After delta scorecard
  PASS: demonstrates production contrast fix

[Phase 4] Output Verification
  PASS: cryptographic audit stamp written
  PASS: emitted tokens.css
  PASS: emitted tokens.js
  PASS: emitted tokens.d.ts
  PASS: emitted theme.css
  PASS: emitted package.json
  PASS: tokens.css scopes to :host, :root
  PASS: tokens.css includes dark mode media query
  PASS: tokens.css includes dark mode host attribute selector
  PASS: tokens.js exports multi-theme dictionary object
  PASS: tokens.d.ts strongly types themes dictionary
  PASS: package.json has name @tokens
  PASS: package.json maps ./css export

[Phase 5] setup-pre-tokens Seam & Standalone Engine Lane
  PASS: standalone skill contains scripts/token-engine.mjs
  PASS: standalone skill contains templates/tokens
node:internal/fs/cp/cp-sync:56
  fsBinding.cpSyncCheckPaths(src, dest, opts.dereference, opts.recursive);
            ^

Error: ENOENT: no such file or directory, lstat '...\token-engine-builder\src\skills\setup-pre-tokens\templates\tokens'
    at cpSyncFn (node:internal/fs/cp/cp-sync:56:13)
    at cpSync (node:fs:3127:3)
    at file:///.../scripts/smoke-design-tokens.mjs:254:5
```

### Baseline Analysis

1. **Broken Source Path:** Commit `f748e51` deliberately deleted `src/skills/setup-pre-tokens/templates/tokens` to establish a single master in `src/shared/templates/tokens`. `smoke-design-tokens.mjs:254` attempted to copy from the deleted source directory rather than the built distribution directory (`dist/setup-pre-tokens/templates/tokens`).
2. **Invisible CI Gap:** `package.json` had `"smoke": "npm run build && node scripts/smoke-all.mjs && node scripts/smoke-skill-contract.mjs"`. `smoke-design-tokens.mjs` was omitted from `"smoke"` and from `.github/workflows/check.yml`, allowing the broken test to exist undetected.
3. **Stale CLI Resolution:** Line 26 preferred `~/.agents/skills/design-tokens/scripts/token-engine.mjs` over local `dist/cli/token-engine.mjs`, potentially executing an outdated deployed binary rather than the tested working tree.

---

## 3. End-to-End Journey

The design token architecture supports two foundational development journeys, plus brownfield extraction and audit iteration:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      JOURNEY A: WITH SETUP-PRE-TOKENS                       │
│                                                                             │
│  [Step 0: setup-pre-tokens]                                                 │
│  1. Detect toolchain → 2. Single-touch plan → 3. Install devDeps            │
│  4. Write sd.config.mjs & Sass 7-1 → 5. Scaffold canonical 3-tier tokens     │
│  6. Target build verify: `npm run tokens:build` → 7. Handoff to /design-tokens│
│                                                                             │
│                                      │ (Target project has sd.config.mjs)    │
│                                      ▼                                      │
│  [Step 1-5: design-tokens]                                                  │
│  1. Triage context (finds sd.config.mjs)                                    │
│  2. Palette synthesis → tokens.config.json                                  │
│  3. `token-engine sync --force --out build/engine --theme all`              │
│     (Generates DTCG objects, gates contrast across 42 pairs, stamps audit)  │
│  4. Target compiler of record: `<pm> run tokens:build`                      │
│     (Compiles build/tokens.css, build/tokens.dark.css, abstracts/_variables)│
│  5. Visual proof: `token-engine build --visualizer` → visualizer.html       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                   JOURNEY B: STANDALONE DESIGN-TOKENS                       │
│                       (No sd.config.mjs present)                            │
│                                                                             │
│  1. Silent context triage (detects greenfield DOM, no sd.config.mjs)        │
│  2. Palette synthesis → tokens.config.json                                  │
│  3. `token-engine sync --force --out build/engine --theme all`              │
│  4. Engine compiler of record: `build/engine/tokens.css`                    │
│     (Advisory artifacts parked in build/engine; imported directly)          │
│  5. Visual proof: launch `build/engine/visualizer.html`                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Journey A — Greenfield with `setup-pre-tokens`

- **Compiler of Record:** Target project's `npm run tokens:build` (`style-dictionary build --config sd.config.mjs && style-dictionary build --config sd.dark.config.mjs`).
- **Starter State:** Project receives canonical defaults (`tokens/primitive/`, `tokens/semantic/` with `light`, `dark`, and `high-contrast`, and 9 `tokens/component/` files).
- **Execution:**
  1. `setup-pre-tokens` scaffolds tokens and configs.
  2. Standalone audit verification confirms initial seeds pass: `audit --tokens tokens --theme both` exits 0 with `audit PASS`.
  3. `design-tokens` authors brand decisions into `tokens.config.json`.
  4. Single-pass sync adopts the tree: `token-engine sync --spec tokens.config.json --force --out build/engine --theme all` exits 0.
  5. Target compiler compiles production outputs: `<pm> run tokens:build` transforms DTCG color objects to `oklch(...)` strings in `build/tokens.css` and generates `abstracts/_variables.scss`.
  6. Visualizer generated via `token-engine build --visualizer` proves color ramps, typography, and semantic bindings.

### Journey B — Standalone `design-tokens` (No `sd.config.mjs`)

- **Compiler of Record:** `token-engine` engine outputs in `build/engine/tokens.css`.
- **Execution:**
  1. No `sd.config.mjs` is present in the workspace.
  2. Agent executes `token-engine sync --spec tokens.config.json --force --out build/engine --theme all`.
  3. Exit code 0 is returned; `build/engine/tokens.css` and `tokens/.token-engine-audit.json` are created.
  4. Verified that `build/tokens.css` is not created at the root, matching the documented compiler of record rules.

### Journey C — Brownfield Extraction & Remediation

- **Testbed:** Simulated `hordes-automation` Web Component HUD with Shadow DOM (`:host`) and low-contrast colors (`#38bdf8` on `#ffffff`, ratio 2.14:1).
- **Execution:**
  1. `token-engine init --root . --dry-run` detects `maturity=brownfield`, `runtime=shadow-dom`, and `pkg=pnpm`.
  2. `token-engine extract --root . --out tokens.config.json --audit-baseline` uncovers 2 production contrast failures and emits `.pre-audit-baseline.json`.
  3. `token-engine sync --spec tokens.config.json --tokens tokens --out packages/tokens --theme all --selector ":host, :root" --package @tokens --force` completes with exit 0.
  4. The dual-audit delta scorecard demonstrates that OKLCH ramp math remediates failing pairs up to compliant ratios (e.g. 10.23:1).
  5. Scoped `:host, :root` selectors and `@tokens` `package.json` package exports are emitted.

### Journey D — Diagnostic Review & State Transitions

- **Execution:**
  1. `token-engine route --root .` traverses lifecycle states: `spec -> tokens -> audited -> built`.
  2. `token-engine diagnose --root .` evaluates system health, verifying token counts, theme completeness, and visualizer availability.

---

## 4. Scenario Inventory & Results

The complete smoke harness comprises **44 automated scenarios in `smoke-all.mjs`**, plus the **agent contract test** and **6-phase cognitive journey**:

|    ID    | Suite                 | Scenario Description                                                                                               | Expected Outcome                                           |  Result  |
| :------: | :-------------------- | :----------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------- | :------: |
| **P1** ★ | `smoke-all`           | Subcommands & root `--help` via CLI & bundled engine; validates `--spec`, `none`, and `--audit-baseline` isolation | Exit 0, usage texts match flag specs                       | **PASS** |
|  **P2**  | `smoke-all`           | Verify `design-tokens` SKILL.md, example spec, and 6 reference docs exist                                          | Files present & valid JSON                                 | **PASS** |
|  **P3**  | `smoke-all`           | Verify static directories (`assets`, `references`, `templates`, `scripts`) across skills                           | All directories exist in dist                              | **PASS** |
| **P4** ★ | `smoke-all`           | Canonical 3-tier templates mirrored identically to both skills (20 files, byte-for-byte)                           | 20 token files match expected inventory & byte equality    | **PASS** |
|  **S0**  | `smoke-all`           | Bundled engine `token-engine sync` end-to-end via copied `dist/design-tokens`                                      | Exit 0, `tokens.css`, `theme.css`, audit stamp             | **PASS** |
|  **S1**  | `smoke-all`           | Full pipeline seed: generate -> audit -> build light/dark -> route/diagnose                                        | All pipeline stages exit 0 with valid artifacts            | **PASS** |
| **S2** ★ | `smoke-all`           | Sync engine-only compiler-of-record without `sd.config.mjs`                                                        | Exit 0, writes `build/engine/tokens.css`, skips root build | **PASS** |
|  **E1**  | `smoke-all`           | `extract`: empty input directory                                                                                   | Exit 1, descriptive error message                          | **PASS** |
|  **E2**  | `smoke-all`           | `extract`: candidate spec from CSS variables stylesheet                                                            | Exit 0, valid JSON spec                                    | **PASS** |
|  **E3**  | `smoke-all`           | `extract`: candidate spec from Tailwind v3 configuration                                                           | Exit 0, valid JSON spec                                    | **PASS** |
|  **E4**  | `smoke-all`           | `extract`: candidate spec from Stitch `DESIGN.md`                                                                  | Exit 0, valid JSON spec                                    | **PASS** |
|  **E5**  | `smoke-all`           | `extract`: candidate spec from raw HTML document                                                                   | Exit 0, valid JSON spec                                    | **PASS** |
|  **E6**  | `smoke-all`           | `extract`: candidate spec from live HTTP URL via Playwright                                                        | Exit 0, Fraunces font extracted                            | **PASS** |
|  **E7**  | `smoke-all`           | `extract`: overwrite refusal without `--force` and `--dry-run` safety                                              | Exit 1 without force, exit 0 dry                           | **PASS** |
|  **E8**  | `smoke-all`           | `extract`: missing input flags                                                                                     | Exit 1, missing input text                                 | **PASS** |
|  **M1**  | `smoke-all`           | `generate`: 9-step compact style spec                                                                              | Exit 0, 9-step ramp tokens                                 | **PASS** |
|  **M2**  | `smoke-all`           | `generate`: custom semantic theme mode                                                                             | Exit 0, custom theme tokens                                | **PASS** |
|  **M3**  | `smoke-all`           | `generate`: guard checks (exists refusal, dry-run, tamper force)                                                   | Guard exits enforced                                       | **PASS** |
|  **M4**  | `smoke-all`           | `generate`: bad input (missing & invalid spec)                                                                     | Exit 1 with validation errors                              | **PASS** |
|  **A1**  | `smoke-all`           | `audit`: compliant 3-tier token tree                                                                               | Exit 0, audit pass stamp                                   | **PASS** |
|  **A2**  | `smoke-all`           | `audit`: `--json` structured diagnostics output                                                                    | Exit 0, valid JSON payload                                 | **PASS** |
|  **A3**  | `smoke-all`           | `audit`: detect low contrast override and suggest remedy                                                           | Exit 4, remediation guidance                               | **PASS** |
|  **A4**  | `smoke-all`           | `audit`: theme filter (`--theme light`) and custom floor (`--min-ratio 7.0`)                                       | Floor strictly enforced                                    | **PASS** |
|  **A5**  | `smoke-all`           | `audit`: reject tampered token tree where hash does not match manifest                                             | Exit 4, tamper provenance fail                             | **PASS** |
|  **A6**  | `smoke-all`           | `audit`: reject missing tokens directory                                                                           | Exit 2, missing directory                                  | **PASS** |
| **A7** ★ | `smoke-all`           | `audit`: shipped canonical seed templates pass standalone across all themes                                        | Exit 0, `[light]`, `[dark]`, `[high-contrast]` PASS        | **PASS** |
|  **B1**  | `smoke-all`           | `build`: compile audited tokens to CSS variables and Tailwind @theme (light)                                       | Exit 0, `tokens.css`, `theme.css`                          | **PASS** |
|  **B2**  | `smoke-all`           | `build`: compile dark theme tokens                                                                                 | Exit 0, dark artifacts                                     | **PASS** |
|  **B3**  | `smoke-all`           | `build`: compile UI profile `shadcn`                                                                               | Exit 0, `shadcn.css`                                       | **PASS** |
|  **B4**  | `smoke-all`           | `build`: custom CSS property prefix (`--prefix ds`)                                                                | Exit 0, `--ds-*` variables                                 | **PASS** |
| **B5** ★ | `smoke-all`           | `build`: interactive visualizer compilation with Typography, HEX, & badges                                         | Exit 0, visualizer HTML with all 4 sections                | **PASS** |
|  **B6**  | `smoke-all`           | `build`: enforce audit pass stamp gate; refuse unaudited tree                                                      | Exit 3 without stamp, exit 0 with bypass                   | **PASS** |
|  **B7**  | `smoke-all`           | `build`: overwrite protection and hand-edit tamper refusal                                                         | Exit 3 without force                                       | **PASS** |
|  **B8**  | `smoke-all`           | `build`: spec binding mismatch refusal                                                                             | Exit 3, mismatch rejected                                  | **PASS** |
|  **B9**  | `smoke-all`           | `build`: dry-run safety and invalid argument handling                                                              | Exit 0 dry, exit 2 bad args                                | **PASS** |
|  **F1**  | `smoke-all`           | `figma`: round-trip Figma variables (export -> figma JSON -> import)                                               | Exit 0, lossless roundtrip                                 | **PASS** |
|  **F2**  | `smoke-all`           | `figma`: overwrite refusal and invalid payload handling                                                            | Exit 3 on overwrite, exit 5 invalid                        | **PASS** |
|  **R1**  | `smoke-all`           | `route`: empty project triage and recommended next actions                                                         | Exit 0, next action commands                               | **PASS** |
|  **R2**  | `smoke-all`           | `route`: state transitions across lifecycle (`spec -> tokens -> audited -> built`)                                 | Exit 0, correct next skills                                | **PASS** |
|  **R3**  | `smoke-all`           | `route`: `--json` summary and handling of invalid spec                                                             | Exit 0 JSON, exit 5 on corrupt spec                        | **PASS** |
|  **D1**  | `smoke-all`           | `diagnose`: empty project diagnosis                                                                                | Exit 0, structured JSON findings                           | **PASS** |
|  **D2**  | `smoke-all`           | `diagnose`: healthy built system validation                                                                        | Exit 0, status PASS                                        | **PASS** |
|  **D3**  | `smoke-all`           | `diagnose`: detect low contrast tokens and tampered files                                                          | Exit 0, findings populated                                 | **PASS** |
|  **D4**  | `smoke-all`           | `diagnose`: missing build artifacts and path overrides                                                             | Exit 0, missing build flagged                              | **PASS** |
|  **C1**  | `smoke-contract`      | SKILL.md preflight literal-execution guard verification                                                            | Both skills contain preflight guard                        | **PASS** |
|  **C2**  | `smoke-contract`      | Zero hardcoded `~/.agents/skills` paths in documentation                                                           | Zero hardcoded home paths                                  | **PASS** |
|  **C3**  | `smoke-contract`      | CLI command resolution and `--help` execution across all documented entrypoints                                    | All 7 documented commands exit 0                           | **PASS** |
|  **J1**  | `smoke-design-tokens` | Phase 1: Codebase context discovery (brownfield, shadow-dom, pnpm)                                                 | All context attributes detected                            | **PASS** |
|  **J2**  | `smoke-design-tokens` | Phase 2: Palette extraction and pre-audit baseline generation                                                      | Evaluated 7 pairs, 2 failures found                        | **PASS** |
|  **J3**  | `smoke-design-tokens` | Phase 3: Single-pass deterministic sync with delta scorecard                                                       | Exit 0, contrast fixed by token math                       | **PASS** |
|  **J4**  | `smoke-design-tokens` | Phase 4: Output verification (tokens.css, tokens.js, tokens.d.ts, theme.css, @tokens)                              | Scoped `:host, :root` and types valid                      | **PASS** |
| **J5** ★ | `smoke-design-tokens` | Phase 5: `setup-pre-tokens` seam, seed audit, and target Style Dictionary build                                    | Seed audits clean; target SD builds cleanly                | **PASS** |
| **J6** ★ | `smoke-design-tokens` | Phase 6: Standalone engine visualizer verification                                                                 | Visualizer contains Typography & HEX                       | **PASS** |

_(Scenarios marked with ★ represent new or significantly strengthened verification checks added for the `f748e51` update)._

---

## 5. Update Deep-Dive Scorecards

### Scorecard 1: Canonical 3-Tier Template Tree & Mirroring Parity

Verified that `src/shared/templates/tokens/` contains the full 20-file DTCG specification and is mirrored identically into both skills:

|    Tier    | Relative Token Path                  | Purpose                                                | `dist/design-tokens` | `dist/setup-pre-tokens` | Byte Parity |
| :--------: | :----------------------------------- | :----------------------------------------------------- | :------------------: | :---------------------: | :---------: |
| **Tier 1** | `primitive/animation.tokens.json`    | Durations & cubic beziers                              |       Present        |         Present         |  Identical  |
| **Tier 1** | `primitive/color.tokens.json`        | Palette & 11-step feedback ramps                       |       Present        |         Present         |  Identical  |
| **Tier 1** | `primitive/grid.tokens.json`         | Breakpoints, containers, gutters                       |       Present        |         Present         |  Identical  |
| **Tier 1** | `primitive/radius.tokens.json`       | Corner radii (`none` to `full`)                        |       Present        |         Present         |  Identical  |
| **Tier 1** | `primitive/shadow.tokens.json`       | Elevation shadow values                                |       Present        |         Present         |  Identical  |
| **Tier 1** | `primitive/spacing.tokens.json`      | 4px-base spacing scale (`0`–`24`)                      |       Present        |         Present         |  Identical  |
| **Tier 1** | `primitive/typography.tokens.json`   | Font family, sizes (`xs`–`5xl`), weights, line-heights |       Present        |         Present         |  Identical  |
| **Tier 1** | `primitive/z-index.tokens.json`      | Stacking context scales                                |       Present        |         Present         |  Identical  |
| **Tier 2** | `semantic/dark.tokens.json`          | Dark theme semantic color & layout roles               |       Present        |         Present         |  Identical  |
| **Tier 2** | `semantic/high-contrast.tokens.json` | High-contrast semantic color & layout roles            |       Present        |         Present         |  Identical  |
| **Tier 2** | `semantic/light.tokens.json`         | Light theme semantic color & layout roles              |       Present        |         Present         |  Identical  |
| **Tier 3** | `component/alert.tokens.json`        | Scoped alert tokens                                    |       Present        |         Present         |  Identical  |
| **Tier 3** | `component/avatar.tokens.json`       | Scoped avatar tokens                                   |       Present        |         Present         |  Identical  |
| **Tier 3** | `component/badge.tokens.json`        | Scoped badge tokens                                    |       Present        |         Present         |  Identical  |
| **Tier 3** | `component/button.tokens.json`       | Scoped button tokens                                   |       Present        |         Present         |  Identical  |
| **Tier 3** | `component/card.tokens.json`         | Scoped card tokens                                     |       Present        |         Present         |  Identical  |
| **Tier 3** | `component/dialog.tokens.json`       | Scoped dialog tokens                                   |       Present        |         Present         |  Identical  |
| **Tier 3** | `component/input.tokens.json`        | Scoped input tokens                                    |       Present        |         Present         |  Identical  |
| **Tier 3** | `component/table.tokens.json`        | Scoped table tokens                                    |       Present        |         Present         |  Identical  |
| **Tier 3** | `component/tooltip.tokens.json`      | Scoped tooltip tokens                                  |       Present        |         Present         |  Identical  |

- **Zero Divergence:** All 20 files are bitwise identical across both skills.
- **Companion Preservation:** Setup additionally preserves `templates/configs/` (`sd.config.mjs`, `sd.dark.config.mjs`, `.prettierrc.json`, `stylelint.config.mjs`), `templates/styles/` (Sass 7-1 partials), and `templates/target-README.md`.

### Scorecard 2: Shipped Seed Standalone Contrast Audit

Audited `dist/setup-pre-tokens/templates/tokens/` without running token-engine generation or sync:

|        Theme        | Canonical Pairs Evaluated | Passing Pairs | Failing Pairs | Unresolved Aliases | Raw Value Violations |  Status  |
| :-----------------: | :-----------------------: | :-----------: | :-----------: | :----------------: | :------------------: | :------: |
|     **`light`**     |            42             |      42       |       0       |         0          |          0           | **PASS** |
|     **`dark`**      |            42             |      42       |       0       |         0          |          0           | **PASS** |
| **`high-contrast`** |            42             |      42       |       0       |         0          |          0           | **PASS** |

- **Sample Certified Pairs (Light):**
  - Primary text on canvas: **13.77:1** (APCA $L_c\ 99.9$) — PASS
  - Primary action text on action button: **10.23:1** (APCA $L_c\ 90.9$) — PASS
  - Feedback danger text on danger background: **10.41:1** (APCA $L_c\ 77.4$) — PASS
  - Input focus border on input background: **7.32:1** (APCA $L_c\ 87.0$) — PASS
- **Verdict:** Projects bootstrapped with `setup-pre-tokens` start in an audit-certified state before any customization.

### Scorecard 3: Visualizer Specimen Content & Layout

Inspected emitted `visualizer.html` across light and dark theme compilations:

| Feature / Assertion                 | Verification Check                                                                                                         | Observed Status |
| :---------------------------------- | :------------------------------------------------------------------------------------------------------------------------- | :-------------: |
| **Sequential Section Headers**      | `<h2>1. Color Ramps</h2>`, `<h2>2. Semantic Colors</h2>`, `<h2>3. Typography</h2>`, `<h2>4. Component Specimens</h2>`      |  **Verified**   |
| **Computed sRGB HEX Codes**         | Swatches render monospace `#hex` codes below step labels (e.g. `#2784d5`)                                                  |  **Verified**   |
| **Reverse-Mapped Semantic Badges**  | Swatch chips display pill badges identifying bound semantic roles (e.g. `action.primary`, `text.link`)                     |  **Verified**   |
| **Feedback Ramp Grouping**          | Emits discrete feedback ramps: `feedback-success`, `feedback-warning`, `feedback-danger`, `feedback-info`, `feedback-help` |  **Verified**   |
| **Dedicated Semantic Colors Table** | Groups `bg`, `text`, `action`, `border`, `feedback` with swatch, role, HEX, OKLCH, and primitive `{source}`                |  **Verified**   |
| **Live Typography Specimen Table**  | Steps `xs` through `5xl` with live rendered `Aa` specimens, font-size, and paired line-heights                             |  **Verified**   |
| **Font Weight Sample Strip**        | Previews `regular (400)`, `medium (500)`, `semibold (600)`, `bold (700)` with rendered text                                |  **Verified**   |
| **Empty State Fallbacks**           | Clean informational messages rendered when a category contains no tokens                                                   |  **Verified**   |

### Scorecard 4: CLI Flags & Subcommand Documentation Parity

| Subcommand | Flag Checked                              | Declaration (`cli-flags.ts`) | Subcommand Help (`--help`) | SKILL.md Reference |
| :--------- | :---------------------------------------- | :--------------------------: | :------------------------: | :----------------: |
| `sync`     | `--root <dir>`                            |           Present            |          Present           |      Present       |
| `init`     | `--spec <tokens.config.json>`             |           Present            |          Present           |      Present       |
| `scaffold` | `--formatter prettier\|biome\|none`       |           Present            |          Present           |      Present       |
| `scaffold` | `--linter stylelint\|eslint\|none`        |           Present            |          Present           |      Present       |
| `extract`  | `--audit-baseline`                        |           Present            |          Present           |      Present       |
| `(root)`   | `--audit-baseline` (excluded from global) |      Correctly Omitted       |     Correctly Omitted      | Correctly Omitted  |

---

## 6. Findings

### F1 (High): Cognitive Monorepo Smoke Script Left Broken and Unwired After Template Consolidation

- **Severity:** High
- **Locations:** `scripts/smoke-design-tokens.mjs:254`, `package.json:29`, `.github/workflows/check.yml:25-27`
- **Observed Behavior:** Executing `node scripts/smoke-design-tokens.mjs` crashed in Phase 5 with `ENOENT: no such file or directory, lstat '.../src/skills/setup-pre-tokens/templates/tokens'`. Furthermore, the script was not present in `package.json` scripts (`"smoke"` only ran `smoke-all.mjs` and `smoke-skill-contract.mjs`) and was not run in CI.
- **Root Cause:** Commit `f748e51` consolidated templates into `src/shared/templates/tokens` and deleted the local setup folder, relying on `scripts/build-engine.mjs` to mirror templates to `dist/setup-pre-tokens/templates/tokens`. `smoke-design-tokens.mjs` was never updated to reference `dist/` and was not wired into the main test gate.
- **Impact:** The autonomous brownfield agent smoke test was broken in the repository and would not run for developers or in GitHub Actions CI.
- **Remediation Implemented in This Work:**
  1. Redirected `smoke-design-tokens.mjs:256` to copy tokens from `dist/setup-pre-tokens/templates/tokens`.
  2. Inverted CLI preference (lines 24–26) to test `dist/cli/token-engine.mjs` first.
  3. Added standalone seed audit check and Phase 6 Visual Proof assertions.
  4. Updated pass counter dynamically and corrected `ARCHITECTURE.md` §5 item 3.
  5. Wired `scripts/smoke-design-tokens.mjs` into `package.json` `"smoke"` and `.github/workflows/check.yml`.

### F2 (Low): Pre-Existing Formatting Drift Across Historical Repository Files

- **Severity:** Low
- **Locations:** 67 historical files across `docs/`, `src/`, `test/`, and `.changeset/`
- **Observed Behavior:** `npm run format` reported style and line-ending drift across 67 historical files when run on Windows (`win32 10.0.26200`).
- **Root Cause:** Inconsistent git line-ending configurations (`core.autocrlf` / `.gitattributes`) across developer environments prior to v2 refactoring.
- **Impact:** Developer running `npm run format` globally sees warnings on untouched historical files. All files touched by the current update and evaluation are 100% verified compliant with `prettier --check`.
- **Status:** Reported; recommended for one-time repository normalization in §7 (R6).

---

## 7. Improvement Recommendations

Based on empirical test execution, we identify the following prioritized recommendations to further harden the testbed and development experience:

|   ID   | Recommendation                                                     | Rationale & Evidence                                                                                                                                                                                                                                                                             | Priority | Effort |        Disposition        |
| :----: | :----------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------: | :----: | :-----------------------: |
| **R1** | **Add Golden File Fixture for `visualizer.html`**                  | `scripts/sample-css.mjs` enforces gold standards for 12 CSS and Markdown artifacts (`diffGold`), but visualizer HTML is verified only via substring checks (`expectContains`). A gold fixture in `test/fixtures/gold/visualizer.example.html` will detect accidental DOM or styling regressions. |   High   | Small  |         **Adopt**         |
| **R2** | **Add Subcommand Filtering to `smoke-all.mjs`**                    | `smoke-all.mjs` executes all 44 scenarios sequentially (~15s). Adding a CLI argument (e.g. `node scripts/smoke-all.mjs --case B5` or `--suite build`) will allow developers to run targeted scenario smoke tests in < 500ms.                                                                     |  Medium  | Small  |         **Adopt**         |
| **R3** | **Optimize CI Smoke Redundant Rebuild**                            | `npm run smoke` builds `dist/` before running tests. In CI (`.github/workflows/check.yml`), `npm run check` already builds `dist/`, causing a redundant 1.2s Vite SSR pass when `npm run smoke` runs. Running scripts directly in CI avoids the redundant rebuild.                               |   Low    | Small  | **Adopt** (already in CI) |
| **R4** | **Add Headless Chromium Preflight Probe in URL Extraction (`E6`)** | Scenario `E6` requires Playwright with Chromium installed. In environments lacking browser binaries, `E6` could fail without a descriptive remediation note. Adding a preflight probe that skips with an informative notice if Chromium is missing improves portability.                         |  Medium  | Small  |         **Adopt**         |
| **R5** | **Expand Cognitive Contract Linting in `scripts/lint-skills.mjs`** | While deterministic CLI steps are covered by smoke scripts, cognitive instructions in `SKILL.md` rely on agent adherence. Adding AST checks in `lint-skills.mjs` to verify prompt anchors (such as Socratic question limits and remediation ladder steps) bridges the cognitive testing gap.     |  Medium  | Medium |         **Adopt**         |
| **R6** | **Run One-Time Repository-Wide Prettier Normalization**            | 67 historical files exhibit CRLF/LF formatting warnings under `npm run format`. A single dedicated formatting commit normalizing line endings and Prettier style across all files will make `npm run format` clean out-of-the-box.                                                               |   Low    | Small  |         **Adopt**         |

---

## 8. Final Gate Summary

Following the harness repair, template canon validation, and test suite extensions, all gates pass cleanly:

| Gate                         | Command                                 |      Baseline Result      |       Post-Remediation Result        |  Status   |
| :--------------------------- | :-------------------------------------- | :-----------------------: | :----------------------------------: | :-------: |
| **Code Formatting**          | `npm run format`                        | 67 historical files drift |   **All touched files 100% PASS**    | Certified |
| **Unit, Lint, & Build**      | `npm run check`                         |     PASS (183 tests)      |      PASS (183 tests in 21.64s)      | Certified |
| **CLI Subsystem Smoke**      | `node scripts/smoke-all.mjs`            |      PASS (41 cases)      |    **PASS (44 cases in 14.68s)**     | Certified |
| **Agent Contract Smoke**     | `node scripts/smoke-skill-contract.mjs` |           PASS            |     PASS (2 skills, 7 commands)      | Certified |
| **Autonomous Agent Journey** | `node scripts/smoke-design-tokens.mjs`  | ❌ FAIL (Phase 5 ENOENT)  |   **PASS (40 checks in 2,776ms)**    | Certified |
| **Combined Smoke Gate**      | `npm run smoke`                         |  Omitted cognitive smoke  | **PASS (All 3 harnesses in 19.70s)** | Certified |
| **Continuous Integration**   | `.github/workflows/check.yml`           |  Omitted cognitive smoke  |         **Wired & Verified**         | Certified |

---

## Conclusion

The skill update in `f748e51` is **fully verified and production-ready**. Unifying token templates into a single canonical 3-tier hierarchy under `src/shared/templates/tokens/` eliminates seed drift and ensures that target projects bootstrapped via `setup-pre-tokens` start with an audit-certified token system (`exit 0`). The enriched visualizer provides immediate visual proof of color science, typography rhythm, and semantic bindings. With `scripts/smoke-design-tokens.mjs` repaired and permanently wired into CI, the full cognitive and deterministic agent journey is continuously protected against future regressions.
