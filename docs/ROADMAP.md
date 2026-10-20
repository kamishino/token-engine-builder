# ROADMAP — token-engine-builder

Internal planning document. Items move horizons only by editing this file with the reason recorded inline, never silently.

## Product snapshot

token-engine-builder is an agent-skill pipeline that turns a recorded brand palette into certified 3-tier W3C DTCG design tokens, 8 UI-library profiles, and CSS/Tailwind v4 output: `token-extract`/`token-style` → `token-math` → `token-audit` → `token-build`. Primary user: the owner's daily design-token work. Secondary: public installers via signed GitHub release zips. Current state: v0.14.0 shipped; 5 skills partitioned into Creation & Governance buckets; dual Claude Code & OpenAI Agent manifests; 144-color vendored offline naming catalog; CycloneDX 1.5 JSON SBOM & Ed25519 Minisign release signing; rendered DOM extraction (`--url` / `--html`); 8 UI-library profiles (`shadcn`, `bootstrap`, `primevue`, `antd`, `mui`, `chakra`, `radix`, `fluent`); component & composite pattern specs.

## Principles (decision filters)

- Deterministic math downstream of recorded decisions.
- Gates before build: nothing ships unmeasured.
- The agent is the creative layer; the engine is not.
- Don't reinvent wheels: deps are evaluated before hand-rolling.
- No reference doc without its engine.
- Clean cutovers over compatibility shims.

## Now — Active Cycle (Target: v1.0.0)

With all v0.x foundation epics (N1, N3, X1–X8, L1, L2, L4, L5, L6, L7, L8) shipped, the pipeline enters its v1.0 stabilization and consumer adoption cycle.

### N2. Restore CI trust (standing blocker)

- **Why**: GitHub Actions workflow fails at 0s with 0 jobs scheduled (account/billing signature). Local `npm run check` is 100% green.
- **Scope**: Owner checks GitHub billing / Actions permissions in repository settings; verify `check.yml` passes on `main`.
- **Exit criteria**: GitHub Actions workflow conclusion = success on `main`.

### N4. Interactive Visualizer Surface (HTML Inspector) — ✅ shipped in v0.15.0

- **Why**: Per AGENTS.md Charter Policy #8 (_"reserve Interactive HTML strictly for visual inspection"_), agents and human designers benefit from an interactive visualizer verifying color ramps, APCA/WCAG contrast matrix, and component states in a single rendered HTML page before deployment.
- **Shipped**: `token-build --visualizer` generates a self-contained zero-dependency HTML inspector under `build/visualizer.html` rendering live palette ramps and component specimens (button, card, input) under the target theme.

### N5. Comprehensive Verification Matrix & v1.0.0 Cut

- **Why**: Mark the transition from rapid v0.x capability expansion to production-grade stability guarantee with semantic versioning 1.0.0.
- **Exit criteria**: Full regression pass across all 8 UI profiles, 5 skills, both bucket packages, CycloneDX SBOM validation, and signed v1.0.0 release.

## Next — v1.x Horizon (unselected)

### Y1. Extended Component Catalog (6 additional components)

- **Why**: Expand beyond core button/card/input to badge, alert, dialog, avatar, tooltip, and table.
- **Depends on**: v1.0.0 stabilization.

### Y2. Figma DTCG Token Sync Bridge

- **Why**: Bi-directional translation between W3C DTCG JSON format and Figma Variables REST API.

### Y3. Dynamic Custom Theme Authoring

- **Why**: Move beyond hardcoded `light`/`dark`/`high-contrast` to arbitrary named themes (e.g. `sepia`, `solarized`, brand sub-themes) defined in `style-spec.json`.

## Shipped History (v0.3.0 – v0.14.0)

### X1. Human style-guide surface (DESIGN.md, Stitch format) — ✅ shipped in v0.4.0

- **Why**: The NN/g front-end style-guide child exists only in agent-facing form (SKILL.md, references); the deferred DESIGN.md work (ADR-0001) generates a human usage guide — token usage, do/don't, contrast and layout rules — from tokens + spec. The generated guide adopts the Google Stitch DESIGN.md format (frontmatter + 8 normative sections) because it is the format design AIs already read, while remaining a derived view of the token system, never a source of truth (see `docs/research/design-md-vs-design-system.md`).
- **Depends on**: N1 (component specs feed the guide).
- **Exit sketch**: a generated guide document passes a completeness checklist (every semantic role documented with usage); frontmatter colors/typography/rounded/spacing are rendered from the generated token tree (never hand-written), the 8 sections are complete with zero unreplaced slots, and a consistency check proves frontmatter colors equal the corresponding token values — the guide can never drift from the gate.

### X2. UI-library output profiles — ✅ shipped in v0.4.0, completed in v0.7.0

- **Why**: The npm ecosystem consumes library-native variable shapes; `token-build --profile` maps the library-neutral semantic roles onto them (see `src/skills/token-build/references/ui-library-profiles.md` for the full list and selection rule).
- **Shipped**: `shadcn` and `bootstrap` (CSS vars) in v0.4.0; `primevue` and `antd` in v0.5.0; `mui` and `chakra` (object themes) in v0.6.0; `radix` (12-step interpolated scales) and `fluent` (theme JSON) in v0.7.0. **Registry complete** — all eight candidates from the selection rule ship; new libraries enter only by user request.

### X3. Pattern library (composite component specifications) — ✅ shipped in v0.9.0

