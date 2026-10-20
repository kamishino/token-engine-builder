# ARCHITECTURE.md — token-engine-builder

Deep design: module contracts, token discipline, and the three load-bearing build decisions. `AGENTS.md` states the rules; this file explains why.

## 1. System overview

```
style-spec.json ──generate.mjs──▶ tokens/ (3-tier) ──audit.mjs──▶ gate (0/1) ──build.mjs──▶ tokens.css + theme.css
       ▲                              │                                                    │
 token-style                token-math                                            token-build
 (interview first)      (templates + math)            token-audit (WCAG 2.1 gatekeeper)
```

Skill packages are colocated (`src/skills/<skill>/`: `SKILL.md`, `scripts/*.ts`, `templates/`, `assets/`) and mirrored 1:1 into `dist/<skill>/` by the `sync-skill-packages` Vite plugin (`closeBundle`: copy `SKILL.md` + `templates/` + `assets/` + `examples/`, `chmod 0o755` on `scripts/*.mjs`). Per-skill `README.md` files stay in `src/` — `dist/` is production-readiness. A `dist/<skill>/` folder runs standalone: `node scripts/<name>.mjs` with no install. `token-extract` is an alternative entry beside the interview: it scans an existing project read-only and writes a candidate `style-spec.json` (evidence-ranked anchor), which still passes through `token-style`'s read-back before `token-math` consumes it.

External design-AI contracts (Stitch-format `DESIGN.md`, roadmap X1) are downstream views of this system: generated from tokens + spec, never consumed as input. The token tree and the audit gate are the only sources of truth a generated document may render; position and evidence in `docs/research/design-md-vs-design-system.md`.

## 2. Module contracts (`src/shared/`)

