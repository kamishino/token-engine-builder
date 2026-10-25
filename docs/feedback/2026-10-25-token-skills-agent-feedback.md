---
title: Token-* Agent Skills — Real-World Agent Experience Feedback (PROS, CONS, & Suggestions)
date: 2026-10-25
author: AI Coding Assistant (omp)
evaluated-project: hordes-automation
target-repository: token-engine-builder
status: submitted
tags: [design-tokens, dtcg, agent-skills, developer-experience, evaluation, style-dictionary]
---

# Token-* Agent Skills — Real-World Experience Feedback

## Executive Summary

During an end-to-end integration within a high-density, real-time TypeScript gaming monorepo (`hordes-automation` featuring WebGL, Playwright automation harnesses, and custom Shadow DOM UI HUDs), we put the `token-*` agent skills suite through an exhaustive real-world trial:
- `token-extract` (heuristic code-to-spec extraction)
- `token-math` (deterministic DTCG 3-tier mathematical generator)
- `token-audit` (dual-gate WCAG 2.1 + APCA contrast gatekeeper)
- `token-build` (Style Dictionary compiler to CSS custom properties & component specs)

This document provides authentic feedback from an autonomous coding agent perspective, detailing the **complete journey from cold start to production deployment**, the **specific frustrations and friction points** encountered during execution, a balanced analysis of **PROS and CONS**, and **prioritized architectural recommendations** to enhance the DX and resilience of the skills suite for human developers and autonomous agents alike.

---

## 1. The Journey: From Cold Start to Production Integration

### Phase 1: Out-of-Order Skill Invocation ("The Cold Start Wall")
The journey began unexpectedly when the user prompted:
> *"[IMPORTANT: User invoked the "token-audit" skill; follow its instructions.]"*

At that moment, the target repository (`hordes-automation`) was a vanilla monorepo with hand-crafted CSS rules in `packages/userscript/src/ui/hud-styles.ts`. There was no `tokens/` directory and no `style-spec.json`.

Following the skill prompt, we resolved `<skill-root>` as `C:\Users\toanh\.agents\skills\token-audit` and executed:
```bash
node C:/Users/toanh/.agents/skills/token-audit/scripts/audit.mjs --tokens tokens --min-ratio 4.5
```
**Immediate Failure:**
```
tokens dir not found: C:\Users\toanh\Desktop\Projects\Automation\tokens
Command exited with code 1
```
The script crashed with code 1. There was no pipeline breadcrumb or agent instruction explaining: *"Tokens directory not found. Did you mean to run token-extract or token-style first?"*

### Phase 2: Backtracking & Discovery (`token-extract`)
Recognizing that `tokens/` had to be constructed from existing project styling, we inspected the available skills and located `token-extract`. We ran:
```bash
node C:/Users/toanh/.agents/skills/token-extract/scripts/extract.mjs --root . --out style-spec.json
```
**The Breakthrough:**
`token-extract` scanned the codebase across TypeScript controllers and markdown research documents, discovering color occurrences:
- `oklch(71.067% 0.03511 256.79deg)` in `debugger-console.ts` (Score: 196)
- `oklch(75.351% 0.13899 232.66deg)` in `docs/research/2d-3d-map-calculations.md` (Score: 168)
- `oklch(71.374% 0.14338 254.62deg)` in `skills-dialog.ts` (Score: 106)

It automatically grouped them into an analogous harmony (`lilac` primary, `wisteria` secondary, `eucalyptus` accent, neutral hue `256.79deg`) and emitted a clean, valid `style-spec.json`.

### Phase 3: Mathematical Generation (`token-math`)
With `style-spec.json` generated, we executed the generator:
```bash
node C:/Users/toanh/.agents/skills/token-math/scripts/generate.mjs --spec style-spec.json --out tokens --force
```
**Outcome:**
`token-math` generated the 3-tier DTCG structure under `tokens/`:
- `tokens/primitive/`: 11-step OKLCH color ramps, spacing scales (4px base), radii, typography, and shadows.
- `tokens/semantic/`: `light.tokens.json`, `dark.tokens.json`, and `high-contrast.tokens.json` aliasing primitive scales into semantic roles (`text.primary`, `bg.canvas`, `action.primary`, `border.default`).
- `tokens/component/`: Button, input, card, badge, dialog, tooltip, and avatar DTCG aliases.

**First Friction Note:**
The success banner printed:
`next: node C:\Users\toanh\Desktop\Projects\kami-skills\token-engine-builder\dist\token-audit/scripts/audit.mjs --tokens tokens --min-ratio 4.5`
Notice that it printed an absolute path to the skill developer's local workstation repository rather than the deployed agent skill root or relative path.

