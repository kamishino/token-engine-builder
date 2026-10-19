# ROADMAP — token-engine-builder

Internal planning document. Items move horizons only by editing this file with the reason recorded inline, never silently.

## Product snapshot

token-engine-builder is an agent-skill pipeline that turns a recorded brand palette into certified 3-tier W3C DTCG design tokens and CSS/Tailwind v4 output: `token-extract`/`token-style` → `token-math` → `token-audit` → `token-build`. Primary user: the owner's daily design-token work. Secondary: public installers via GitHub release zips. Success = daily-driver reliability and publicly installable quality — explicitly not adoption metrics. Current state: v0.2.0 shipped; 5 skills; palette-first spec v2 (creative palette, user-chosen ramp steps, named primitives); dual WCAG + APCA audit gate (24 pairs/theme); sRGB gamut clamping; anti-tampering provenance manifests; atomic layout + rhythm spacing.

## Principles (decision filters)

- Deterministic math downstream of recorded decisions.
- Gates before build: nothing ships unmeasured.
- The agent is the creative layer; the engine is not.
- Don't reinvent wheels: deps are evaluated before hand-rolling.
- No reference doc without its engine.
- Clean cutovers over compatibility shims.

## Now — target v0.3.0

### N1. Component specifications with states (lead bet)

- **Why**: The NN/g mapping (`docs/research/design-systems-vs-style-guides.md`) shows the component-library child is missing: we ship component _tokens_ (button/card/input) but no per-component specification with states and usage.
- **Scope** (epic sketch; gets its own grill + plan before code): generated per-component spec documents binding semantic/component tokens across states — enabled, hover, focus, disabled — for all themes, with audit coverage for state contrast pairs (disabled exempt, documented).
- **Exit criteria**: specs generate for 3 components × 3 themes from the example spec; the audit matrix covers the state pairs; specs ship inside the skill packages.

### N2. Restore CI trust

- **Why**: Every GitHub Actions run since 2026-10-18 fails in 0 seconds with no jobs started (platform/account signature; local `npm run check` is green and the workflow is unchanged since its last success).
- **Scope**: owner checks Actions billing/settings, re-runs the check workflow; if it turns out to be a workflow defect, the fix is recorded here.
- **Exit criteria**: `check` workflow conclusion = success on `main`.

### N3. Ship v0.3.0

- **Why**: The changeset flow is the single versioning mechanism; N1 deserves a tagged, packaged release.
- **Scope**: changeset → `npm run release` → `npm run package` → GitHub release with per-skill zips + SHA256SUMS.
- **Exit criteria**: `v0.3.0` tag and release published; artifacts verified against `SHA256SUMS.txt`.

## Next — target v0.4.0

### X1. Human style-guide surface

- **Why**: The NN/g front-end style-guide child exists only in agent-facing form (SKILL.md, references); the deferred DESIGN.md work (ADR-0001) generates a human usage guide — token usage, do/don't, contrast and layout rules — from tokens + spec.
- **Depends on**: N1 (component specs feed the guide).
- **Exit sketch**: a generated guide document passes a completeness checklist (every semantic role documented with usage).

### X2. shadcn output profile

- **Why**: The npm ecosystem consumes the flat semantic OKLCH variable shape; a `token-build` profile emitting it beside the DTCG tree widens installability.
- **Pull-forward trigger**: a concrete shadcn consumer appears — then it jumps to Now.

## Later — trigger-gated

| ID  | Item                                                          | Trigger that promotes it                                                                                                             |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| L1  | Rendered-product extraction (DOM/screenshot → candidate spec) | An existing rendered product must be onboarded that source scanning cannot read                                                      |
| L2  | Plugin manifests & marketplace distribution                   | Skills are shared beyond personal installs and the release channel needs an update mechanism                                         |
| L3  | TypeScript 7 migration                                        | `typescript-eslint` peer range admits TypeScript ≥7 (re-check at each deps review; see `docs/research/deps-update-check-2026-10.md`) |
| L4  | Vite 8 / Rolldown migration                                   | A dedicated migration window after v0.4.0, with build-decision re-verification (ARCHITECTURE.md §4)                                  |
| L5  | Skill grouping (buckets/plugins)                              | The set reaches ≥8 skills or gains a second install audience                                                                         |
| L6  | Vendored color-names subset                                   | Offline color naming proves unreliable in practice (ADR-0002 follow-up)                                                              |
| L7  | Signed releases + SBOM                                        | External consumers need publisher verification beyond unsigned SHA256SUMS                                                            |
| L8  | Pattern library (component compositions)                      | Component specs in real use reveal repeated compositions worth standardizing                                                         |

## Maintenance cadence

- Deps evidence check quarterly: typescript-eslint peer range (L3), the `npm audit` critical-level exception for the stylelint/braces chain, engine floors.
- A changeset with every user-visible change; research notes in `docs/research/` for every external-taxonomy question; ADRs for foundation decisions (next number: 0004).

## Deferred register

| Item (source)                                                     | Roadmap home                                                                                              |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| DESIGN.md contract generation (ADR-0001, not ported)              | X1                                                                                                        |
| Gate B visualizer approval (ADR-0001, not ported)                 | Later — promotes when a human approval step before build is wanted by a real workflow; no trigger met yet |
| Exemplar-matching style detection (ADR-0001, not ported)          | Not planned — replaces derivation with selection, abandoning the product's differentiator                 |
| shadcn output profile (ADR-0001, not ported)                      | X2                                                                                                        |
| APCA dual certification (ADR-0001, not ported)                    | Done — shipped (dual WCAG+APCA gate); no longer deferred                                                  |
| Vendored color-names subset (ADR-0002)                            | L6                                                                                                        |
| Semantic accent roles / component accent bindings (ADR-0002)      | N1 — decided inside component specifications                                                              |
| Disabled-text contrast requirement (ADR-0003)                     | Later — joins the audit's border-floor kind if a consumer contract ever requires it                       |
| SBOM for shipped bundles (audit B1, partial)                      | L7                                                                                                        |
| TypeScript 7 / Vite 8 / @types/node 26 holds (deps check 2026-10) | L3 / L4 / maintenance cadence (@types/node moves with the runtime)                                        |