| Module           | Owns                                                                                         | Key exports                                                                                                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`       | DTCG 3-tier types, `StyleSpec` (skill 1→2 contract), `AuditReport`, `BuildTokensOptions`     | `DesignToken`, `TokenGroup`, `OklchColor`, `ColorRamp`, `StyleSpec`, `ContrastResult`, `AuditReport`                                                                                                    |
| `colors.ts`      | OKLCH engine on `colorjs.io/fn` partials; registers only `sRGB` + `OKLCH` (rest tree-shaken) | `parseToOklch`, `dtcgToOklch`, `formatOklch`, `oklchToHex`, `dtcgColorValue`, `checkContrast`, `buildRamp` (anchor lands exactly on step 500; chroma tapers 100%→10% by offset distance), `clampToSrgb` |
| `roles.ts`       | Semantic role path constants and canonical audit contrast pairs matrix                       | `SEMANTIC_ROLE_PATHS`, `AUDIT_PAIRS`, `FEEDBACK_ROLES`, `feedbackBgPath`, `feedbackTextPath`                                                                                                            |
| `color-names.ts` | Vendored 144-color naming dataset and nearest-color resolution                               | `nearestColorName`, `COLOR_NAMES`                                                                                                                                                                       |
| `scales.ts`      | Modular type (`base × ratioⁿ`), 4px spacing, vertical rhythm baseline, radius                | `typographyScale`, `baselinePx`, `pairedLineHeights`, `rhythmScale`, `spacingScale` (comfortable 1.0 / compact 0.875), `radiusScale`                                                                    |
| `tokens.ts`      | Deep token-tree loader: traversal, deep-merge, tier-tagged flatten, alias resolution         | `loadTokenTree`, `loadTokenSources`, `flattenTokens`, `findTokenFiles`, `expandSource`, `deepMerge`                                                                                                     |
| `guard.ts`       | Anti-Tampering Guard: provenance manifests, safe dirs, verified audit stamp                  | `checkTokensProvenance`, `writeTokensProvenance`, `checkCssProvenance`, `writeCssProvenance`, `checkAuditStamp`, `writeAuditStamp`, `removeAuditStamp`, `computeTreeHash`, `assertSafeOutDir`           |
| `spec.ts`        | StyleSpec contract parser, validator, and default normalizer                                 | `loadStyleSpec`, `validateStyleSpec`, `normalizeStyleSpec`                                                                                                                                              |
| `compiler.ts`    | SD v5 programmatic builder: custom transforms and formats internalized private to hooks      | `buildTokens`, `loadTokenSources`, `loadThemeTokens`                                                                                                                                                    |
| `ui-profiles.ts` | UI-library profile builder (shadcn, bootstrap, primevue, antd, mui, chakra, radix, fluent)   | `buildUiProfile`, `profileFileName`, `UI_PROFILE_IDS`, `UiProfileId`                                                                                                                                    |
| `paths.ts`       | Portable skill paths (`import.meta.url`) vs cwd-relative user paths                          | `scriptDir`, `skillRoot`, `templatePath`, `getArg`, `hasFlag`, `fromCwd`                                                                                                                                |

## 3. Token tiers and alias discipline

- `primitive/` — only raw values: OKLCH color ramps (`{colorSpace:'oklch', components:[l,c,h]}` + hex fallback), px dimensions, font stacks/weights.
- `semantic/` — one file per theme (`light`/`dark`), identical paths, `{alias}` values only.
- `component/` — button/card/input, `{alias}` values only (color → semantic roles; spacing/radius → primitives).
- `audit.mjs` checks the canonical audit contrast pairs matrix (text on surfaces, action, feedback, borders, components), every alias in the merged tree resolves (cycle depth ≤16), and zero raw values/hex above Tier 1. `--min-ratio` default 4.5; negative probe `--min-ratio 21` exits 1.

## 4. Build pipeline — four decisions that each fixed a real failure

1. **One Vite pass per skill** (`scripts/build-all.mjs`, `scripts/build-engine.mjs`, `SKILL_ENTRY`, Rolldown `codeSplitting: false`). A single multi-entry build emits shared `dist/_chunks/`, so a copied skill folder breaks. Per-skill passes inline shared code into each `.mjs`: generate 128 kB, audit 117 kB, build 1.17 MB (Style Dictionary inlined). Entry discovery, filtering, and `.buildstamp` verification are consolidated in `scripts/build-engine.mjs`. `build-all.mjs` accepts skill names for filtered rebuilds (dist/ wipes only on full builds); each pass stamps `dist/<skill>/.buildstamp` (JSON `{builtAt, bundleHash}`), and `scripts/link-skills.mjs` (`npm run deploy`) rebuilds skills whose sources are newer than their stamp or whose bundle bytes no longer match `bundleHash`, then junction-links `dist/*` into `~/.agents/skills` (pruning dead links, never touching foreign entries).
2. **SSR/Node build on Vite 8 / Rolldown** (`node` export condition scoped via `ssr.resolve` + `environments.ssr.resolve`, `ssr: { target: 'node', noExternal: true }`, all Node builtins external, Oxc minify, `#!/usr/bin/env node` banner). Default client conditions resolve SD's `./fs` export to the browser memfs shim — outputs go to memory and zero files land on disk. Two Rolldown-specific guards: `treeshake.moduleSideEffects` is a predicate that keeps side effects only for SD's `fs-node.js` (its top-level `setFs()` call swaps memfs → node:fs; a blanket `false` drops it and silently restores memfs), and `prettier` is external (SD lazy-imports it only inside JS/TS output formats this engine never emits; Rolldown's inlining otherwise embeds ~450 kB of dead parser). Rolldown also retains colorjs.io's full color-space registry (+~65 kB per skill vs Vite 7) — accepted, documented here.
3. **In-process token merge, inline `tokens`** (`loadTokenSources`/`expandSource` in `compiler.ts`). SD's bundled glob loader (`@bundled-es-modules/glob`) does not survive re-bundling into a standalone `.mjs`; build globs are cwd-relative with forward slashes, expanded here instead. `build.mjs` fails closed when an expected output file is missing.
4. **Anti-Tampering Guard** (`src/shared/guard.ts`). Generated outputs carry provenance manifests (`.token-engine-tokens-manifest.json` in token trees, `.token-engine-css-manifest.json` in CSS out dirs) with per-file SHA-256 hashes and the input hash. `generate`/`build` refuse to overwrite changed or missing manifest files unless `--force` (extra user files never block); `audit` verifies the tokens manifest when present; output dirs equal to/ancestral to cwd or the home dir are refused. Full findings: `docs/security/architecture-audit.md`.

## 5. Verified behavior (tests and smoke)

Dual-layer verification:

1. **Automated unit test suite** (`npm test`, `test/**/*.test.mjs` via Node.js built-in `node:test` runner with zero external dependencies). Covers pure engine contracts: OKLCH gamut clamping and ramp anchor landing at step 500 (`test/colors.test.mjs`), modular type scale and rhythm grid baseline snapping (`test/scales.test.mjs`), token tree deep-merge, tier flattening, and alias cycle detection (`test/tokens.test.mjs`), StyleSpec validation and normalization (`test/spec.test.mjs`), tamper detection and audit stamp lifecycle (`test/guard.test.mjs`), and UI profile mappings (`test/ui-profiles.test.mjs`).
2. **Portable smoke and gold-standard regression** (`npm run lint:css` via `scripts/sample-css.mjs`). Portable proof: `dist/*` run across generate, audit, and 10 build profiles (including CSS variable syntax, Tailwind v4 `@theme`, and UI profiles). Sample emitted CSS passes stylelint and 12-file gold-diff.
