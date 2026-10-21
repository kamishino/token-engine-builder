# Smoke Test Evaluation and Bundled Skills Validation

> Comprehensive audit and runtime validation of the token-engine-builder smoke harness (`scripts/smoke-all.mjs`) and all 7 packaged AI agent skills. Evaluated on 2026-10-21 against the agent-agnostic path contract.

## Post-Remediation Verification (2026-10-21)

Re-run on the current tree after commits `5811c5d`, `caf6adc`, and `5ef5a5e`.

| Gate              | Command                       | Result                                                                                              |
| :---------------- | :---------------------------- | :-------------------------------------------------------------------------------------------------- |
| Format            | `npm run format`              | PASS                                                                                                |
| Unit, lint, build | `npm run check`               | PASS — 144/144 tests, 7 scripts built, CSS gold match                                               |
| Integration smoke | `npm run smoke`               | PASS — 40/40 scenarios                                                                              |
| Agent contract    | `npm run smoke`               | PASS — all 7 skill contracts, documented entrypoints, and routing-table targets respond to `--help` |
| CI wiring         | `.github/workflows/check.yml` | PASS — runs both smoke scripts after `npm run check` and installs Chromium first                    |

The 38/39 result and findings in §§2–4 are the pre-remediation baseline, retained as historical evidence. Current harness changes: `P3` added; `R1` asserts the resolved absolute sibling path and rejects cwd-relative commands; `scripts/smoke-skill-contract.mjs` is permanent; CI runs both suites.
---

## 1. Scope & Methodology

- **Evaluation Date**: 2026-10-21
- **Scope Constraint**: This evaluation document introduces zero functional or source-code modifications. It records empirical test execution, categorizes gaps, and audits the smoke harness against production agent usage. The implemented remediations are recorded in §6.
- **Harness Evaluated**:
  1. `npm run check`: standard repo gate (144 unit tests via `node:test`, TypeScript compiler `tsc`, ESLint, Prettier, `lint:skills`, multi-pass Vite build `scripts/build-all.mjs`, and CSS gold diff `scripts/sample-css.mjs`).
  2. `npm run smoke`: end-to-end integration harness executing 39 scenarios at evaluation time (40 after `P3`; see the post-remediation section) across an isolated temporary installation tree (`scripts/smoke-all.mjs`).
  3. `smoke-skill-contract.mjs`: isolated agent-contract validation probing all 7 `dist/<skill>/SKILL.md` instructions, resolving `<...-root>` placeholders, checking literal-execution guards, and verifying `--help` execution for all documented CLI commands.

---

## 2. Pre-Remediation Baseline

The table and findings below are the pre-remediation snapshot. S1–S4 and S7 are resolved by the commits listed in the post-remediation section; S5 and S6 are unchanged by design.

| Category                                  | Metric                                   | Status                         |
| :---------------------------------------- | :--------------------------------------- | :----------------------------- |
| **Unit & Build Suite** (`npm run check`)  | 144 / 144 tests passing                  | PASS (100%)                    |
| **Bundled Smoke Suite** (`npm run smoke`) | 38 / 39 scenarios passing                | ⚠️ 1 FAIL (R1 stale assertion) |
| **Agent Contract Smoke**                  | 23 / 23 command & routing checks passing | PASS (100%)                    |
| **Bundled Skills Health**                 | 7 / 7 skills functionally operational    | READY                          |
| **CI Integration**                        | `npm run smoke` omitted from CI workflow | ⚠️ GAP                         |

All 7 bundled agent skills are functionally sound. Built scripts execute cleanly in isolated runtime environments without external `node_modules` dependencies. The single observed smoke test failure (`R1`) is a **test assertion regression** caused by recent agent-agnostic path standardization: `route.mjs` now correctly outputs an absolute path to the sibling `token-extract` skill, while `smoke-all.mjs` line 1334 strictly asserted the obsolete cwd-relative string `node ./scripts/extract.mjs`.

---

## 3. Findings & Gap Analysis

### S1 (High): Stale Path Assertion in Smoke Scenario `R1`

- **Location**: `scripts/smoke-all.mjs:1334-1335`
- **Observed Behavior**:
  ```text
  [R1] route: empty directory:
  extract command line: expected text to include "next: token-extract — node ./scripts/extract.mjs --root . --out style-spec.json"
  actual: next: token-extract — node C:\Users\...\AppData\Local\Temp\token-engine-smoke-l9YP1Z\skills\token-extract/scripts/extract.mjs --root . --out style-spec.json
  ```
- **Root Cause**: The runtime resolution commit (`feat(shared): add siblingSkillRoot and resolveSkillPathPlaceholders`) updated `route.mjs` and `diagnose.mjs` to emit absolute paths for sibling skills, eliminating broken cwd-relative commands. Unit tests in `test/route.test.mjs` were updated, but `smoke-all.mjs` line 1334 retained the legacy hardcoded string.
- **Impact**: `npm run smoke` exits with code 1 despite all underlying skills functioning as specified.