### Phase 4: Verification Gate (`token-audit`)
We re-ran the audit gatekeeper:
```bash
node C:/Users/toanh/.agents/skills/token-audit/scripts/audit.mjs --tokens tokens --min-ratio 4.5
```
**Outcome:**
The dual-gate check audited all 42 foreground/background role pairs across all three themes (`dark`, `high-contrast`, `light`).
- Every pair passed WCAG $\ge 4.5:1$ (body text ranged from $5.20:1$ to $17.09:1$).
- Every pair passed APCA $|Lc| \ge 60$ (ranging from $60.5$ to $102.6$).
- `audit PASS` (Exit code 0).
- Emitted `.token-engine-audit.json` cryptographic stamp.

### Phase 5: Style Dictionary Compilation & `@tokens/` Packaging
The user requested:
> *"From the tokens, please install Style Dictionary, then, reflect to our hardcoded values. Tokenized it to @tokens/ and regenerate the CSS by using Style Dictionary."*

We created `packages/tokens` in the monorepo, installed `style-dictionary` (`5.7.0`), and invoked `token-build`:
```bash
node C:/Users/toanh/.agents/skills/token-build/scripts/build.mjs --tokens tokens --out packages/tokens/dist --theme dark --spec style-spec.json --force
```
This compiled `dist/tokens.css` (293 lines of CSS custom properties), `dist/theme.css` (Tailwind v4 `@theme`), and component specs.

### Phase 6: Production Refactoring & Shadow DOM In-Browser Proof
Because `tokens.css` output `:root { ... }` rules, we needed to make these tokens pierce the HUD's Web Component Shadow DOM (`#hordes-automation-host`).
1. In `packages/userscript/vite.config.ts`, we aliased `@tokens` to `packages/tokens`.
2. In `packages/userscript/src/ui/hud-styles.ts`, we imported `@tokens/dist/tokens.css?inline` and assigned them to `:host { ... }`.
3. Replaced hardcoded literals:
   - `#10131dcc` $\to$ `var(--hud-bg-panel, var(--color-bg-canvas))`
   - `#151b27` $\to$ `var(--hud-bg-surface, var(--color-bg-surface))`
   - `rgba(25, 32, 45, 0.75)` $\to$ `var(--hud-bg-card, var(--color-bg-raised))`
   - `#dae8ea` $\to$ `var(--hud-text-primary, var(--color-text-primary))`
   - `#a6dcd5` $\to$ `var(--hud-text-secondary, var(--color-text-secondary))`
   - `#5b858e` $\to$ `var(--hud-text-muted, var(--color-text-tertiary))`
   - `#38bdf8` $\to$ `var(--hud-accent-action, var(--color-action-primary))`
4. Verified with headless Playwright in Chromium: `#hordes-automation-host` mounted with `.bento-hud` computed styles matching the tokenized variables (`rgba(16, 19, 29, 0.8)` and `rgb(218, 232, 234)`), with 0 page errors.

---

## 2. Real-World Frustrations & Friction Points

During this hands-on journey, an agent operating autonomously encountered several sharp edges:

### 1. The "Cold Start" Wall on Missing Prerequisites
- **The Issue:** When a user invokes `token-audit` or `token-build` in a repository before tokens exist, the CLI throws an unhandled exit code 1 (`tokens dir not found`).
- **Why it frustrates:** An AI agent lacks human intuition when a command fails abruptly. Without helpful guidance in stdout (e.g. *"Tokens missing! Run `token-extract` to scan your code, or `token-style` to define a brand"*), the agent may hallucinate token files or apologize to the user instead of advancing the task autonomously.

### 2. Leaked Hardcoded Development Paths in CLI Hints
- **The Issue:** Upon completing `token-math`, stdout printed:
  ```
  next: node C:\Users\toanh\Desktop\Projects\kami-skills\token-engine-builder\dist\token-audit/scripts/audit.mjs --tokens tokens --min-ratio 4.5
  ```
- **Why it frustrates:** The CLI output hardcoded the author's local build environment path (`kami-skills\token-engine-builder\dist\...`) rather than resolving the user's active `<token-audit-root>` (`~/.agents/skills/token-audit`) or printing a portable command. In sandboxed CI or other machines, following this printed command will fail with `ENOENT`.

### 3. Single-Theme Build Fatigue (`token-build`)
- **The Issue:** `build.mjs` only accepts one theme per execution (`--theme dark`).
- **Why it frustrates:** Modern web applications support light, dark, and high-contrast modes simultaneously. To compile all themes, an agent has to execute three separate, serial CLI commands (`--theme dark --out dist/dark`, `--theme light --out dist/light`, `--theme high-contrast --out dist/hc`), and then manually write glue code to combine them. A `--theme all` flag is sorely missing.

### 4. Missing TypeScript / JavaScript Token Dictionary Output
- **The Issue:** Style Dictionary is widely celebrated for multi-platform delivery, but `token-build` exclusively generated `tokens.css` and `theme.css`.
- **Why it frustrates:** In modern TypeScript projects, developers and bots need typed JavaScript objects (`tokens.ts` / `index.d.ts`) to consume token values inside Canvas renderers, WebGL shaders, SVG generators, and test suites. We were forced to write an auxiliary script (`build.mjs`) to parse `tokens.css` with regular expressions to create `index.js` and `index.d.ts`.

