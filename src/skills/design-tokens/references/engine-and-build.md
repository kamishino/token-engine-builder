# Token Engine & Compilation Reference

Operational guide for invoking the bundled `token-engine` CLI and managing build artifacts alongside target project compilers.

Read during Phase 1 (Silent Context Triage) to verify engine availability, or Phase 3 (Architect Tokens) and Phase 4 (Codebase Modernization) when executing CLI subcommands, targeting UI profiles, or coordinating compilers of record.

---

## 1. Execution Lane Decision

The bundled engine is required. During Phase 1 (Context Triage), verify that `scripts/token-engine.mjs` exists in the active skill root directory (`<skill-root>`). The agent uses the bundled binary to execute mathematical generation, contrast gating, and artifact staging in a single deterministic pass.

If the bundled CLI is absent, stop and report that the skill installation is incomplete (rebuild or reinstall the skill package) — do not attempt to hand-author mathematical tokens.

*Why `npx token-engine` is never used*: `token-engine-builder` is an unpublished private repository (`"private": true` in `package.json`). The CLI binary is distributed bundled directly inside the skill at `<skill-root>/scripts/token-engine.mjs`.

---

## 2. Invoking `token-engine sync`

To adopt existing seed tokens, generate full scales, and verify contrast floors, run `sync` from the project root:

```bash
node <skill-root>/scripts/token-engine.mjs sync --spec tokens.config.json --force --out build/engine --theme all
```

### Flag Rationale & Adoption Semantics
- `--spec tokens.config.json`: Points to the tokens.config.json brand contract formulated in Phase 2.
- `--force`: Mandatory when running against existing seed trees (such as those scaffolded by `setup-pre-tokens`). Without `--force`, the engine's tamper guard (`decideWrite`) detects existing token files without a provenance manifest and halts (`exit 3` / `EXIT.REFUSAL`). With `--force`, the engine writes `.token-engine-tokens-manifest.json`, replacing starter seed files wholesale while preserving any extra user-authored component tokens.
- `--out build/engine`: Staging directory for engine-specific artifacts (`tokens.js`, `tokens.d.ts`, `theme.css`, `components.md`, `DESIGN.md`). Isolating engine outputs prevents collisions with the target project's `build/tokens.css` and ensures target Style Dictionary builds are not overwritten.
- `--theme all`: Generates and compiles all three themes (`light`, `dark`, and `high-contrast`).

---

## 3. Compiler of Record & `_variables.scss` Lifecycle

In projects initialized by `setup-pre-tokens`, the **target project's Style Dictionary** (`npm run tokens:build`) is the sole compiler of record for production stylesheets:

1. **Production Outputs**:
   - `build/tokens.css`: Emitted with `:root` scope and `outputReferences: true`.
   - `build/tokens.dark.css`: Emitted with `[data-theme="dark"]` scope and `outputReferences: true`.
   - `<stylesRoot>/abstracts/_variables.scss`: Emitted with `$semantic-color-*` and `$component-*` aliases.
2. **Post-Sync Rebuild**:
   After `token-engine sync` finishes generating the complete token tree, the agent must immediately execute the target project's build script:
   ```bash
   npm run tokens:build
   ```
   *(or equivalent `pnpm run tokens:build` / `bun run tokens:build`)*.
3. **Why `token-engine build` Does Not Own Production CSS**:
   The engine's built-in compiler does not output Sass `$variables` and formats dark tokens differently. Delegating stylesheet production to `tokens:build` guarantees that Sass partials (`@use 'abstracts'`) stay synchronized with the latest token math.

---

## 4. Theme Coverage & High-Contrast

- `token-engine generate` writes three semantic theme files: `light.tokens.json`, `dark.tokens.json`, and `high-contrast.tokens.json`.
- The target project's default `sd.config.mjs` and `sd.dark.config.mjs` compile `tokens.css` and `tokens.dark.css`.
- If high-contrast CSS custom properties are needed by the application, they can be referenced directly from `build/engine/tokens.high-contrast.css` or wired into a target `sd.high-contrast.config.mjs`.

---

## 5. Audit Invariants on Starter Seeds

The `token-engine audit` gate evaluates 42 canonical contrast pairs (`AUDIT_PAIRS`), including feedback roles and 9 standard component slots.

- **Running Audit on Raw Seeds**: Running `token-engine audit` directly on starter seeds before generation fails with `exit 4` / `EXIT.AUDIT` because starter seeds intentionally omit feedback roles and optional component templates.
- **Engine Lane Sequencing**: `token-engine sync` automatically resolves this by running `generate` *before* `audit`, creating the full token tree before the contrast gate evaluates.

---

## 6. Subcommand Capability & Flag Reference

The unified CLI provides 10 deterministic subcommands. When granular inspection, targeted builds, or external bridges are required, invoke subcommands directly:

| Subcommand | Purpose | Key Flags | Exit Codes | When to Prefer Over `sync` |
| :--- | :--- | :--- | :--- | :--- |
| `sync` | Full end-to-end pipeline in one pass (extract → math → audit → build) | `--root <dir>`, `--spec <file>`, `--tokens <dir>`, `--out <dir>`, `--theme <name\|all>`, `--selector <sel>`, `--package [name]`, `--baseline <file>`, `--force`, `--dry-run`, `--allow-unaudited`, `--json`, `--quiet` | 0 ok, 2 usage, 3 refusal, 4 audit, 5 validation | Standard fast path for greenfield or brownfield token generation and compilation |
| `init` | Detect codebase maturity/context and bootstrap `tokens.config.json` | `--spec <file>`, `--root <dir>`, `--force`, `--dry-run`, `--json` | 0 ok, 2 usage, 5 validation | Initial project onboarding when no spec file exists yet |
| `audit` | WCAG 2.1 AA & APCA contrast gatekeeper across 42 canonical pairs | `--tokens <dir>`, `--theme <light\|dark\|both>`, `--min-ratio <num>`, `--min-apca <num>`, `--spec <file>`, `--baseline <file>`, `--json` | 0 pass, 2 usage, 4 audit fail | Re-verifying contrast after manual override edits or inspecting delta scorecard |
| `build` | Compile tokens to CSS variables, Tailwind v4 `@theme`, TS/JS, or UI profile | `--tokens <dir>`, `--out <dir>`, `--theme <name>`, `--selector <sel>`, `--format <css\|ts\|all>`, `--package [name]`, `--prefix <name>`, `--spec <file>`, `--profile <id>`, `--visualizer`, `--allow-unaudited`, `--force`, `--dry-run` | 0 ok, 2 usage, 3 refusal, 5 validation | Targeting a UI library profile (`--profile shadcn\|bootstrap\|primevue\|antd\|mui\|chakra\|radix\|fluent`) or generating standalone `visualizer.html` |
| `extract` | Mine candidate colors and typography from CSS, HTML, or rendered URLs | `--root <dir>`, `--url <url>`, `--html <file>`, `--out <file>`, `--audit-baseline`, `--out-baseline <path>`, `--force`, `--dry-run` | 0 ok, 2 usage, 3 refusal | Brownfield color mining without generating tokens immediately |
| `generate` | Scaffold 3-tier DTCG token JSON tree from spec without compiling | `--spec <file>`, `--out <dir>`, `--force`, `--dry-run` | 0 ok, 2 usage, 3 refusal, 5 validation | Authoring or inspecting token JSON structures before running compiler passes |
| `scaffold` | Generate toolchain companion configs (Prettier, Stylelint, Biome, CSS) | `--root <dir>`, `--formatter <prettier\|biome\|none>`, `--linter <stylelint\|eslint\|none>`, `--css <native\|tailwind>`, `--force`, `--dry-run`, `--json` | 0 ok, 2 usage, 3 refusal | Setting up linter/formatter configurations without running token math |
| `route` | Inspect design system state and determine next recommended action | `--root <dir>`, `--scaffold`, `--formatter <name>`, `--linter <name>`, `--css <native\|tailwind>`, `--json`, `--force`, `--dry-run` | 0 ok, 2 usage, 3 refusal | Programmatic inspection of current system state in CI or scripts |
| `diagnose` | Evaluate design system health, find holes, and report actionable fixes | `--root <dir>`, `--spec <file>`, `--tokens <dir>`, `--build <dir>` | 0 ok, 2 usage | Deep system audits, identifying missing roles, tamper checks, and reports |
| `figma` | Bidirectional bridge between DTCG tokens and Figma Variables REST API | `--to-figma <dir>`, `--from-figma <file>`, `--out <path>`, `--force` | 0 ok, 2 usage, 3 refusal, 5 validation | Syncing design tokens to or from Figma Variables collections |

---

## 7. UI library profiles

When targeting a specific UI component library, pass `--profile <id>` to `token-engine build`. The compiler translates library-neutral semantic roles to the framework's documented variable or theme structure:

| Profile | Target format |
| :--- | :--- |
| `shadcn` | CSS variables, `:root` + `.dark` in one file |
| `bootstrap` | CSS variables (`--bs-*`), `:root` + `[data-bs-theme="dark"]` |
| `primevue` | CSS variables (`--p-*`), `:root` + `.p-dark` |
| `antd` | Ant Design theme-token JSON (`{light, dark}` ConfigProvider token maps, hex values) |
| `mui` | MUI theme JSON (`{light, dark}` createTheme-ready palette/typography/shape, hex values) |
| `chakra` | Chakra v3 semantic-token JSON (`semanticTokens.colors` with `_light`/`_dark` pairs) |
| `radix` | Radix Themes CSS (`--accent-1..12`, `--gray-1..12`, `:root` + `.dark`) |
| `fluent` | Fluent UI 2 theme JSON (`{light, dark}` color-token map, hex values) |

Profiles map library-neutral semantic roles to a framework's documented variable/theme names. The token tree never adopts library naming. New libraries enter only by user request.
