# Skill categorization and design-style detection

Research answering two questions for token-engine-builder (colocated `src/skills/<skill>` packages, 4-skill DTCG token pipeline), building on [matt-pocock-skills-architecture.md](./matt-pocock-skills-architecture.md) and [stitch-skills-architecture.md](./stitch-skills-architecture.md) without re-deriving them. Read from primary sources on 2026-10-17. Every factual claim links the source file that owns it.

## Q1. How to categorize skills: Pocock buckets, Stitch plugins, and what each repo size needs

### The Agent Skills spec says nothing about grouping (verified)

The [specification](https://agentskills.io/specification) defines exactly one organizational unit: a single skill directory containing at minimum `SKILL.md`, with optional `scripts/`, `references/`, and `assets/` conventions. Its frontmatter table covers only `name`, `description`, `license`, `compatibility`, `metadata`, and `allowed-tools`; its remaining sections cover body content, optional directories, progressive disclosure, file references, and validation. No section defines buckets, groups, plugins, marketplaces, promotion, versioning, or any multi-skill structure. Grouping is therefore entirely a repo-maintainer invention layered on top of the spec, which is why Pocock and Stitch each invented a different one.

### Pocock's mechanic: lifecycle buckets + promotion rules in CLAUDE.md

Skills live under `skills/` in five bucket folders, per [CLAUDE.md](https://raw.githubusercontent.com/mattpocock/skills/main/CLAUDE.md): `engineering/` (daily code work), `productivity/` (daily non-code workflow tools), `misc/` (kept around but rarely used, not promoted), `in-progress/` (public beta for feedback, not shipped in the plugin), and `deprecated/` (no longer used). Only `engineering/` and `productivity/` are **promoted** (shipped); the other three buckets are explicitly non-promoted.

Promotion is enforced as a checklist in [CLAUDE.md](https://raw.githubusercontent.com/mattpocock/skills/main/CLAUDE.md), not as directory magic:

- Every skill in a promoted bucket must have a reference in the top-level `README.md` and an entry in [`.claude-plugin/plugin.json`](https://raw.githubusercontent.com/mattpocock/skills/main/.claude-plugin/plugin.json)'s `skills` array (the Claude Code plugin ships exactly the promoted set, 27 entries per [matt-pocock-skills-architecture.md](./matt-pocock-skills-architecture.md)); skills in `misc/`, `in-progress/`, and `deprecated/` must appear in neither.
- Each bucket folder has its own `README.md` listing every skill with a one-line description and name linked to its `SKILL.md`; promoted buckets group entries into **User-invoked** and **Model-invoked**, while non-promoted buckets use a flat list, per [CLAUDE.md](https://raw.githubusercontent.com/mattpocock/skills/main/CLAUDE.md).
- Skills in promoted buckets get a human-facing docs page at `docs/<bucket>/<skill-name>.md` (published at `https://aihero.dev/skills-<skill-name>` regardless of bucket); non-promoted skills get no docs page, with the single exception of a removed promoted skill whose page stays marked archived, per [CLAUDE.md](https://raw.githubusercontent.com/mattpocock/skills/main/CLAUDE.md).
- The [`ask-matt` router](https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/ask-matt/SKILL.md) must be re-synced whenever a user-reachable skill is added, renamed, removed, or repositioned, per [CLAUDE.md](https://raw.githubusercontent.com/mattpocock/skills/main/CLAUDE.md).
- Local install reflects the same split: [`scripts/link-skills.sh`](https://raw.githubusercontent.com/mattpocock/skills/main/scripts/link-skills.sh) symlinks every skill except `deprecated/` and `misc/` (see [matt-pocock-skills-architecture.md](./matt-pocock-skills-architecture.md)).

The buckets therefore encode **lifecycle state** (shipped vs beta vs retired), not topic: a skill graduates by moving folders (`in-progress/` into a promoted bucket, per the graduations recorded in [CHANGELOG.md](https://raw.githubusercontent.com/mattpocock/skills/main/CHANGELOG.md)) and inheriting the promoted checklist.

### Stitch's mechanic: installable plugins

Skills live under `plugins/<plugin>/skills/`, grouped into three plugins per the [README structure diagram](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/README.md): `stitch-design/` (6 core design workflows), `stitch-build/` (5 code generation and build skills), `stitch-utilities/` (4 design utilities and assistants), totaling 15 skills (see [stitch-skills-architecture.md](./stitch-skills-architecture.md)). Each plugin carries its own [manifest](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-design/plugin.json) (`name`, `description`, `version: 1.0.0`, `license: Apache-2.0`), a [Codex UI sidecar](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-build/.codex-plugin/plugin.json), and registration in the [marketplace manifest](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/.agents/plugins/marketplace.json). Install routes are per-plugin (`codex plugin marketplace add google-labs-code/stitch-skills`, then install any combination of the three; `npx plugins add` per harness), with a selective per-skill route (`npx skills add google-labs-code/stitch-skills --skill …`) carrying an inter-dependency warning, all per the [README Quick Start](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/README.md).

The plugins therefore encode **install audience** (design vs build vs utilities): a consumer subscribes to the slice they need. There is no lifecycle axis; versioning is a static `1.0.0` per manifest with no changelog or release workflow (see [stitch-skills-architecture.md](./stitch-skills-architecture.md)).

### What each repo size needs (observed, not advised)

- **A 4-skill single-pipeline repo** (ours: `design-style`, `token-math`, `token-audit`, `token-build` under the flat `src/skills/` listing) needs no grouping layer: the four skills form one ordered pipeline (`style-spec.json` to tokens to gate to CSS), install as one built unit copied to `~/agents/skills/`, and share one version, matching the flat layout observed in the local `src/skills/` directory.
- **A 15+-skill multi-audience collection** (Stitch: 15 skills, 3 installable plugins; Pocock: 27 promoted skills, 2 shipped buckets plus 3 lifecycle buckets) carries grouping because install and shipping stop being uniform: Stitch consumers install per-plugin slices, and Pocock ships only the promoted set while keeping beta and retired skills public in-repo.

### Side-by-side

| | Pocock buckets | Stitch plugins | Our flat `src/skills/` |
|---|---|---|---|
| Unit | 5 bucket folders under `skills/` ([CLAUDE.md](https://raw.githubusercontent.com/mattpocock/skills/main/CLAUDE.md)) | 3 plugin dirs under `plugins/`, each with `plugin.json` + `skills/` ([README](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/README.md)) | 4 skill dirs directly under `src/skills/` (local listing) |
| Axis | Lifecycle: shipped (`engineering/`, `productivity/`) vs beta (`in-progress/`) vs kept-unshipped (`misc/`) vs retired (`deprecated/`) ([CLAUDE.md](https://raw.githubusercontent.com/mattpocock/skills/main/CLAUDE.md)) | Audience: design vs build vs utilities ([README](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/README.md)) | Pipeline order only; no axis |
| Shipping rule | Promoted set curated in `.claude-plugin/plugin.json` + README + docs pages; non-promoted excluded ([CLAUDE.md](https://raw.githubusercontent.com/mattpocock/skills/main/CLAUDE.md)) | Per-plugin install; selective skill install with dependency warning ([README](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/README.md)) | Whole `dist/` copied; no manifest or subset route |
| Scale observed | ~27 promoted skills | 15 skills | 4 skills |
| Threshold pattern | Grouping pays off once skills differ in **ship state or install audience**: at 15+ skills with distinct consumers (Stitch's 3 installable plugins) or a public beta/retired lifecycle alongside a shipped set (Pocock's promoted vs non-promoted split), the manifest/checklist layer carries its weight; at 4 skills forming one pipeline with one install unit, flat carries no observed cost. | | |

## Q2. How an agent can detect a project's design style: three approaches as observed

### Approach A. Interview-first: ask the human (ours + Pocock's primitive)

**Owner (ours):** [`src/skills/design-style/SKILL.md`](../src/skills/design-style/SKILL.md). Step 1 runs a Socratic interview via native `ask` in one batch of at most 5 questions (unanswered questions fall back to a stated recommended default): brand personality in 3–5 adjectives, anchor color (named, hex, or "you choose"), typography family and feel, density, and corner character; the step's done-when is that every field of [`assets/style-spec.example.json`](../src/skills/design-style/assets/style-spec.example.json) has an answer or a stated default. Step 2 records the result as `style-spec.json` (OKLCH numbers, no hex; neutral hue equals anchor hue, neutral chroma 0.008–0.015), and step 3 hands off to `token-math`. Judgment lives in this skill; arithmetic is explicitly downstream.

**Owner (Pocock analogue):** [`grilling/SKILL.md`](https://raw.githubusercontent.com/mattpocock/skills/main/skills/productivity/grilling/SKILL.md), the reusable interview primitive behind `grill-me`, `grill-with-docs`, `triage`, `wayfinder`, and `improve-codebase-architecture` (per the [README Reference](https://raw.githubusercontent.com/mattpocock/skills/main/README.md)). It interviews relentlessly over a **design tree** in rounds: each round asks the whole frontier (decisions whose prerequisites are settled) with a recommended answer per question, then recomputes; facts are the agent's job (dispatch a sub-agent, never ask the user for anything look-up-able) while decisions are the user's; the session ends when the frontier is empty and nothing is silently assumed. Pocock's [README](https://raw.githubusercontent.com/mattpocock/skills/main/README.md) frames this as the fix for misalignment ("getting the agent to ask you detailed questions about what you're building") and names `/grill-me` and `/grill-with-docs` its most popular skills.

**Observed character:** style detection happens before any artifact exists, by extracting taste from the human. Pocock has no brand/style skill of its own (the [README index](https://raw.githubusercontent.com/mattpocock/skills/main/README.md) lists only engineering-workflow and productivity-workflow skills), so `grilling` is the closest upstream analogue: a domain-general interview loop, whereas `design-style` is a fixed 5-question interview ending in a machine-readable anchor contract.

### Approach B. Extraction-first: read the existing product (Stitch)

**Owners:**

- [`extract-design-md/SKILL.md`](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-design/skills/extract-design-md/SKILL.md): reads **source files** (no build or render needed). Phase 1 detects the framework from signal files (`package.json` deps, `tailwind.config`, CSS-in-JS deps, theme/token files) and reads the matching framework reference (`references/react-tailwind.md`, `vue.md`, `svelte.md`, `angular.md`, `plain-css.md`); Phase 2 extracts atmosphere, color palette with functional roles (grouped by function, deduplicated, each a descriptive name plus hex), typography, component stylings, and layout; Phase 3 writes `.stitch/DESIGN.md` with a mandatory YAML frontmatter block (`name`, `colors`) so other skills can parse it.
- [`design-md/SKILL.md`](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-utilities/skills/design-md/SKILL.md): reads the **rendered product** via the Stitch MCP server (`list_projects` → `list_screens` → `get_screen`, then downloads HTML/screenshot URLs) plus `get_project` for the `designTheme`, and synthesizes the same `DESIGN.md` contract from screenshots and code.
- [`extract-static-html/SKILL.md`](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-design/skills/extract-static-html/SKILL.md) (with [`scripts/snapshot.ts`](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-design/skills/extract-static-html/scripts/snapshot.ts)): captures the rendered DOM (Puppeteer, inlined CSS, base64 images) as the raw material extraction works from, asking the user to choose a strategy and confirm the running app first (see [stitch-skills-architecture.md](./stitch-skills-architecture.md)).
- [`react-components/SKILL.md`](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-build/skills/react-components/SKILL.md) Phase 2: re-extracts `resources/style-guide.json` from the **current** project's HTML `<head>`/tailwind config, with reusing another project's tokens as an explicit anti-pattern (see [stitch-skills-architecture.md](./stitch-skills-architecture.md)).

**Observed character:** style detection happens after the artifact exists, by reading code or pixels and translating technical values into descriptive language (e.g. `rounded-full` becomes "pill-shaped" in [`design-md/SKILL.md`](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-utilities/skills/design-md/SKILL.md)). Output is a natural-language `DESIGN.md` consumed by a hosted design AI, the reverse direction of our pipeline (which derives numeric tokens from an anchor).

### Approach C. Palette-mapping: adjectives to tokens at prompt time (Stitch, with a fragment in ours)

**Owners (Stitch):**

- [`references/design-mappings.md`](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-design/skills/generate-design/references/design-mappings.md): maps vague terms to professional terminology ("menu at the top" → "sticky navigation bar with logo and list items"), vibe adjectives to design descriptions ("Professional" → "sophisticated, trustworthy … restricted, premium palette"), and technical values to physical descriptions (`rounded-full` → pill-shaped; glassmorphism, flat/whisper-soft/floating/inset elevation).
- [`references/prompt-keywords.md`](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-design/skills/generate-design/references/prompt-keywords.md): adjective palettes per mood (Minimal/Clean, Professional/Corporate, Playful/Fun, Premium/Luxury, Dark Mode, Organic/Natural), component keywords, and a technical-to-natural shape table (`rounded-lg` → "generously rounded corners").
- [`generate-design/SKILL.md`](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-design/skills/generate-design/SKILL.md): owns the pipeline step that consults both references to refine vague prompts, then deliberately strips colors/fonts/theme from generation prompts (delegated to `manage-design-system` at project level).
- [`taste-design/SKILL.md`](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-utilities/skills/taste-design/SKILL.md): maps vibe to calibrated scales (Density "Art Gallery Airy" 1–3 → "Cockpit Dense" 8–10; Variance; Motion; default Creativity 9, Variance 8, Motion 6, Density 5) plus mandatory constraints (max 1 accent, saturation below 80%, zinc/slate neutrals, never pure `#000000`) and explicit bans (AI purple/blue neon, `Inter` in premium contexts, generic serifs, centered heroes at high variance, 3-equal-card rows, AI copywriting clichés).

**Owner (our fragment):** [`src/skills/design-style/SKILL.md`](../src/skills/design-style/SKILL.md) step 1 embeds one palette-mapping rule inside its interview: brand adjectives guide the hue family ("calm, trustworthy" → blue 230–260), `l` 0.45–0.65 keeps light/dark ramps viable, and the recorded [`style-spec.example.json`](../src/skills/design-style/assets/style-spec.example.json) fixes the numeric contract (`brandAnchor` OKLCH, `neutralHue`, `neutralChroma`, typography ratio, density, radii, WCAG target).

**Observed character:** mapping happens at translation time (words → tokens/descriptions) rather than by asking (A) or reading (B). Stitch's tables are prompt-facing (enriching generation prompts for a hosted AI, with a house aesthetic enforced through bans); ours is math-facing (one adjective-to-hue rule feeding a deterministic ramp generator).

### Contrast as observed

| | Interview-first | Extraction-first | Palette-mapping |
|---|---|---|---|
| Source of taste | The human, in-session | The existing product (code or render) | A fixed word→token table |
| Owner files | [`design-style/SKILL.md`](../src/skills/design-style/SKILL.md); [`grilling/SKILL.md`](https://raw.githubusercontent.com/mattpocock/skills/main/skills/productivity/grilling/SKILL.md) | [`extract-design-md/SKILL.md`](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-design/skills/extract-design-md/SKILL.md); [`design-md/SKILL.md`](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-utilities/skills/design-md/SKILL.md) | [`design-mappings.md`](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-design/skills/generate-design/references/design-mappings.md); [`prompt-keywords.md`](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-design/skills/generate-design/references/prompt-keywords.md); [`taste-design/SKILL.md`](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-utilities/skills/taste-design/SKILL.md) |
| Output | `style-spec.json` anchor (numeric, feeds math) or shared understanding (design tree fully visited) | `DESIGN.md` (descriptive prose + hex, feeds hosted AI) | Enriched prompt / calibrated DESIGN.md section |
| Needs existing UI? | No | Yes (source or running app) | No |
| Human in loop? | Yes, as decision-maker | Yes, as confirmer (strategy choice, approval gates) | No (tables decide) |

## Sources

Local files (paths relative to the token-engine-builder root):

- `docs/research/matt-pocock-skills-architecture.md`
- `docs/research/stitch-skills-architecture.md`
- `src/skills/design-style/SKILL.md`
- `src/skills/design-style/assets/style-spec.example.json`
- `src/skills/` directory listing (flat: `design-style/`, `token-math/`, `token-audit/`, `token-build/`)

Upstream primary sources (via raw.githubusercontent.com):

- https://raw.githubusercontent.com/mattpocock/skills/main/CLAUDE.md
- https://raw.githubusercontent.com/mattpocock/skills/main/README.md
- https://raw.githubusercontent.com/mattpocock/skills/main/CHANGELOG.md
- https://raw.githubusercontent.com/mattpocock/skills/main/.claude-plugin/plugin.json
- https://raw.githubusercontent.com/mattpocock/skills/main/skills/productivity/grilling/SKILL.md
- https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/wizard/SKILL.md
- https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/ask-matt/SKILL.md
- https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/README.md
- https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-design/plugin.json
- https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/.agents/plugins/marketplace.json
- https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-build/.codex-plugin/plugin.json
- https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-utilities/skills/taste-design/SKILL.md
- https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-utilities/skills/design-md/SKILL.md
- https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-design/skills/extract-design-md/SKILL.md
- https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-design/skills/extract-static-html/SKILL.md
- https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-design/skills/extract-static-html/scripts/snapshot.ts
- https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-design/skills/generate-design/SKILL.md
- https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-design/skills/generate-design/references/design-mappings.md
- https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-design/skills/generate-design/references/prompt-keywords.md
- https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-build/skills/react-components/SKILL.md

Spec:

- https://agentskills.io/specification
