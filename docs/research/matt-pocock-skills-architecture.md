# Architecture: mattpocock/skills

Research on the architecture of [mattpocock/skills](https://github.com/mattpocock/skills) (Matt Pocock's AI agent skills repo), read from primary sources on 2026-10-17. Every factual claim links the source file that owns it. Intended as a reference for maintaining skills in this repo (token-engine-builder), which builds colocated `src/skills/<skill>` packages into Vite-bundled `dist/<skill>` folders.

## 1. Repo layout: how skills are organized

Skills live under `skills/` in bucket folders. The five buckets are [listed by the repo's own API listing](https://api.github.com/repos/mattpocock/skills/contents/skills?ref=main): `engineering/`, `productivity/`, `misc/`, `in-progress/`, `deprecated/`. (An ADR also mentions a former `personal/` bucket, since removed; see [ADR 0002](https://raw.githubusercontent.com/mattpocock/skills/main/.agents/adr/0002-ship-as-a-claude-code-plugin.md).)

Only two buckets are **promoted** (shipped): `engineering/` (daily code work) and `productivity/` (daily non-code workflow tools). `misc/` is kept but rarely used and not promoted, `in-progress/` is public beta for feedback but not shipped in the plugin, and `deprecated/` is retired. These promotion semantics are defined in [CLAUDE.md](https://raw.githubusercontent.com/mattpocock/skills/main/CLAUDE.md), which is the maintainer rulebook for the repo.

A single skill is a directory named after the skill, for example [skills/engineering/tdd/](https://api.github.com/repos/mattpocock/skills/contents/skills/engineering/tdd?ref=main), containing:

- `SKILL.md` (required): frontmatter plus Markdown instructions.
- `agents/openai.yaml` (every skill carries one): Codex UI metadata beside the `SKILL.md`, per [.agents/invocation.md](https://raw.githubusercontent.com/mattpocock/skills/main/.agents/invocation.md).
- Sibling reference files owned by the skill, for example `tests.md` and `mocking.md` in [tdd/](https://api.github.com/repos/mattpocock/skills/contents/skills/engineering/tdd?ref=main), `HTML-REPORT.md` in [improve-codebase-architecture/](https://api.github.com/repos/mattpocock/skills/contents/skills/engineering/improve-codebase-architecture?ref=main), and `domain.md` plus per-tracker files in [setup-matt-pocock-skills/](https://api.github.com/repos/mattpocock/skills/contents/skills/engineering/setup-matt-pocock-skills?ref=main).
- Occasionally a runnable artifact owned by the skill, for example `template.sh` in [wizard/](https://api.github.com/repos/mattpocock/skills/contents/skills/engineering/wizard?ref=main).

There is no per-skill `package.json`, no build step, and no compiled output: what is in the repo is what ships.

Repo-level scaffolding around the skills (from the [root listing](https://api.github.com/repos/mattpocock/skills/contents/)):

- [README.md](https://raw.githubusercontent.com/mattpocock/skills/main/README.md): user-facing index. Every promoted skill must have a reference entry linking its name to its `SKILL.md`, grouped into User-invoked and Model-invoked sections, per [CLAUDE.md](https://raw.githubusercontent.com/mattpocock/skills/main/CLAUDE.md).
- `skills/<bucket>/README.md`: per-bucket index with a one-line description per skill, name linked to its `SKILL.md`; promoted buckets group by invocation kind, non-promoted buckets use a flat list, per [CLAUDE.md](https://raw.githubusercontent.com/mattpocock/skills/main/CLAUDE.md).
- [CLAUDE.md](https://raw.githubusercontent.com/mattpocock/skills/main/CLAUDE.md): maintainer rules (promotion, README/plugin registration, docs sync, router sync).
- [.claude-plugin/](https://raw.githubusercontent.com/mattpocock/skills/main/.claude-plugin/plugin.json): plugin manifests (see section 4).
- [.agents/](https://api.github.com/repos/mattpocock/skills/contents/.agents?ref=main): maintainer conventions (`invocation.md`, `install-block.md`, `writing-docs.md`) plus ADRs.
- [scripts/](https://api.github.com/repos/mattpocock/skills/contents/scripts?ref=main): maintainer tooling only (`link-skills.sh`, `list-skills.sh`, `sync-plugin-version.mjs`).
- [docs/](https://api.github.com/repos/mattpocock/skills/contents/docs?ref=main): human-facing docs pages at `docs/<bucket>/<skill-name>.md` for promoted skills only, published at `https://aihero.dev/skills-<skill-name>` regardless of bucket, per [CLAUDE.md](https://raw.githubusercontent.com/mattpocock/skills/main/CLAUDE.md).
- [.changeset/](https://api.github.com/repos/mattpocock/skills/contents/.changeset?ref=main), [package.json](https://raw.githubusercontent.com/mattpocock/skills/main/package.json), [CHANGELOG.md](https://raw.githubusercontent.com/mattpocock/skills/main/CHANGELOG.md): versioning (see section 5).

Cross-skill dependencies are expressed as an explicit instruction to call the Skill tool with the named skill (for example `Call the Skill tool with "grilling"` in [grill-me/SKILL.md](https://raw.githubusercontent.com/mattpocock/skills/main/skills/productivity/grill-me/SKILL.md)), not as deep `../other-skill/FILE.md` cross-references and not as bare `/skill` mentions, per [.agents/invocation.md](https://raw.githubusercontent.com/mattpocock/skills/main/.agents/invocation.md). Shared reference material lives inside the skill that owns it; other skills reach it by calling the Skill tool. One Skill-tool call carries exactly one skill; a step needing two skills is two calls. A step whose precondition is a user-invoked skill must tell the human to run it (for example `tell the user to run /setup-matt-pocock-skills`), never a Skill-tool call, per [.agents/invocation.md](https://raw.githubusercontent.com/mattpocock/skills/main/.agents/invocation.md).

## 2. SKILL.md anatomy: frontmatter fields and semantics

The format follows the [Agent Skills specification](https://agentskills.io/specification): a skill directory contains at minimum `SKILL.md`, which holds YAML frontmatter followed by Markdown instructions, with optional `scripts/`, `references/`, and `assets/` conventions. Agents load skills progressively: frontmatter metadata at startup (~100 tokens), full body on activation (<5000 tokens recommended, `SKILL.md` under 500 lines), resources on demand.

Required frontmatter fields per the [specification](https://agentskills.io/specification):

- `name`: 1-64 characters; lowercase letters, numbers, and hyphens only; must not start/end with a hyphen or contain consecutive hyphens; **must match the parent directory name**. Examples in-repo: [tdd](https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/tdd/SKILL.md) (`name: tdd`), [grill-me](https://raw.githubusercontent.com/mattpocock/skills/main/skills/productivity/grill-me/SKILL.md) (`name: grill-me`).
- `description`: 1-1024 characters, non-empty; describes what the skill does **and when to use it**, with keywords that help agents match tasks. The [tdd SKILL.md](https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/tdd/SKILL.md) description shows the trigger-phrasing style: `Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integration tests.`

Optional spec fields (`license`, `compatibility`, `metadata`, `allowed-tools`) are documented in the [specification](https://agentskills.io/specification) but this repo does not use them on its skills.

Repo-specific frontmatter extension, defined in [.agents/invocation.md](https://raw.githubusercontent.com/mattpocock/skills/main/.agents/invocation.md):

- `disable-model-invocation: true` (Claude Code side) paired with `policy.allow_implicit_invocation: false` in the skill's `agents/openai.yaml` (Codex side) marks a skill **user-invoked**: reachable only when the human types its name. Example: [grill-me/SKILL.md](https://raw.githubusercontent.com/mattpocock/skills/main/skills/productivity/grill-me/SKILL.md) sets `disable-model-invocation: true`, and its [agents/openai.yaml](https://raw.githubusercontent.com/mattpocock/skills/main/skills/productivity/grill-me/agents/openai.yaml) carries the `policy.allow_implicit_invocation: false` block. The two must stay in sync: a skill is user-invoked in both harnesses or neither.
- **Model-invoked** is the default: both markers omitted, reachable by model or user. Example: [tdd/SKILL.md](https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/tdd/SKILL.md) has no `disable-model-invocation`, and its [agents/openai.yaml](https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/tdd/agents/openai.yaml) has no `policy` block.
- The `description` semantics split on this axis: for user-invoked skills it is **human-facing** (one-line slash-command summary, trigger lists stripped); for model-invoked skills it is **model-facing** and keeps rich trigger phrasing so auto-invocation fires, per [.agents/invocation.md](https://raw.githubusercontent.com/mattpocock/skills/main/.agents/invocation.md).
- A user-invoked skill may invoke model-invoked skills but can never reach another user-invoked skill; no other skill can call a user-invoked skill through the Skill tool, per [.agents/invocation.md](https://raw.githubusercontent.com/mattpocock/skills/main/.agents/invocation.md).

The `agents/openai.yaml` file additionally holds Codex UI metadata (`interface.display_name`, `interface.short_description` for the skill picker), shown by the [grill-me](https://raw.githubusercontent.com/mattpocock/skills/main/skills/productivity/grill-me/agents/openai.yaml) (`Grill Me` / `Sharpen a plan through interview`) and [tdd](https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/tdd/agents/openai.yaml) (`TDD` / `Test-driven red-green-refactor`) examples.

The Markdown body after the frontmatter has no format restrictions per the [specification](https://agentskills.io/specification). In this repo it holds the operative procedure: for example the [tdd body](https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/tdd/SKILL.md) defines seams, anti-patterns, and loop rules, while the [grill-me body](https://raw.githubusercontent.com/mattpocock/skills/main/skills/productivity/grill-me/SKILL.md) is a single line delegating to the Skill tool (`Call the Skill tool with "grilling".`). Relative references stay one level deep from the skill root per the [specification](https://agentskills.io/specification) (for example [wizard/SKILL.md](https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/wizard/SKILL.md) links `[template.sh](template.sh)`).

## 3. Executable layer: how scripts ship and run

The skills are Markdown-first with no bundling: there is no compile step, no dependency inlining, and no per-skill runtime beyond what the agent harness already provides. The [specification](https://agentskills.io/specification) says `scripts/` holds executable code that should be self-contained or clearly document dependencies, with supported languages depending on the agent implementation (Python, Bash, JavaScript commonly).

Concretely in this repo:

- The only shipped executable inside a skill directory is [wizard/template.sh](https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/wizard/template.sh): a bash library with a `#!/usr/bin/env bash` shebang and `set -euo pipefail`. The [wizard/SKILL.md](https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/wizard/SKILL.md) instructs the agent to copy `template.sh` to a target path, author stages below the `STAGES` marker without hand-editing the library, verify with `bash -n <script>` (plus `shellcheck` if available), and run `chmod +x <script>`. Generated wizards are ephemeral by default (scratch or `scripts/` path, deleted after one run) and committed only as a repeatable setup path.
- Other skill-adjacent outputs are generated documents, not shipped binaries: for example [improve-codebase-architecture](https://api.github.com/repos/mattpocock/skills/contents/skills/engineering/improve-codebase-architecture?ref=main) ships an `HTML-REPORT.md` convention doc and produces a visual HTML report at run time.
- Repo-root `scripts/` are maintainer tooling, explicitly not a supported installer: [link-skills.sh](https://raw.githubusercontent.com/mattpocock/skills/main/scripts/link-skills.sh) header says it is dev-only and that modifications or modification requests will not be approved. [sync-plugin-version.mjs](https://raw.githubusercontent.com/mattpocock/skills/main/scripts/sync-plugin-version.mjs) is a `#!/usr/bin/env node` script run via npm scripts.
- Skill behavior otherwise executes as agent actions (interview loops, TDD cycles, subagents, Skill-tool delegation), for example the [research skill](https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/research/SKILL.md) spins up a background agent that reads primary sources and writes a cited Markdown file.

## 4. Distribution and install model

Two exclusive routes, stated in [.agents/install-block.md](https://raw.githubusercontent.com/mattpocock/skills/main/.agents/install-block.md): a managed plugin (read-only bundle you subscribe to) or skills.sh (editable files you own). Installing both gives every skill twice, so users pick one. The install wording is canonical: `README.md`, `.changeset/*`, and every `docs/` page must repeat the block in [.agents/install-block.md](https://raw.githubusercontent.com/mattpocock/skills/main/.agents/install-block.md) verbatim, per [CLAUDE.md](https://raw.githubusercontent.com/mattpocock/skills/main/CLAUDE.md).

Managed (self-updating) routes first, from the [README](https://raw.githubusercontent.com/mattpocock/skills/main/README.md) and [.agents/install-block.md](https://raw.githubusercontent.com/mattpocock/skills/main/.agents/install-block.md):

- Claude Code: `claude plugin install mattpocock-skills@claude-plugins-official` (updates itself by default). The listing lives in Claude Code's official marketplace; it points at this repo's git URL and reads [.claude-plugin/plugin.json](https://raw.githubusercontent.com/mattpocock/skills/main/.claude-plugin/plugin.json) directly, per [ADR 0002](https://raw.githubusercontent.com/mattpocock/skills/main/.agents/adr/0002-ship-as-a-claude-code-plugin.md).
- Codex: `codex plugin marketplace add mattpocock/skills` then `codex plugin add mattpocock-skills@mattpocock` (updates at startup). Installs from this repo's own [.claude-plugin/marketplace.json](https://raw.githubusercontent.com/mattpocock/skills/main/.claude-plugin/marketplace.json), which Codex falls back to when there is no `.codex-plugin/`, per [ADR 0002](https://raw.githubusercontent.com/mattpocock/skills/main/.agents/adr/0002-ship-as-a-claude-code-plugin.md).
- GitHub Copilot CLI and VS Code: same `@mattpocock` marketplace plus a one-time `extraKnownMarketplaces` entry with `autoUpdate: true` in `~/.copilot/settings.json` (VS Code updates daily), per [.agents/install-block.md](https://raw.githubusercontent.com/mattpocock/skills/main/.agents/install-block.md).
- The `plugin.json` `skills` array curates exactly the promoted set (27 entries spanning `skills/engineering/` and `skills/productivity/`), per [.claude-plugin/plugin.json](https://raw.githubusercontent.com/mattpocock/skills/main/.claude-plugin/plugin.json) and the [CLAUDE.md](https://raw.githubusercontent.com/mattpocock/skills/main/CLAUDE.md) rule that promoted skills must appear there and non-promoted ones must not.

Manual-update routes, per [.agents/install-block.md](https://raw.githubusercontent.com/mattpocock/skills/main/.agents/install-block.md) and the [README](https://raw.githubusercontent.com/mattpocock/skills/main/README.md):

- Gemini CLI: two `gemini skills install https://github.com/mattpocock/skills.git --path ...` commands, one per promoted bucket, because `--path` takes one bucket and Gemini does not read `.claude-plugin`. Re-run to update.
- Any other agent, or editable files: `npx skills@latest add mattpocock/skills -a <agent>`; update with `npx skills@latest update` and re-run `add` to pick up new skills. Single-skill form: `npx skills@latest add mattpocock/skills --skill=<name>`.
- Local development: [scripts/link-skills.sh](https://raw.githubusercontent.com/mattpocock/skills/main/scripts/link-skills.sh) symlinks every skill except `deprecated/` and `misc/` into `~/.claude/skills` and `~/.agents/skills`, so a `git pull` keeps installed skills current; the script is re-run after adding, removing, or renaming a skill, per [CLAUDE.md](https://raw.githubusercontent.com/mattpocock/skills/main/CLAUDE.md).

After install, setup is per-repo: run `/setup-matt-pocock-skills` once per repo to configure issue tracker, triage labels, and docs locations, per the [README](https://raw.githubusercontent.com/mattpocock/skills/main/README.md).

## 5. Versioning and evolution

One version for the whole set, driven by changesets:

- [package.json](https://raw.githubusercontent.com/mattpocock/skills/main/package.json) holds the single version (`1.3.1`, `private: true`, package name `mattpocock-skills`) with `changeset` / `version` npm scripts.
- Each change lands with a per-change changeset file under [.changeset/](https://api.github.com/repos/mattpocock/skills/contents/.changeset?ref=main), for example [tdd-seam-tradeoffs.md](https://raw.githubusercontent.com/mattpocock/skills/main/.changeset/tdd-seam-tradeoffs.md) records a `patch` bump for `mattpocock-skills` with a one-line description. Changeset [config.json](https://raw.githubusercontent.com/mattpocock/skills/main/.changeset/config.json) uses the GitHub changelog generator for `mattpocock/skills`.
- Release runs `npm run version` (`changeset version && node scripts/sync-plugin-version.mjs`), which copies the version into [.claude-plugin/plugin.json](https://raw.githubusercontent.com/mattpocock/skills/main/.claude-plugin/plugin.json), per [package.json](https://raw.githubusercontent.com/mattpocock/skills/main/package.json) and [sync-plugin-version.mjs](https://raw.githubusercontent.com/mattpocock/skills/main/scripts/sync-plugin-version.mjs). Every managed route reinstalls when that `version` changes, so the "chore: version skills" PR merging is what delivers a release, per [.agents/install-block.md](https://raw.githubusercontent.com/mattpocock/skills/main/.agents/install-block.md) and [ADR 0002](https://raw.githubusercontent.com/mattpocock/skills/main/.agents/adr/0002-ship-as-a-claude-code-plugin.md).
- [CHANGELOG.md](https://raw.githubusercontent.com/mattpocock/skills/main/CHANGELOG.md) records the per-release entries. Evolution is at the whole-set level and includes bucket graduations and removals: `implement-spec`, `pr`, and `retro` graduated into Engineering (shipping in the plugin, gaining docs pages and router entries), `resolving-merge-conflicts` was removed outright with its docs page kept and marked archived, and the `CONTEXT.md` convention was renamed to `GLOSSARY.md` across all affected skills, per [CHANGELOG.md](https://raw.githubusercontent.com/mattpocock/skills/main/CHANGELOG.md).
- Release automation lives in [.github/workflows/release.yml](https://api.github.com/repos/mattpocock/skills/contents/.github/workflows?ref=main) (workflows directory listing).
- Individual skills carry no version: the spec's optional `metadata.version` field (per the [specification](https://agentskills.io/specification)) is not used on skills in this repo, and consumers update by marketplace reinstall, `git pull` (symlinked local install), or re-running the skills.sh commands.
- The official Claude marketplace listing pins a git sha rather than tracking `main` tip, so a release reaches installed users when that pin moves; at the time of the ADR update the pin sat two commits behind `main`, listing 22 skills instead of the 24 in `plugin.json`, per [ADR 0002](https://raw.githubusercontent.com/mattpocock/skills/main/.agents/adr/0002-ship-as-a-claude-code-plugin.md).

## 6. Comparison with token-engine-builder (neutral observations)

References to this repo are local paths relative to the token-engine-builder root: [ARCHITECTURE.md](../../ARCHITECTURE.md), [README.md](../../README.md), [package.json](../../package.json), [vite.config.ts](../../vite.config.ts).

Where the two architectures already match:

- Colocated per-skill source packages: `src/skills/<skill>/` holding `SKILL.md` plus skill-owned files mirrors the upstream one-directory-per-skill layout (`SKILL.md` plus owned siblings). Both repos keep `SKILL.md` at the package root.
- `name`/`description` frontmatter with the directory-matching-`name` rule: local skills (`design-style`, `token-audit`, `token-build`, `token-math` under `src/skills/`) follow the same required-fields shape defined by the [specification](https://agentskills.io/specification), with trigger-style descriptions.
- Copy-to-install distribution: a built `dist/<skill>/` folder copied to `~/agents/skills/<skill-name>/` (see [README.md](../../README.md)) parallels the upstream copy/symlink model that lands skill directories in `~/.agents/skills` (see [link-skills.sh](https://raw.githubusercontent.com/mattpocock/skills/main/scripts/link-skills.sh)).
- Skill-owned resources travel with the skill: local `templates/` and `assets/` mirrored into `dist/` (see [ARCHITECTURE.md](../../ARCHITECTURE.md)) parallel the upstream convention of sibling reference files and the spec's `references/`/`assets/` directories (per the [specification](https://agentskills.io/specification)).

Where the two architectures diverge:

- Built versus source-distributed: token-engine-builder compiles each skill's `scripts/*.ts` into self-contained `.mjs` via per-skill Vite SSR/Node passes with dependencies inlined (see [ARCHITECTURE.md](../../ARCHITECTURE.md) and [vite.config.ts](../../vite.config.ts)); upstream ships skill sources as-is with no build step, no `package.json` per skill, and no bundling.
- Executable-first versus Markdown-first: local skills center on runnable CLIs (`node scripts/<name>.mjs`, no install, per [README.md](../../README.md)); upstream skills center on agent procedures, with the single shipped executable being the wizard template (per [wizard/SKILL.md](https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/wizard/SKILL.md)).
- No bucket/promotion layer locally: `src/skills/` is flat with four pipeline skills, while upstream sorts skills into five buckets with only two promoted and enforces the distinction in the README index, plugin manifest, and docs coverage (per [CLAUDE.md](https://raw.githubusercontent.com/mattpocock/skills/main/CLAUDE.md)).
- No invocation split locally: upstream marks every skill user-invoked or model-invoked via `disable-model-invocation` plus `agents/openai.yaml` policy, with description semantics and cross-skill call rules depending on it (per [.agents/invocation.md](https://raw.githubusercontent.com/mattpocock/skills/main/.agents/invocation.md)); local skills carry no such markers and no `agents/` sidecar files.
- No plugin manifests or marketplace: upstream distributes through `.claude-plugin/plugin.json` plus `marketplace.json` (per [.claude-plugin/plugin.json](https://raw.githubusercontent.com/mattpocock/skills/main/.claude-plugin/plugin.json)); local distribution is a filesystem copy of `dist/<skill>/` with no manifest or update channel (per [README.md](../../README.md)).
- No per-change versioning locally: upstream versions the whole set with changesets, a generated changelog, and version-gated managed updates (per [package.json](https://raw.githubusercontent.com/mattpocock/skills/main/package.json) and [.agents/install-block.md](https://raw.githubusercontent.com/mattpocock/skills/main/.agents/install-block.md)); the local [package.json](../../package.json) is `private: true` at `0.1.0` with no changeset or release workflow.
- Shared code handling: local shared logic in `src/shared/` is inlined into each skill bundle at build time so copied folders run standalone (see [ARCHITECTURE.md](../../ARCHITECTURE.md)); upstream shares behavior by having skills invoke each other through the Skill tool at run time (per [.agents/invocation.md](https://raw.githubusercontent.com/mattpocock/skills/main/.agents/invocation.md)).
- No per-skill docs pages or index-registration rules locally: upstream requires README entries, bucket README entries, docs pages for promoted skills, and router (`ask-matt`) re-sync on skill changes (per [CLAUDE.md](https://raw.githubusercontent.com/mattpocock/skills/main/CLAUDE.md)); the local repo has no equivalent registration checklist.

## Sources

Every URL consulted (all primary: repo files via API/raw, the Agent Skills spec):

- https://api.github.com/repos/mattpocock/skills/contents/ (root listing)
- https://raw.githubusercontent.com/mattpocock/skills/main/README.md
- https://raw.githubusercontent.com/mattpocock/skills/main/CLAUDE.md
- https://raw.githubusercontent.com/mattpocock/skills/main/package.json
- https://raw.githubusercontent.com/mattpocock/skills/main/CHANGELOG.md
- https://api.github.com/repos/mattpocock/skills/contents/skills?ref=main
- https://api.github.com/repos/mattpocock/skills/contents/skills/engineering?ref=main
- https://api.github.com/repos/mattpocock/skills/contents/skills/engineering/tdd?ref=main
- https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/tdd/SKILL.md
- https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/tdd/agents/openai.yaml
- https://api.github.com/repos/mattpocock/skills/contents/skills/engineering/tdd/agents?ref=main
- https://raw.githubusercontent.com/mattpocock/skills/main/skills/productivity/grill-me/SKILL.md
- https://raw.githubusercontent.com/mattpocock/skills/main/skills/productivity/grill-me/agents/openai.yaml
- https://api.github.com/repos/mattpocock/skills/contents/skills/productivity/grill-me?ref=main
- https://api.github.com/repos/mattpocock/skills/contents/skills/productivity/grill-me/agents?ref=main
- https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/research/SKILL.md
- https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/wizard/SKILL.md
- https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/wizard/template.sh
- https://api.github.com/repos/mattpocock/skills/contents/skills/engineering/wizard?ref=main
- https://api.github.com/repos/mattpocock/skills/contents/skills/engineering/improve-codebase-architecture?ref=main
- https://api.github.com/repos/mattpocock/skills/contents/skills/engineering/setup-matt-pocock-skills?ref=main
- https://raw.githubusercontent.com/mattpocock/skills/main/.claude-plugin/plugin.json
- https://raw.githubusercontent.com/mattpocock/skills/main/.claude-plugin/marketplace.json
- https://raw.githubusercontent.com/mattpocock/skills/main/.agents/invocation.md
- https://raw.githubusercontent.com/mattpocock/skills/main/.agents/install-block.md
- https://raw.githubusercontent.com/mattpocock/skills/main/.agents/adr/0002-ship-as-a-claude-code-plugin.md
- https://api.github.com/repos/mattpocock/skills/contents/.agents?ref=main
- https://api.github.com/repos/mattpocock/skills/contents/scripts?ref=main
- https://raw.githubusercontent.com/mattpocock/skills/main/scripts/link-skills.sh
- https://raw.githubusercontent.com/mattpocock/skills/main/scripts/sync-plugin-version.mjs
- https://api.github.com/repos/mattpocock/skills/contents/.changeset?ref=main
- https://raw.githubusercontent.com/mattpocock/skills/main/.changeset/config.json
- https://raw.githubusercontent.com/mattpocock/skills/main/.changeset/tdd-seam-tradeoffs.md
- https://api.github.com/repos/mattpocock/skills/contents/.github?ref=main
- https://api.github.com/repos/mattpocock/skills/contents/.github/workflows?ref=main
- https://api.github.com/repos/mattpocock/skills/contents/docs?ref=main
- https://agentskills.io/specification
