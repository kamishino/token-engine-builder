# ROADMAP — token-engine-builder

Internal planning document. Items move horizons only by editing this file with the reason recorded inline, never silently.

## Product snapshot

token-engine-builder is an agent-skill pipeline that turns a recorded brand palette into certified 3-tier W3C DTCG design tokens, 8 UI-library profiles, Figma Variable sync payloads, and CSS/Tailwind v4 output: `token-extract`/`token-style` → `token-math` → `token-audit` → `token-build`. Primary user: the owner's daily design-token work. Secondary: public installers via signed GitHub release zips. Current state: **v1.4.0 shipped**; 5 skills partitioned into Creation & Governance buckets; dual Claude Code & OpenAI Agent manifests; 144-color vendored offline naming catalog; CycloneDX 1.5 JSON SBOM & Ed25519 Minisign release signing; rendered DOM extraction (`--url` / `--html`); structured Tailwind v3/v4 & CSS theme ingestion; 8 UI-library profiles (`shadcn`, `bootstrap`, `primevue`, `antd`, `mui`, `chakra`, `radix`, `fluent`); bidirectional Figma sync (`scripts/figma.mjs`); 9 DTCG component specs with 42 contrast pairs; dynamic custom theme authoring; interactive `visualizer.html` surface; automated GitHub Actions CI green on `main`.

## Principles (decision filters)

- Deterministic math downstream of recorded decisions.
- Gates before build: nothing ships unmeasured.
- The agent is the creative layer; the engine is not.
- Don't reinvent wheels: deps are evaluated before hand-rolling.
- No reference doc without its engine.
- Clean cutovers over compatibility shims.

## Now — Active Cycle

With the unified `token-engine` CLI, cognitive `design-tokens` skill, Dual-Audit pipeline, and workspace packaging completed in v1.5.0, the pipeline focuses on visual inspection and emerging standards alignment:

### E1. Visual Contrast Heatmap in Visualizer Surface

- **Why**: `visualizer.html` displays color chips and live component specimens, but human designers inspecting a token system need an at-a-glance APCA / WCAG 2.1 contrast matrix heatmap showing exact pass/fail margins across all background-foreground combinations.
- **Scope**: Extend `visualizerHtmlFormat` in `src/shared/compiler.ts` with a dynamic contrast matrix grid charting all 42 audited pairs, color-coded by APCA $|L_c|$ and WCAG ratio thresholds under the active theme.
- **Exit criteria**: `build/visualizer.html` includes an interactive contrast heatmap matrix table; verified in gold samples and visualizer test.
## Next — v2.0 Architecture Horizon

### E3. W3C DTCG Format 2025/2026 Spec Alignment

- **Why**: Track emerging updates to the W3C Design Tokens Community Group specification (e.g. composite token syntax refinements, formal modifier types).
- **Depends on**: Upstream W3C DTCG candidate recommendation publication.

### E4. Zero-Runtime React / Web Components Design System Preview

- **Why**: Provide automated code snippet generation (JSX/HTML) alongside component specifications in `components.md`.

## Later — Trigger-Gated

| ID  | Item                   | Trigger that promotes it                                                                                                                                                                                          |
| --- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L3  | TypeScript 7 Migration | `typescript-eslint` peer range admits TypeScript ≥7 (re-verified live 2026-10-20: `typescript-eslint@8.72.0` hard-crashes with "typescript-eslint does not support TS 7.0", peer `<6.1.0` remains strict blocker) |

## Maintenance cadence

- Deps evidence check quarterly: typescript-eslint peer range (L3), the `npm audit` critical-level exception for the stylelint/braces chain, engine floors.
- A changeset with every user-visible change; research notes in `docs/research/` for external-taxonomy questions; ADRs for foundation decisions (next number: 0005).

## Shipped History (v0.3.0 – v1.5.0)

| Version     | Scope                            | Key Capabilities Shipped                                                                                                              |
| ----------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **v1.5.0**  | Unified Architecture & DX (E2)   | Unified `token-engine` CLI (`sync`, `init`, `audit`, `build`, `extract`, `scaffold`), flagship cognitive `design-tokens` skill, Dual-Audit baseline & delta scorecard, multi-theme batch build (`--theme all`), Shadow DOM `:host` scoping, and workspace packaging (`--package`). |
| **v1.4.0**  | CSS Ingestion Refinement (C4)    | Structured theme extraction from Tailwind v3 configs, Tailwind v4 `@theme`, and CSS root custom properties into `style-spec.json`.    |
| **v1.2.0**  | Custom Theme Authoring (C2)      | Dynamic custom named themes declared in `style-spec.json` with base mode polarity, surface steps, and action step overrides.          |
| **v1.1.0**  | Extended Component Catalog (C1)  | 6 new DTCG component templates (badge, alert, dialog, avatar, tooltip, table) for 9 total components, with 42 audit contrast pairs.   |
| **v1.0.0**  | Production Release (N5)          | Comprehensive verification across all 8 UI profiles, 5 skills, 2 buckets, CycloneDX SBOM, Minisign signature, and CI green.           |
| **v0.15.0** | Visualizer Surface (N4)          | Single-file zero-dep interactive HTML inspector (`build/visualizer.html`) for color ramps and live component specimens.               |
| **v0.14.0** | Skill Grouping (L5 / X8)         | 2-bundle partition into `creation` and `governance` functional domains and release packages.                                          |
| **v0.13.0** | Plugin Manifests (L2 / X7)       | Dual Claude Code (`.claude/plugin.json`) and OpenAI Agent (`agents/openai.yaml`) marketplace manifests.                               |
| **v0.12.0** | Rendered Extraction (L1 / X6)    | Headless browser DOM computed-style extraction (`--url` and `--html`) into candidate `style-spec.json`.                               |
| **v0.11.0** | Signed Releases + SBOM (L7 / X5) | CycloneDX 1.5 JSON SBOM + Ed25519 Minisign release signing (`SHA256SUMS.txt.minisig` verified via `release.pub`).                     |
| **v0.10.0** | Color Catalog (L6 / X4)          | Curated 144-color offline dataset with OKLCH cylindrical distance matching for deterministic naming.                                  |
| **v0.9.0**  | Pattern Library (L8 / X3)        | Composite component specifications for Form Field, Card Section, and Modal Shell in `components.md` and `DESIGN.md`.                  |
| **v0.8.0**  | Toolchain Migration (L4)         | Vite 8 / Rolldown migration: Oxc minification, dead Prettier parser externalized (1.64MB → 1.17MB), `setFs()` side-effects preserved. |
| **v0.7.0**  | Profiles: Radix + Fluent (X2)    | Radix Themes 12-step interpolated scales (`--accent-*`, `--gray-*`) and Fluent UI 2 theme JSON.                                       |
| **v0.6.0**  | Profiles: MUI + Chakra (X2)      | Material UI (`createTheme` palette) and Chakra UI v3 (`_light`/`_dark` pairs) profiles.                                               |
| **v0.5.0**  | Profiles: PrimeVue + AntD (X2)   | PrimeVue (`--p-*`) and Ant Design (`antd-theme.json`) profiles.                                                                       |
| **v0.4.1**  | Skill Improvements               | DESIGN.md frontmatter ingestion, durable spec overrides, verified audit stamp gate, cluster bounds warnings.                          |
| **v0.4.0**  | Style Guide Export (X1)          | Google Stitch format human `DESIGN.md` contract generation from tokens + spec.                                                        |
| **v0.3.0**  | Component Specs (N1)             | Per-component specifications with enabled, hover, focus, and disabled states.                                                         |
