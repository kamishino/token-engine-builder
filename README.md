# token-engine-builder

![check](https://github.com/kamishino/token-engine-builder/actions/workflows/check.yml/badge.svg) ![release](https://img.shields.io/github/v/release/kamishino/token-engine-builder) ![license](https://img.shields.io/github/license/kamishino/token-engine-builder)

Builds and packages self-contained AI agent skills and a unified CLI for 3-tier W3C DTCG design tokens. The flagship cognitive skill `design-tokens` guides autonomous agents, while `token-engine sync` executes the deterministic math, contrast gates, and multi-theme compilation in a single command.

## Skills

| Skill                                                    | Type               | What it does                                                                                                                                            |
| -------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [design-tokens](src/skills/design-tokens/SKILL.md)       | **Flagship Skill** | Cognitive design token architecture: discovery, OKLCH scales, dual-gate audit, and framework integration                                                |
| [setup-pre-tokens](src/skills/setup-pre-tokens/SKILL.md) | Setup Skill        | Scriptless, hand-invoked step 0: installs/configures formatter, Stylelint, Style Dictionary, Sass 7-1 + BEM and 3-tier token seeds before design-tokens |

All deterministic pipeline operations (`sync`, `init`, `audit`, `build`, `extract`, `generate`, `scaffold`, `route`, `diagnose`, `figma`) are driven by the unified `token-engine` CLI bundled directly inside `design-tokens` (`<skill-root>/scripts/token-engine.mjs`). Inside a checkout of this repo, `npx token-engine` resolves the repo-local `bin`; installed skills bundle the same CLI, and agents must invoke `<skill-root>/scripts/token-engine.mjs` — never `npx`.

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

The suite decouples cognitive agent reasoning from deterministic mathematics. Projects without an existing token/styling toolchain can run `setup-pre-tokens` as an optional step 0 to install and configure prerequisites:

```text
┌────────────────────────────────────────────────────────┐
│        FLAGSHIP SKILL: design-tokens (Cognitive)       │
│  Context Discovery → Socratic Palette → Framework Wire │
└──────────────────────────┬─────────────────────────────┘
                           │ runs 1 command
                           ▼
┌────────────────────────────────────────────────────────┐
│         UNIFIED CLI: token-engine sync (Single-Pass)   │
│  Extract → OKLCH Math → WCAG/APCA Gate → Multi-Theme   │
└──────────────────────────┬─────────────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
tokens/ (DTCG JSON)    tokens.css          tokens.js + tokens.d.ts
(3-tier ramps)         (:host / :root)     (typed ESM dictionary)
```

The legacy 7 micro-skills (`token-style`, `token-extract`, `token-math`, `token-audit`, `token-build`, `ask-kami`, `improve-design-system`) were retired in v2.0; their capabilities live in `token-engine` CLI subcommands (`sync`, `init`, `audit`, `build`, `extract`, `generate`, `scaffold`, `route`, `diagnose`, `figma`) and the flagship `design-tokens` skill.

Raw values live only in `primitive/`; semantic (per-theme) and component tokens are `{alias}`-only. See `ARCHITECTURE.md` §3.

## Install the skills

[![skills.sh](https://skills.sh/b/kamishino/token-engine-builder)](https://skills.sh/kamishino/token-engine-builder)

Install directly to your coding agents across machines using the [`skills`](https://skills.sh) CLI (requires Node `>=22.12`):

```bash
# Interactive global install — prompts for skills and detects your agents (Claude Code, omp/.agents, Codex, OpenCode, and 75+ more):
npx skills add kamishino/token-engine-builder -g

# One-shot global install for a specific agent:
npx skills add kamishino/token-engine-builder --skill design-tokens -g -a claude-code -y

# Project-scoped install (saved into ./.agents/skills or ./.claude/skills and committed with your repo):
npx skills add kamishino/token-engine-builder --skill '*' -a claude-code -y

# Update installed skills across projects or globally:
npx skills update

# Remove skills:
npx skills remove kamishino/token-engine-builder -g
```

> **Windows tip**: If symlink creation fails due to Windows Developer Mode permissions, re-run with `--copy` to install independent copies instead of symlinks.
>
> **Contributor warning**: If you work on this repo locally and use `npm run deploy` (which links `dist/` directly via junctions into `~/.agents/skills`), do not run `npx skills add -g` into the same directory to avoid overwriting live dev symlinks.

### Offline / manual install (release zips)

Download a per-skill zip (`token-engine-design-tokens-v*.zip`, `token-engine-setup-pre-tokens-v*.zip`) or the full bundle (`token-engine-builder-v*.zip`) from the [latest release](https://github.com/kamishino/token-engine-builder/releases/latest), extract into your agent's skills directory (see [Where skills install](#where-skills-install)) — done. Requires Node `>=22.12`; no install step, dependencies are inlined in each bundle.

## Build from source

```bash
npm install        # everything is a devDependency — Vite inlines it at build time
npm run check      # typecheck + lint + skill/style lints + build
npm run build      # → dist/<skill>/ (SKILL.md + scripts/*.mjs + templates/ + assets/ + references/ + examples/ + agents/)
npm run deploy     # link dist/* into ~/.agents/skills (default; pass -- --dir <path> for other agents)
```

## Use

### 0. Project Prerequisites Setup (Optional)

For greenfield or brownfield projects lacking styling tooling or token compilation, invoke `setup-pre-tokens` to install pinned dependencies, configure Sass 7-1 + BEM, and scaffold 3-tier seed tokens:

```bash
/setup-pre-tokens
```

### 1. Single-Pass Execution (Recommended)

Run the complete pipeline end-to-end with the unified CLI:

```bash
# Batch compile all themes (light, dark, high-contrast) with Web Component Shadow DOM support:
npx token-engine sync --theme all --selector ":host, :root" --package @tokens
```

Outputs generated in one pass:

- `tokens/`: 3-tier DTCG token JSON (`primitive/`, `semantic/`, `component/`).
- `build/tokens.css`: CSS custom properties with automatic `@media (prefers-color-scheme: dark)` and `[data-theme="dark"]` switching.
- `build/tokens.js` & `build/tokens.d.ts`: Strongly typed ESM dictionary for Canvas, WebGL, and runtime scripts.
- `build/theme.css`: Tailwind v4 `@theme` block.
- `.token-engine-audit.json`: Dual-gate contrast stamp with live Before-vs-After delta scorecard.

### 2. Standalone Subcommands

```bash
# Detect codebase context and initialize tokens.config.json:
npx token-engine init

# Run dual-gate contrast audit against a pre-audit baseline:
npx token-engine audit --tokens tokens --baseline .pre-audit-baseline.json

# Extract colors and generate pre-audit accessibility debt scorecard:
npx token-engine extract --root . --audit-baseline

# Scaffold companion configs (Prettier, Stylelint, Tailwind) without modifying package.json:
npx token-engine scaffold --formatter prettier --linter stylelint --css tailwind
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
