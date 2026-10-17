# AGENTS.md — token-engine-builder

> Human-written onboarding. Every line runs in every session — keep it under ~150 lines. Rationale lives in `ARCHITECTURE.md`; this file states rules.

## WHAT — stack and layout

TypeScript + Vite (SSR/Node lib mode) builder that packages colocated AI agent skills. `src/skills/<skill>/` → `dist/<skill>/`, 1:1. Each skill is standalone after copy to `~/agents/skills/<skill>/` (node only, no install).

- `src/shared/` — bundled engine: `colors.ts` (OKLCH), `scales.ts` (type/spacing), `compiler.ts` (Style Dictionary v4), `paths.ts` (portable resolution), `types.ts` (DTCG types).
- `src/skills/` — 4 skills: `1-design-style` (interview → `style-spec.json`), `2-token-math` (`generate.mjs` → `tokens/`), `3-token-audit` (`audit.mjs` → WCAG gate), `4-token-build` (`build.mjs` → CSS + Tailwind v4).
- `scripts/build-all.mjs` — one Vite pass per skill so no shared chunk leaks between `dist/<skill>/`.
- `vite.config.ts` — entry discovery, `sync-skill-packages` plugin (`SKILL.md` + `templates/` + `assets/` mirror, `chmod 0o755`).

## WHY — intent

One OKLCH anchor derives the whole token system; deterministic math downstream. Tiers: raw values only in `1-primitive/`; `2-semantic/` (per-theme, same paths) and `3-component/` are `{alias}`-only. `audit.mjs` enforces it — exit 0 ships, exit 1 stops.

## HOW — commands (these get used; nothing else is blessed)

```bash
npm install        # all deps are devDependencies — Vite inlines them
npm run check      # typecheck + lint + build (run before yielding)
npm run build      # → dist/<skill>/ via scripts/build-all.mjs
```

Node `>=20`. No test suite — portable smoke (copied `dist/*`, foreign cwd: generate → audit → build) is the proof.

## Hard invariants (never violate; ESLint enforces #1)

1. `colorjs.io/fn` partials only (`ColorSpace`, `sRGB`, `OKLCH`, `to`, `serialize`, `contrastWCAG21`, `parse`); register just `sRGB` + `OKLCH`. Monolithic `colorjs.io` entry is banned.
2. `devDependencies` only. Vite inlines everything; `node:*` stays external.
3. Bundled scripts resolve `templates/` + `assets/` from `import.meta.url` (`paths.ts`), never from `process.cwd()`. User inputs (specs, `--out`) are cwd-relative by design.
4. Tier discipline: no `#hex`/`oklch()`/px literals outside `1-primitive/`; semantic + component tokens alias only.

## Working rules

- Edit the colocated skill, not the mirror: `src/skills/<skill>/scripts/*.ts`, templates, assets. Never hand-edit `dist/`.
- Shared code goes in `src/shared/`; skills import it — Rollup inlines it per skill at build time.
- New CLI flag → update that skill's `SKILL.md` usage line in the same commit.
- Token schema move → update `2-token-math` templates + `compiler.ts` + audit expectations together.
- Build pipeline move → update `vite.config.ts` + `scripts/build-all.mjs` + `ARCHITECTURE.md` §4 together.
- Docs never restate `package.json` scripts or `--help` output — point at them.

## Progressive disclosure (read on demand)

- Build rationale (per-skill passes, SSR/Node `fs` fix, inline token merge): `ARCHITECTURE.md` §4.
- Module contracts (exports per shared file): `ARCHITECTURE.md` §2.
- Token tier + alias rules: `ARCHITECTURE.md` §3.
- Skill runtime contract (entry conditions, exit codes): each `src/skills/<n>*/SKILL.md`.
- Token input schema: `src/skills/2-token-math/assets/style-spec.schema.json`.
