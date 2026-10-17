# token-engine-builder

Builds and packages self-contained AI agent skills for 3-tier W3C DTCG design tokens. Each skill under `src/skills/<skill-name>/` builds 1:1 into `dist/<skill-name>/` — copy that folder to `~/agents/skills/<skill-name>/` and it runs standalone with plain `node`, no `npm install`.

## Why this exists

Hand-authored design tokens drift: hex values leak into semantic layers, contrast goes unmeasured, and build configs depend on toolchain installs. This repo derives the whole system from one OKLCH anchor through deterministic math (ramps, modular type, 4px spacing), gates it on measured WCAG 2.1 contrast, and ships each pipeline stage as a portable skill with its dependencies inlined at build time.

Built with TypeScript, Vite (SSR/Node lib mode), `colorjs.io/fn` partial imports (only `sRGB` + `OKLCH` registered), and Style Dictionary v4 driven programmatically.

## Pipeline

```text
design-style      Socratic interview first          → style-spec.json
token-math        generate.mjs --spec …         → tokens/ (primitive → semantic → component)
token-audit       audit.mjs --tokens tokens         → WCAG 2.1 gate (exit 0/1)
token-build       build.mjs --tokens tokens         → tokens.css + Tailwind v4 theme.css
```

Raw values live only in `primitive/`; semantic (per-theme) and component tokens are `{alias}`-only. See `ARCHITECTURE.md` §3.

## Install

Requires Node `>=20`.

```bash
npm install        # everything is a devDependency — Vite inlines it at build time
npm run check      # typecheck + lint + build (run before yielding)
npm run build      # → dist/<skill>/ (SKILL.md + scripts/*.mjs + templates/ + assets/)
```

## Use

```bash
# First, record the anchor (interview in the design-style skill, or copy the example)
cp dist/design-style/assets/style-spec.example.json style-spec.json

# Next, generate the 3-tier tree
node dist/token-math/scripts/generate.mjs --spec style-spec.json --out tokens

# Then gate on contrast (exit 0 ships, exit 1 stops)
node dist/token-audit/scripts/audit.mjs --tokens tokens --min-ratio 4.5

# Finally, build one theme at a time, then deploy the skill folder
node dist/token-build/scripts/build.mjs --tokens tokens --out build --theme light
cp -r dist/token-build ~/agents/skills/token-build
```

Each `dist/<skill>/` also carries its own `SKILL.md` (agent instructions), `templates/`, and `assets/` — see `ARCHITECTURE.md` §1. Agents working in this repo should start at `AGENTS.md`.

## Contributing

Small, colocated changes: edit `src/skills/<skill>/` or `src/shared/`, run `npm run check`, and update the owning doc in the same commit (`AGENTS.md` for rules, `ARCHITECTURE.md` for design moves). Conventional commits (`type(scope): description`, ≤72 chars, imperative). Never hand-edit `dist/`.

## License

MIT — see [LICENSE](LICENSE).
