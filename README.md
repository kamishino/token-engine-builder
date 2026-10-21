# token-engine-builder

![check](https://github.com/kamishino/token-engine-builder/actions/workflows/check.yml/badge.svg) ![release](https://img.shields.io/github/v/release/kamishino/token-engine-builder) ![license](https://img.shields.io/github/license/kamishino/token-engine-builder)

Builds and packages self-contained AI agent skills for 3-tier W3C DTCG design tokens. Each skill under `src/skills/<skill-name>/` builds 1:1 into `dist/<skill-name>/` — copy that folder into your agent's skills directory and it runs standalone with plain `node`, no `npm install`.

## Skills

| Skill                                                              | What it does                                                                                                    |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| [ask-kami](src/skills/ask-kami/SKILL.md)                           | Entry router: detects workspace state (spec, tokens, audit, build) → proposes next skill & command              |
| [token-extract](src/skills/token-extract/SKILL.md)                 | Alternative entry: scans an existing project (CSS/tokens/config) → candidate `style-spec.json` with evidence    |
| [token-style](src/skills/token-style/SKILL.md)                     | Discovery scan + Socratic interview → one OKLCH anchor recorded as `style-spec.json` (Kobayashi style clusters) |
| [token-math](src/skills/token-math/SKILL.md)                       | Generates the 3-tier DTCG token tree from the spec (ramps, type, spacing, radius, shadow, z-index, animation)   |
| [token-audit](src/skills/token-audit/SKILL.md)                     | Dual WCAG + APCA gatekeeper — exit 0 ships, exit 1 blocks                                                       |
| [token-build](src/skills/token-build/SKILL.md)                     | Compiles audited tokens to CSS custom properties + Tailwind v4 `@theme` (light / dark / high-contrast)          |
| [improve-design-system](src/skills/improve-design-system/SKILL.md) | Evaluates design system health → finds holes → writes visual REPORT_HTML with resolution steps                  |

## Where skills install

Agent tools read skills from different folders. Common locations (check your agent's docs):

- Claude Code: `~/.claude/skills` or `.claude/skills`
- omp / Skills Protocol: `~/.agents/skills` or `.agents/skills`
- OpenCode: `.opencode/skills` (also reads `.claude/skills` and `.agents/skills`)
- Codex, Gemini CLI, Cursor, and other tools: use the skills/plugin directory that tool installs into

`SKILL.md` uses `<skill-root>` for the folder containing that file and `<target-skill-root>` for a handoff target. The agent resolves them from its skill loader; a human replaces them with the install folder. The agent is instructed to state the resolved path before running and to stop if it cannot resolve it; a command containing literal `<...>` is a failure, not a shell redirect.

## Why this exists

Hand-authored design tokens drift: hex values leak into semantic layers, contrast goes unmeasured, and build configs depend on toolchain installs. This repo derives the whole system from one OKLCH anchor through deterministic math (ramps, modular type, 4px spacing), gates it on measured WCAG 2.1 + APCA contrast, and ships each pipeline stage as a portable skill with its dependencies inlined at build time.

Built with TypeScript, Vite (SSR/Node lib mode), `colorjs.io/fn` partial imports (only `sRGB` + `OKLCH` registered), and Style Dictionary v5 driven programmatically.

## Pipeline

```text
ask-kami (router)
   │
   ├─▶ token-extract    Alternative entry: scan existing code   → candidate style-spec.json
   │
   ├─▶ token-style      Socratic interview first                → style-spec.json
   │      │
   │      ▼
   │   token-math       generate.mjs --spec …                   → tokens/ (primitive → semantic → component)
   │      │
   │      ▼
   │   token-audit      audit.mjs --tokens tokens               → WCAG 2.1 + APCA gate (exit 0/1)
   │      │
   │      ▼
   │   token-build      build.mjs --tokens tokens               → tokens.css + Tailwind v4 theme.css
   │      │
   │      ▼
   └─▶ improve-design-system  evaluate system health / holes     → REPORT_HTML
```

Raw values live only in `primitive/`; semantic (per-theme) and component tokens are `{alias}`-only. See `ARCHITECTURE.md` §3.

## Install the skills (release)

Download a per-skill zip (or the full bundle) from the [latest release](https://github.com/kamishino/token-engine-builder/releases/latest), extract into your agent's skills directory (see [Where skills install](#where-skills-install)) — done. Requires Node `>=22.12`; no install step, dependencies are inlined in each `scripts/*.mjs`.

## Build from source

```bash
npm install        # everything is a devDependency — Vite inlines it at build time
npm run check      # typecheck + lint + skill/style lints + build
npm run build      # → dist/<skill>/ (SKILL.md + scripts/*.mjs + templates/ + assets/ + references/ + examples/ + agents/)
npm run deploy     # link dist/* into ~/.agents/skills (default; pass -- --dir <path> for other agents)
```

## Use

These are repo-relative development commands. From an installed skill, replace `dist/<skill>` with `<skill-root>`.

```bash
# First, record the anchor (interview in the token-style skill, or copy the example)
cp dist/token-style/assets/style-spec.example.json style-spec.json

# Next, generate the 3-tier tree
node dist/token-math/scripts/generate.mjs --spec style-spec.json --out tokens

# Then gate on contrast (exit 0 ships, exit 1 stops)
node dist/token-audit/scripts/audit.mjs --tokens tokens --min-ratio 4.5

# Finally, build one theme at a time, then deploy (or link all skills at once)
node dist/token-build/scripts/build.mjs --tokens tokens --out build --theme light
npm run deploy   # link dist/* into ~/.agents/skills (default; pass -- --dir <path> for other agents)
```

Each `dist/<skill>/` also carries its own `SKILL.md` (agent instructions) and whichever of `templates/`, `assets/`, `references/`, `examples/`, and `agents/` the skill ships — see `ARCHITECTURE.md` §1. Agents working in this repo should start at `AGENTS.md`.

## Releases

Versioned with changesets (whole-set version in `package.json`). Cut a release:

```bash
npm run changeset   # record each user-visible change as it lands
npm run release     # consume changesets into a version bump
npm run package     # build + write release/ zips + SHA256SUMS.txt
gh release create v<version> release/* --title "v<version>"
```

Artifacts: per-skill packages (`token-engine-<skill>-v<version>.zip`), functional bucket packages (`token-engine-creation-v<version>.zip` and `token-engine-governance-v<version>.zip`), full bundle (`token-engine-builder-v<version>.zip`), and a CycloneDX 1.5 JSON SBOM (`token-engine-builder-v<version>.cyclonedx.json`). `release/` is gitignored; artifacts attach to the GitHub release.

Verify downloads: keep `SHA256SUMS.txt` beside the zips, then run `sha256sum -c SHA256SUMS.txt`. Cryptographic authenticity: each release signs `SHA256SUMS.txt` with Ed25519; verify using `minisign -Vm SHA256SUMS.txt -p release.pub` (the public key is checked in at `release.pub`).

## Contributing

Small, colocated changes: edit `src/skills/<skill>/` or `src/shared/`, run `npm run check`, and update the owning doc in the same commit (`AGENTS.md` for rules, `ARCHITECTURE.md` for design moves). Conventional commits (`type(scope): description`, ≤72 chars, imperative). Never hand-edit `dist/`. Planning: see [the roadmap](docs/ROADMAP.md).

## License

MIT — see [LICENSE](LICENSE).
