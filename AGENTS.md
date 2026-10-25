# AGENTS.md — token-engine-builder

> Human-written onboarding. Every line runs in every session — keep it under ~150 lines. Rationale lives in `ARCHITECTURE.md`; this file states rules.

## WHAT — stack and layout

TypeScript + Vite (SSR/Node lib mode) builder that packages colocated AI agent skills. `src/skills/<skill>/` → `dist/<skill>/`, 1:1. Each skill is standalone after copy into an agent's skills directory (for example `~/.agents/skills/<skill>/`; node only, no install).

- `src/shared/` — bundled engine: `colors.ts` (OKLCH), `scales.ts` (type/spacing), `compiler.ts` (Style Dictionary v5), `paths.ts` (portable resolution), `types.ts` (DTCG types).
- `src/cli/` — unified deterministic CLI (`bin/token-engine` → `dist/cli/token-engine.mjs`): single-pass `sync`, `init`, `audit`, `build`, `extract`, `scaffold`.
- `src/skills/` — flagship cognitive skill `design-tokens` (Matt Pocock model: discovery, Socratic palette, single-pass sync, framework wiring) + 7 legacy micro-skills kept as deprecated compatibility bridges.
- `scripts/build-all.mjs` — one Vite pass per skill/CLI so no shared chunk leaks into `dist/`.
- `vite.config.ts` — entry discovery, `sync-skill-packages` plugin (`SKILL.md` + `templates/` + `assets/` + `examples/` + `references/` mirror, `chmod 0o755`).
## WHY — intent

Tiers: raw values only in `primitive/`; `semantic/` (per-theme, same paths) and `component/` are `{alias}`-only. `audit.mjs` enforces it — exit 0 ships, exit 1 stops.

## HOW — commands (these get used; nothing else is blessed)

```bash
npm install        # all deps are devDependencies — Vite inlines them
npm run check      # typecheck + lint + lint:skills + test + build + lint:css
npm run build      # → dist/<skill>/ + dist/cli/ via scripts/build-all.mjs
npm run deploy     # link dist/* into ~/.agents/skills (default; --dir <path> for others; rebuilds stale, prunes dead)
npx token-engine   # unified CLI runner: sync, init, audit, build, extract, scaffold
```

Node `>=22.12`. Pure contracts verified via `npm test` (`node:test` unit tests in `test/`); portable smoke (`lint:css`) proves `dist/*` generation and gold parity.

## Hard invariants (never violate; ESLint enforces #1)

1. `colorjs.io/fn` partials only (`ColorSpace`, `sRGB`, `OKLCH`, `to`, `serialize`, `contrastWCAG21`, `parse`); register just `sRGB` + `OKLCH`. Monolithic `colorjs.io` entry is banned.
2. `devDependencies` only. Vite inlines everything; `node:*` stays external.
3. Bundled scripts resolve `templates/` + `assets/` from `import.meta.url` (`paths.ts`), never from `process.cwd()`. User inputs (specs, `--out`) are cwd-relative by design.
4. Tier discipline: no `#hex`/`oklch()`/px literals outside `primitive/`; semantic + component tokens alias only.
5. Agent-facing paths: SKILL.md commands use `<skill-root>` (the folder containing the loaded `SKILL.md`) and `<target-skill-root>` for a handoff target. Never hardcode a home-directory install path; the agent resolves the placeholder, the human substitutes their install folder. Every SKILL.md with a <...-root> command carries the literal-execution guard; lint:skills enforces it.

## Working rules

- Edit the colocated skill, not the mirror: `src/skills/<skill>/scripts/*.ts`, templates, assets. Never hand-edit `dist/`.
- Shared code goes in `src/shared/`; skills import it — Rollup inlines it per skill at build time.
- New CLI flag → update that skill's `SKILL.md` usage line in the same commit.
- Token schema move → update `token-math` templates + `compiler.ts` + audit expectations together.
- Build pipeline move → update `vite.config.ts` + `scripts/build-all.mjs` + `ARCHITECTURE.md` §4 together.
- Docs never restate `package.json` scripts or `--help` output — point at them.
- Every user-visible change ships with a changeset file (`.changeset/<name>.md`, patch/minor); `npm run release` consumes them into a version bump.

## Skill lifecycle (adding, renaming, deprecating)

- New skill: folder `src/skills/<slug>/` with `SKILL.md` (`name` = slug, quoted trigger-style `description`, `license`, `compatibility`), `scripts/`, `templates/`, `assets/` as needed. Use `<skill-root>`/`<target-skill-root>` in commands; never hardcode an install directory. Register it: pipeline order words in description, README pipeline + Use sections, ARCHITECTURE diagram if it moves a seam, changeset file. `lint:skills` enforces frontmatter; `check` proves the bundle.
- Rename: move folder + update every reference (grep the old slug, excluding lock/dist) + docs + changeset, one commit, no aliases.
- Deprecate: keep the folder one release with a `deprecated:` frontmatter note and a changeset, remove next release.

## Progressive disclosure (read on demand)

- Build rationale (per-skill passes, SSR/Node `fs` fix, inline token merge): `ARCHITECTURE.md` §4.
- Module contracts (exports per shared file): `ARCHITECTURE.md` §2.
- Token tier + alias rules: `ARCHITECTURE.md` §3.
- Skill runtime contract (entry conditions, exit codes): each `src/skills/<skill>/SKILL.md`.
- Token input contract: `src/shared/types.ts` (`StyleSpec`), enforced by `src/shared/spec.ts`.
- Product priorities and deferred register: `docs/ROADMAP.md`.
