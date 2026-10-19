# token-engine-builder

![check](https://github.com/kamishino/token-engine-builder/actions/workflows/check.yml/badge.svg) ![release](https://img.shields.io/github/v/release/kamishino/token-engine-builder) ![license](https://img.shields.io/github/license/kamishino/token-engine-builder)

Builds and packages self-contained AI agent skills for 3-tier W3C DTCG design tokens. Each skill under `src/skills/<skill-name>/` builds 1:1 into `dist/<skill-name>/` — copy that folder to `~/agents/skills/<skill-name>/` and it runs standalone with plain `node`, no `npm install`.

## Skills

| Skill                                              | What it does                                                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [token-extract](src/skills/token-extract/SKILL.md) | Alternative entry: scans an existing project (CSS/tokens/config) → candidate `style-spec.json` with evidence    |
| [token-style](src/skills/token-style/SKILL.md)     | Discovery scan + Socratic interview → one OKLCH anchor recorded as `style-spec.json` (Kobayashi style clusters) |
| [token-math](src/skills/token-math/SKILL.md)       | Generates the 3-tier DTCG token tree from the spec (ramps, type, spacing, radius, shadow, z-index, animation)   |
| [token-audit](src/skills/token-audit/SKILL.md)     | Dual WCAG + APCA gatekeeper — exit 0 ships, exit 1 blocks                                                       |
| [token-build](src/skills/token-build/SKILL.md)     | Compiles audited tokens to CSS custom properties + Tailwind v4 `@theme` (light / dark / high-contrast)          |

## Why this exists

Hand-authored design tokens drift: hex values leak into semantic layers, contrast goes unmeasured, and build configs depend on toolchain installs. This repo derives the whole system from one OKLCH anchor through deterministic math (ramps, modular type, 4px spacing), gates it on measured WCAG 2.1 + APCA contrast, and ships each pipeline stage as a portable skill with its dependencies inlined at build time.

Built with TypeScript, Vite (SSR/Node lib mode), `colorjs.io/fn` partial imports (only `sRGB` + `OKLCH` registered), and Style Dictionary v5 driven programmatically.

## Pipeline

```text
token-style      Socratic interview first          → style-spec.json
token-math        generate.mjs --spec …         → tokens/ (primitive → semantic → component)
token-audit       audit.mjs --tokens tokens         → WCAG 2.1 gate (exit 0/1)
token-build       build.mjs --tokens tokens         → tokens.css + Tailwind v4 theme.css
```

Raw values live only in `primitive/`; semantic (per-theme) and component tokens are `{alias}`-only. See `ARCHITECTURE.md` §3.

## Install the skills (release)

Download a per-skill zip (or the full bundle) from the [latest release](https://github.com/kamishino/token-engine-builder/releases/latest), extract into your agents skills directory — done. Requires Node `>=22.12`; no install step, dependencies are inlined in each `scripts/*.mjs`.

## Build from source

```bash
npm install        # everything is a devDependency — Vite inlines it at build time
npm run check      # typecheck + lint + skill/style lints + build
npm run build      # → dist/<skill>/ (SKILL.md + scripts/*.mjs + templates/ + assets/)
npm run deploy     # junction-link dist/* into ~/.agents/skills (rebuilds stale, prunes dead)
```

## Use

```bash
# First, record the anchor (interview in the token-style skill, or copy the example)
cp dist/token-style/assets/style-spec.example.json style-spec.json

# Next, generate the 3-tier tree
node dist/token-math/scripts/generate.mjs --spec style-spec.json --out tokens

# Then gate on contrast (exit 0 ships, exit 1 stops)
node dist/token-audit/scripts/audit.mjs --tokens tokens --min-ratio 4.5

# Finally, build one theme at a time, then deploy (or link all skills at once)
node dist/token-build/scripts/build.mjs --tokens tokens --out build --theme light
npm run deploy   # junction-link dist/* into ~/.agents/skills (rebuilds stale, prunes dead)
```

Each `dist/<skill>/` also carries its own `SKILL.md` (agent instructions), `templates/`, and `assets/` — see `ARCHITECTURE.md` §1. Agents working in this repo should start at `AGENTS.md`.

## Releases

Versioned with changesets (whole-set version in `package.json`). Cut a release:

```bash
npm run changeset   # record each user-visible change as it lands
npm run release     # consume changesets into a version bump
npm run package     # build + write release/ zips + SHA256SUMS.txt
gh release create v<version> release/* --title "v<version>"
```

Artifacts: one zip per skill (`token-engine-<skill>-v<version>.zip`, extract into an agents skills dir and run) plus a full bundle zip. `release/` is gitignored; artifacts attach to the GitHub release.

Verify downloads: keep `SHA256SUMS.txt` beside the zips, then run `sha256sum -c SHA256SUMS.txt` (macOS/Linux) or compare `Get-FileHash <zip>` output against the file (Windows). The sums are unsigned — verification proves the bytes match the release, not the publisher's identity.

## Contributing

Small, colocated changes: edit `src/skills/<skill>/` or `src/shared/`, run `npm run check`, and update the owning doc in the same commit (`AGENTS.md` for rules, `ARCHITECTURE.md` for design moves). Conventional commits (`type(scope): description`, ≤72 chars, imperative). Never hand-edit `dist/`. Planning: see [the roadmap](docs/ROADMAP.md).

## License

MIT — see [LICENSE](LICENSE).