### S2 (High): Smoke Suite Bypasses `SKILL.md` Agent Contract

- **Location**: `scripts/smoke-all.mjs:76-85` (`scriptPath` and `run` helpers)
- **Observed Behavior**: The smoke runner directly spawns scripts via filesystem paths (`join(skillsRoot, skill, 'scripts', scriptName)`). It never opens, parses, or validates the `SKILL.md` markdown files that AI agents read and execute.
- **Root Cause**: The smoke suite was designed as a CLI integration test rather than an agent contract test. It does not test whether an agent can parse `<skill-root>` or `<target-skill-root>`, whether the preflight literal-execution guard is present, or whether documented command lines match the actual CLI entrypoints.
- **Evidence of Safety**: A dedicated contract test probe (`smoke-skill-contract.mjs`) verified that all 7 `dist/*/SKILL.md` files contain the required preflight guard, omit hardcoded `~/.agents/skills` paths, and specify valid CLI entrypoints that exit 0 with usage text.

### S3 (Medium): Smoke Suite Omitted from Continuous Integration

- **Location**: `.github/workflows/check.yml`
- **Observed Behavior**: The CI pipeline executes `npm run check`, which runs unit tests, lints, and builds `dist/`, but never executes `npm run smoke`.
- **Impact**: Smoke harness regressions (such as S1) are not detected on PRs or commits until manually run locally.

### S4 (Medium): Incomplete Packaging Verification for Static Assets & References

- **Location**: `scripts/smoke-all.mjs:191-215` (`P2` scenario)
- **Observed Behavior**: `P2` tests only `token-style` assets (`style-clusters.md`, `design-mappings.md`, `color-naming.md`, `discovery-checklist.md`). It omits:
  - `token-style/references/color-architecture.md`
  - `token-style/assets/style-spec.example.json`
  - `token-style/examples/style-spec.compact.json`
  - All static assets, references, templates, and examples for the other 6 skills (`token-math`, `token-audit`, `token-build`, `token-extract`, `improve-design-system`, `ask-kami`).
- **Impact**: If `syncSkillPackages` fails to copy a reference or template directory, `npm run smoke` will not catch the missing files for 6 out of 7 skills.

### S5 (Low): Prompt-Only and Conversational Surfaces Are Not Deterministically Tested

- **Location**: `src/skills/token-style/SKILL.md`, `src/skills/improve-design-system/SKILL.md`
- **Observed Behavior**:
  - `token-style` has no CLI executable (`scripts/`). It is a prompt-only skill conducting a Socratic interview.
  - `improve-design-system` has `diagnose.mjs`, but its secondary deliverable is an agent-authored `REPORT_HTML` document.
- **Architectural Boundary**: A script smoke test cannot and should not attempt to simulate natural-language agent dialogue. The contract test must verify prompt assets, examples, and handoff instructions, while reserving automated execution for deterministic scripts.

### S6 (Low): Redundant Rebuild in `npm run smoke`

- **Location**: `package.json:20` (`"smoke": "npm run build && node scripts/smoke-all.mjs"`)
- **Observed Behavior**: `npm run smoke` unconditionally rebuilds all skills before running. When run in a CI pipeline where `npm run check` has already built `dist/`, this wastes 2–4 seconds of build time.

### S7 (Low): Playwright Dependency in URL Extraction (`E6`)

- **Location**: `scripts/smoke-all.mjs:58-74`, `scripts/smoke-all.mjs:490-528`
- **Observed Behavior**: Scenario `E6` tests `token-extract` against an HTTP server. `smoke-all.mjs` creates junctions to repo `node_modules/playwright`. If run in an environment without Playwright or Chromium, `E6` could fail without a descriptive prerequisite notice.
- **Current Run**: On this host, `E6` passed cleanly.

---

## 4. Pre-Remediation Scenario Inventory (39 Cases)

The 39 scenarios below are the pre-remediation snapshot, evaluated against `dist/` (Node 22.12 on win32 x64). The current harness has 40 cases; `P3` passes, and `R1` asserts the resolved absolute path.

