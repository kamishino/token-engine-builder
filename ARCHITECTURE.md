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

| Module        | Owns                                                                                                                                                                                   | Key exports                                                                                                                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`    | DTCG 3-tier types, `StyleSpec` (skill 1→2 contract), `AuditReport`, `BuildTokensOptions`                                                                                               | `DesignToken`, `TokenGroup`, `OklchColor`, `ColorRamp`, `StyleSpec`, `ContrastResult`                                                                                                                     |
| `colors.ts`   | OKLCH engine on `colorjs.io/fn` partials; registers only `sRGB` + `OKLCH` (rest tree-shaken)                                                                                           | `parseToOklch`, `dtcgToOklch`, `formatOklch`, `oklchToHex`, `dtcgColorValue`, `contrastRatio`, `checkContrast`, `buildRamp` (anchor lands exactly on step 500; chroma tapers 100%→10% by offset distance) |
| `scales.ts`   | Modular type (`base × ratioⁿ`), 4px spacing, `fluidClamp`, radius                                                                                                                      | `modularScale`, `typographyScale`, `fluidClamp`, `spacingScale` (comfortable 1.0 / compact 0.875), `radiusScale`                                                                                          |
| `compiler.ts` | SD v5 programmatic builder: custom `color/oklch` + `dimension/rem` transforms, `token-engine/css-variables` (DTCG mode) + `tailwind/v4-theme` + `token-engine/component-specs` formats | `buildTokens`, `loadTokenSources`, `expandSource`, `oklchTransform`, `dimensionRemTransform`                                                                                                              |
| `paths.ts`    | Portable skill paths (`import.meta.url`) vs cwd-relative user paths                                                                                                                    | `scriptDir`, `skillRoot`, `templatePath`, `assetPath`, `getArg`, `hasFlag`, `fromCwd`                                                                                                                     |

## 3. Token tiers and alias discipline

- `primitive/` — only raw values: OKLCH color ramps (`{colorSpace:'oklch', components:[l,c,h]}` + hex fallback), px dimensions, font stacks/weights.
- `semantic/` — one file per theme (`light`/`dark`), identical paths, `{alias}` values only.
- `component/` — button/card/input, `{alias}` values only (color → semantic roles; spacing/radius → primitives).
- `audit.mjs` checks 7 fg/bg pairs per theme (body, secondary, surface, action, button, card, input), every alias in the merged tree resolves (cycle depth ≤16), and zero raw values/hex above Tier 1. `--min-ratio` default 4.5; negative probe `--min-ratio 21` exits 1.

## 4. Build pipeline — four decisions that each fixed a real failure

1. **One Vite pass per skill** (`scripts/build-all.mjs`, `SKILL_ENTRY`, `inlineDynamicImports`). A single multi-entry build emits shared `dist/_chunks/`, so a copied skill folder breaks. Per-skill passes inline shared code into each `.mjs`: generate 49 kB, audit 48 kB, build 1.5 MB (Style Dictionary inlined). `build-all.mjs` accepts skill names for filtered rebuilds (dist/ wipes only on full builds); each pass stamps `dist/<skill>/.buildstamp` (JSON `{builtAt, bundleHash}`), and `scripts/link-skills.mjs` (`npm run deploy`) rebuilds skills whose sources are newer than their stamp or whose bundle bytes no longer match `bundleHash`, then junction-links `dist/*` into `~/.agents/skills` (pruning dead links, never touching foreign entries).
2. **SSR/Node build** (`resolve.conditions: ['node']`, `ssr: { target: 'node', noExternal: true }`, all Node builtins external, `treeshake.moduleSideEffects: false`, esbuild minify, `#!/usr/bin/env node` banner). Default client conditions resolve SD's `./fs` export to the browser memfs shim — outputs go to memory and zero files land on disk.
3. **In-process token merge, inline `tokens`** (`loadTokenSources`/`expandSource` in `compiler.ts`). SD's bundled glob loader (`@bundled-es-modules/glob`) does not survive re-bundling into a standalone `.mjs`; build globs are cwd-relative with forward slashes, expanded here instead. `build.mjs` fails closed when an expected output file is missing.
4. **Anti-Tampering Guard** (`src/shared/guard.ts`). Generated outputs carry provenance manifests (`.token-engine-tokens-manifest.json` in token trees, `.token-engine-css-manifest.json` in CSS out dirs) with per-file SHA-256 hashes and the input hash. `generate`/`build` refuse to overwrite changed or missing manifest files unless `--force` (extra user files never block); `audit` verifies the tokens manifest when present; output dirs equal to/ancestral to cwd or the home dir are refused. Full findings: `docs/security/architecture-audit.md`.

## 5. Verified behavior (smoke, not tests)

Portable proof: `dist/*` copied outside the repo, run from a foreign cwd with no install. Generate lands the anchor exactly (`oklch(60% 0.15 250deg)` at `brand.500`); audit passes light+dark (ratios 5.21–17.09 across 7 pairs/theme); dark build emits 42 `oklch()` values per file, 0 `undefined`; rem dimensions rounded to 4dp (`--spacing-1: 0.25rem`); Tailwind `@theme` carries kebab-case names in matching namespaces (`--color-*`, `--text-*`, `--radius-*`, `--font-*`). Sample emitted CSS passes stylelint (`npm run lint:css`). Tamper proof: hand-editing a generated token file makes `audit` fail on provenance and `generate`/`build` refuse overwrite without `--force`. There is no test suite — this smoke run is the verification gate.