- **Why**: Multi-component compositions repeatedly appear in consumer applications; standardizing them binds single-component tokens, layout rules, and semantic roles into prescriptive composition contracts.
- **Shipped**: Form Field (Input + Label + Hint/Error), Card Section (Surface + Header + Body + Actions), and Modal Shell (Backdrop + Panel + Header + Actions) integrated into `components.md` and referenced in `DESIGN.md`.

### X4. Vendored color-names subset — ✅ shipped in v0.10.0

- **Why**: Eliminates LLM variance in color name slug assignment (ADR-0002 follow-up) by providing an offline lookup of human-recognizable color names.
- **Shipped**: Curated 144-color subset (12 per hue sector across lightness/chroma tiers) in `src/shared/color-names.ts` with nearest-neighbor OKLCH cylindrical distance matching, wired into `token-extract`.

### X5. Signed releases + CycloneDX SBOM — ✅ shipped in v0.11.0

- **Why**: External consumers need publisher verification beyond unsigned SHA256SUMS, and inlined bundles need transparent software bill of materials (Audit B1, B4).
- **Shipped**: CycloneDX 1.5 JSON SBOM (`token-engine-builder-v<version>.cyclonedx.json`) generated automatically by `package-release.mjs`, plus Ed25519 Minisign cryptographic signature (`SHA256SUMS.txt.minisig`) with public key verified in `release.pub`.

### X6. Rendered-product extraction — ✅ shipped in v0.12.0

- **Why**: An existing rendered product must be onboarded where source files are unavailable, or where computed styles in DOM determine actual visual presentation.
- **Shipped**: `token-extract` extended with `--url <url>` and `--html <file.html>` to evaluate computed styles (colors, fonts, radii) via headless browser automation with graceful DOM parsing fallback, mapping directly to `style-spec.json`.

### X7. Plugin manifests & marketplace distribution — ✅ shipped in v0.13.0

- **Why**: Skills are shared across diverse agent runtimes and ecosystems (Anthropic/Claude Code and OpenAI Agent standards) requiring standardized discoverability manifests.
- **Shipped**: In-tree Claude Code plugin manifest (`.claude/plugin.json`), OpenAI Agent manifests (`agents/openai.yaml` in each skill), bundled into release zips and mirrored into `dist/`.

### X8. Skill grouping (Creation & Governance buckets) — ✅ shipped in v0.14.0

- **Why**: Grouping skills into functional domains streamlines consumption for agents needing only token generation vs auditing and compilation.
- **Shipped**: 2-bundle partition (`creation`: token-style, token-extract, token-math; `governance`: token-audit, token-build) with bucket metadata in `.claude/plugin.json` and release packages `token-engine-creation-v<version>.zip` and `token-engine-governance-v<version>.zip`.

## Later — trigger-gated

| ID  | Item                                                          | Trigger that promotes it                                                                                                                                                                                          |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | Rendered-product extraction (DOM/screenshot → candidate spec) | Promoted and shipped as X6 in v0.12.0                                                                                                                                                                             |
| L2  | Plugin manifests & marketplace distribution                   | Promoted and shipped as X7 in v0.13.0                                                                                                                                                                             |
| L3  | TypeScript 7 migration                                        | `typescript-eslint` peer range admits TypeScript ≥7 (re-verified live 2026-10-20: `typescript-eslint@8.72.0` hard-crashes with "typescript-eslint does not support TS 7.0", peer `<6.1.0` remains strict blocker) |
| L5  | Skill grouping (buckets/plugins)                              | Promoted and shipped as X8 in v0.14.0                                                                                                                                                                             |
| L6  | Vendored color-names subset                                   | Promoted and shipped as X4 in v0.10.0                                                                                                                                                                             |
| L7  | Signed releases + SBOM                                        | Promoted and shipped as X5 in v0.11.0                                                                                                                                                                             |
| L8  | Pattern library (component compositions)                      | Promoted and shipped as X3 in v0.9.0                                                                                                                                                                              |

L4 (Vite 8 / Rolldown migration) shipped in v0.8.0 — see ARCHITECTURE.md §4 for the re-verified build decisions.

## Maintenance cadence

- Deps evidence check quarterly: typescript-eslint peer range (L3), the `npm audit` critical-level exception for the stylelint/braces chain, engine floors.
- A changeset with every user-visible change; research notes in `docs/research/` for every external-taxonomy question; ADRs for foundation decisions (next number: 0004).

## Deferred register

| Item (source)                                                     | Roadmap home                                                                                              |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| DESIGN.md contract generation (ADR-0001, not ported)              | X1 (format pinned: Google Stitch, as a derived view)                                                      |
| Gate B visualizer approval (ADR-0001, not ported)                 | Later — promotes when a human approval step before build is wanted by a real workflow; no trigger met yet |
| Exemplar-matching style detection (ADR-0001, not ported)          | Not planned — replaces derivation with selection, abandoning the product's differentiator                 |
| shadcn output profile (ADR-0001, not ported)                      | X2                                                                                                        |
| APCA dual certification (ADR-0001, not ported)                    | Done — shipped (dual WCAG+APCA gate); no longer deferred                                                  |
| Vendored color-names subset (ADR-0002)                            | L6                                                                                                        |
| Semantic accent roles / component accent bindings (ADR-0002)      | N1 — decided inside component specifications                                                              |
| Disabled-text contrast requirement (ADR-0003)                     | Later — joins the audit's border-floor kind if a consumer contract ever requires it                       |
| SBOM for shipped bundles (audit B1, partial)                      | L7                                                                                                        |
| TypeScript 7 / Vite 8 / @types/node 26 holds (deps check 2026-10) | L3 / L4 / maintenance cadence (@types/node moves with the runtime)                                        |