|   ID   | Category      | Skill Under Test                                                                | Scenario Description                                                             | Expected Outcome                    |             Actual Result             |
| :----: | :------------ | :------------------------------------------------------------------------------ | :------------------------------------------------------------------------------- | :---------------------------------- | :-----------------------------------: |
| **P1** | Packaging     | All (6 scripts)                                                                 | Verify all copied `.mjs` scripts respond to `--help` with exit code 0            | Exit 0, usage text                  |                 PASS                  |
| **P2** | Packaging     | `token-style`                                                                   | Verify `SKILL.md`, example spec, and 4 reference docs exist                      | Files present & valid               |                 PASS                  |
| **S1** | Seed Pipeline | `token-math`, `token-audit`, `token-build`, `ask-kami`, `improve-design-system` | Full lifecycle: generate -> audit -> build light/dark -> route/diagnose          | All steps succeed, files created    |                 PASS                  |
| **E1** | Extract       | `token-extract`                                                                 | Empty input directory returns exit code 1 with clean error                       | Exit 1, error message               |                 PASS                  |
| **E2** | Extract       | `token-extract`                                                                 | Extract candidate spec from CSS variables file                                   | Exit 0, valid JSON spec             |                 PASS                  |
| **E3** | Extract       | `token-extract`                                                                 | Extract candidate spec from Tailwind v3 config                                   | Exit 0, valid JSON spec             |                 PASS                  |
| **E4** | Extract       | `token-extract`                                                                 | Extract candidate spec from Stitch `DESIGN.md`                                   | Exit 0, valid JSON spec             |                 PASS                  |
| **E5** | Extract       | `token-extract`                                                                 | Extract candidate spec from raw HTML document                                    | Exit 0, valid JSON spec             |                 PASS                  |
| **E6** | Extract       | `token-extract`                                                                 | Extract candidate spec from live HTTP URL via Playwright/DOM                     | Exit 0, Fraunces font               |                 PASS                  |
| **E7** | Extract       | `token-extract`                                                                 | Verify overwrite refusal without `--force` and `--dry-run` safety                | Exit 1 without force, exit 0 dry    |                 PASS                  |
| **E8** | Extract       | `token-extract`                                                                 | Missing input flag returns descriptive error                                     | Exit 1, missing input text          |                 PASS                  |
| **M1** | Math          | `token-math`                                                                    | Generate 3-tier tokens from 9-step compact style spec                            | Exit 0, 9-step ramp tokens          |                 PASS                  |
| **M2** | Math          | `token-math`                                                                    | Generate tokens with custom semantic theme mode                                  | Exit 0, custom theme tokens         |                 PASS                  |
| **M3** | Math          | `token-math`                                                                    | Guards: refuse overwrite without `--force`, dry-run, tamper force                | Guard exits enforced                |                 PASS                  |
| **M4** | Math          | `token-math`                                                                    | Reject missing spec and schema-invalid spec                                      | Exit 1 with validation errors       |                 PASS                  |
| **A1** | Audit         | `token-audit`                                                                   | Passing audit on compliant 3-tier token tree                                     | Exit 0, audit pass stamp            |                 PASS                  |
| **A2** | Audit         | `token-audit`                                                                   | Audit with `--json` outputs structured diagnostics                               | Exit 0, valid JSON payload          |                 PASS                  |
| **A3** | Audit         | `token-audit`                                                                   | Detect low contrast override and fail with remediation advice                    | Exit 1, remedy guidance             |                 PASS                  |
| **A4** | Audit         | `token-audit`                                                                   | Theme filter (`--theme light`) and custom ratio floor (`--min-ratio 7.0`)        | Floor strictly enforced             |                 PASS                  |
| **A5** | Audit         | `token-audit`                                                                   | Reject tampered token tree where hash does not match provenance                  | Exit 1, tamper rejection            |                 PASS                  |
| **A6** | Audit         | `token-audit`                                                                   | Reject missing tokens directory                                                  | Exit 1, missing directory           |                 PASS                  |
| **B1** | Build         | `token-build`                                                                   | Compile audited tokens to CSS variables and Tailwind @theme (light)              | Exit 0, `tokens.css`, `theme.css`   |                 PASS                  |
| **B2** | Build         | `token-build`                                                                   | Compile dark theme tokens                                                        | Exit 0, dark artifacts              |                 PASS                  |
| **B3** | Build         | `token-build`                                                                   | Compile UI profile `shadcn`                                                      | Exit 0, `shadcn.css`                |                 PASS                  |
| **B4** | Build         | `token-build`                                                                   | Custom CSS custom property prefix (`--prefix ds`)                                | Exit 0, `--ds-*` variables          |                 PASS                  |
| **B5** | Build         | `token-build`                                                                   | Interactive visualizer compilation (`--visualizer`)                              | Exit 0, visualizer HTML             |                 PASS                  |
| **B6** | Build         | `token-build`                                                                   | Enforce audit pass stamp gate; refuse unaudited tree without `--allow-unaudited` | Exit 1 without stamp, exit 0 bypass |                 PASS                  |
| **B7** | Build         | `token-build`                                                                   | Overwrite protection and hand-edit tamper refusal                                | Exit 1 without force                |                 PASS                  |
| **B8** | Build         | `token-build`                                                                   | Spec binding mismatch refusal (tokens generated from spec A, built with spec B)  | Exit 1, mismatch rejected           |                 PASS                  |
| **B9** | Build         | `token-build`                                                                   | Dry-run safety and invalid argument handling                                     | Exit 0 dry, exit 1 bad args         |                 PASS                  |
| **F1** | Figma         | `token-build`                                                                   | Round-trip Figma variables: export tokens -> figma JSON -> import tokens         | Exit 0, lossless roundtrip          |                 PASS                  |
| **F2** | Figma         | `token-build`                                                                   | Figma guards: overwrite refusal, invalid payload rejection                       | Exit 1 on conflicts                 |                 PASS                  |
| **R1** | Route         | `ask-kami`                                                                      | Route on empty project: detect missing spec, suggest extract and style           | Exit 0, next action commands        | ❌ FAIL (stale `./scripts` assertion) |
| **R2** | Route         | `ask-kami`                                                                      | State transitions across lifecycle: spec -> tokens -> audited -> built           | Exit 0, correct next skills         |                 PASS                  |
| **R3** | Route         | `ask-kami`                                                                      | Route with `--json` summary and handling of invalid style-spec                   | Exit 0 JSON, exit 1 on corrupt spec |                 PASS                  |
| **D1** | Diagnose      | `improve-design-system`                                                         | Diagnose empty project: report missing components, recommend extract/style       | Exit 0, structured JSON             |                 PASS                  |
| **D2** | Diagnose      | `improve-design-system`                                                         | Diagnose healthy built system: zero errors, status PASS                          | Exit 0, clean system report         |                 PASS                  |
| **D3** | Diagnose      | `improve-design-system`                                                         | Diagnose low contrast tokens and tampered files                                  | Exit 0, findings populated          |                 PASS                  |
| **D4** | Diagnose      | `improve-design-system`                                                         | Diagnose missing build artifacts and handle path overrides                       | Exit 0, missing build flagged       |                 PASS                  |