### 5. Shadow DOM & Web Component Scoping Gap
- **The Issue:** `tokens.css` output targets `:root { ... }` exclusively.
- **Why it frustrates:** In Shadow DOM web components (like the HUD in `hordes-automation`), styles inside the shadow root do not inherit `:root` custom properties if the stylesheet is bundled and injected into the shadow root directly. We had to manually wrap and re-map `:root` variables to `:host { ... }`.

### 6. Missing Monorepo Workspace Scaffolding Bridge
- **The Issue:** The skill outputs files into an arbitrary directory (`tokens/` or `build/`), but offers no scaffolding to package them into an npm/workspace package (`@tokens` / `package.json` with exports).
- **Why it frustrates:** Converting generated token files into an importable monorepo package requires several manual setup steps: writing `package.json`, configuring `tsconfig.json` path mappings, setting up bundler aliases, and configuring build scripts.

---

## 3. PROS & CONS Evaluation

### PROS (Architectural & Algorithmic Strengths)
- **Mathematical Determinism (Zero LLM Hallucination):** Ramps and typography are calculated by strict formulas in OKLCH space. When given the same `style-spec.json`, `token-math` generates identical, reproducible output every time.
- **Dual-Gate Accessibility Assurance:** Checking both WCAG 2.1 (ratio) and APCA ($|Lc|$) ensures tokens work across modern perception models without subjective guesswork.
- **Evidence-First Codebase Mining:** `token-extract` solves the hardest part of design token adoption—extracting existing colors from messy CSS and mapping them into an analogous palette automatically.
- **Tamper-Proof Audit Stamps:** The cryptographic `.token-engine-audit.json` stamp enforces pipeline hygiene: you cannot accidentally compile un-audited or failing tokens with `token-build`.
- **Strict 3-Tier DTCG Structure:** Separating `primitive/` (raw scales), `semantic/` (contextual roles), and `component/` (widget bindings) adheres to W3C Design Tokens Community Group standards.

### CONS (Developer Experience & Agent Usability Gaps)
- **Pipeline Fragmentation:** The 5 core skills (`token-extract`, `token-style`, `token-math`, `token-audit`, `token-build`) require individual manual orchestration instead of offering a unified pipeline command (`token-pipeline run`).
- **Hardcoded Absolute Paths in Success Banners:** Scripts print hardcoded author paths that fail outside the development worktree.
- **No Native TypeScript/ESM Dictionary Export:** Lacks `.d.ts` and `.js` exports for programmatic token consumption in TypeScript.
- **No Batch Theme Compilation:** No support for `--theme all`.
- **Inflexible Root Selector:** Hardcoded `:root` prevents seamless Web Component and Shadow DOM usage without manual post-processing.

---

## 4. Prioritized Architectural Recommendations

| Priority | Feature / Improvement | Target Skill | Implementation Impact |
| :--- | :--- | :--- | :--- |
| **P1** | **Dynamic Path Hints** | `token-math`, `token-extract` | Replace hardcoded author paths with dynamic `<token-audit-root>` or relative CLI commands. |
| **P1** | **Batch Multi-Theme Build (`--theme all`)** | `token-build` | Allow compiling `light`, `dark`, and `high-contrast` in a single pass into a structured directory or combined CSS. |
| **P2** | **TypeScript/ESM Token Exports (`--format ts,css`)** | `token-build` | Output `index.js` and `index.d.ts` with typed token objects alongside `tokens.css`. |
| **P2** | **Resilient Cold-Start Handling** | `token-audit`, `token-build` | Detect missing `tokens/` and print actionable hints pointing to `token-extract` / `token-style` instead of crashing. |
| **P3** | **Configurable CSS Scope (`--selector :host, :root`)** | `token-build` | Support emitting custom properties on `:host` or custom selectors for Web Components and Shadow DOM. |
| **P3** | **Workspace Package Scaffolding (`--package @tokens`)** | `token-build` | Optionally generate a `package.json` with `./css` and `.` exports ready for monorepo consumption. |
| **P4** | **Unified Pipeline Runner (`kami sync`)** | `ask-kami` / pipeline | Provide a single command to run extract $\to$ math $\to$ audit $\to$ build end-to-end. |

---

## Conclusion

The `token-*` suite represents a best-in-class implementation of mathematical, deterministic design token engineering. Its color science (OKLCH, APCA, analogous harmony calculation) is mathematically sound, and its automated audit gatekeeper provides ironclad accessibility guarantees.

By addressing path hint portability, adding multi-theme batch builds, and supporting native TypeScript dictionary exports, the suite can evolve from a set of powerful individual tools into a frictionless, end-to-end design token pipeline for human engineers and autonomous agents alike.