**Summary**: 38 Passed, 1 Failed, 0 Skipped (97.4% scenario pass rate).

---

## 5. Bundled Skills Health & Readiness Assessment

| Skill                       | Entrypoint / Mechanism           |    CLI Status     |            `SKILL.md` Agent Contract            |            Assets & Packaging            |  Readiness Verdict   |
| :-------------------------- | :------------------------------- | :---------------: | :---------------------------------------------: | :--------------------------------------: | :------------------: |
| **`ask-kami`**              | `scripts/route.mjs`              |    Operational    |     Preflight guard, resolved sibling paths     |          Routing table present           | **Production Ready** |
| **`token-extract`**         | `scripts/extract.mjs`            |    Operational    |     Preflight guard, resolved sibling paths     |       Heuristics reference present       | **Production Ready** |
| **`token-style`**           | Conversational interview         | N/A (Prompt-only) | Preflight guard, handoff to `<token-math-root>` |    All 5 references & 2 specs present    | **Production Ready** |
| **`token-math`**            | `scripts/generate.mjs`           |    Operational    |     Preflight guard, resolved sibling paths     | Templates, scales, spec examples present | **Production Ready** |
| **`token-audit`**           | `scripts/audit.mjs`              |    Operational    |     Preflight guard, resolved sibling paths     |  Contrast reference & examples present   | **Production Ready** |
| **`token-build`**           | `scripts/build.mjs`, `figma.mjs` |    Operational    |     Preflight guard, resolved sibling paths     |      UI profiles & examples present      | **Production Ready** |
| **`improve-design-system`** | `scripts/diagnose.mjs`           |    Operational    |     Preflight guard, resolved sibling paths     |     Report format reference present      | **Production Ready** |

---

## 6. Implemented Remediations

| Finding | Change                                                                                     | Commit    |
| :------ | :----------------------------------------------------------------------------------------- | :-------- |
| S1      | `R1` asserts normalized `/token-extract/scripts/extract.mjs` and rejects `node ./scripts/` | `5811c5d` |
| S2      | Permanent `scripts/smoke-skill-contract.mjs`, wired into `npm run smoke`                   | `caf6adc` |
| S3      | CI runs both smoke scripts after `npm run check` and installs Chromium first               | `5ef5a5e` |
| S4      | `P3` verifies static directories for all 7 skills                                          | `5811c5d` |
| S7      | CI installs Chromium before smoke                                                          | `5ef5a5e` |
| S5      | Prompt-only surfaces remain covered by the `SKILL.md` contract, not executable smoke       | —         |
| S6      | Local `npm run smoke` still rebuilds; CI invokes the scripts directly to avoid a rebuild   | —         |

The release note for the code changes is `.changeset/smoke-contract-and-ci.md`.
