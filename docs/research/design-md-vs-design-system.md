# DESIGN.md (Google Stitch format) vs. this design-token system

Research positioning the Stitch-format `DESIGN.md` against token-engine-builder's architecture, from primary sources on 2026-10-19. Purpose: settle what DESIGN.md is, what it is not, and where it belongs in the roadmap (X1) relative to the five skills.

## 1. The Stitch DESIGN.md standard

The format, as shipped in the kamiflow design-contract template (which declares "Google Stitch format. Sections 1-8 are normative and ordered; Repo Extensions is non-normative") and produced upstream by Stitch's `extract-design-md` (source-reading) and `design-md` (render-reading) skills (see [stitch-skills-architecture.md](./stitch-skills-architecture.md) §§1–2):

- **Frontmatter** (YAML): `version`, `name`, `description`, plus compact maps — `colors: {primary, secondary}`, `typography: {fontSans, scale}`, `rounded: {sm, md, lg}` (px strings), `spacing: {base, density}`, and a `components` name list (kamiflow template, lines 1–10).
- **Eight normative sections, in order**: Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts; plus a non-normative Repo Extensions block (Iteration Guide, Known Gaps, Responsive Behavior) (template, lines 12–67).
- **Content character**: descriptive prose with hex values and `var(--…)` references — written for a hosted design AI to _read_ (the upstream `design-md` skill synthesizes it from screens; `extract-design-md` from source files, per the stitch note §2). Judgement slots (`{{OVERVIEW}}`, `{{LAYOUT}}`, …) are filled by an agent, not computed.
- **Validation**: kamiflow's `design-md --validate` checks frontmatter keys and section order/shape (template header comment). Neither version computes contrast, resolves aliases, or compiles anything — there is no measured gate between the document and its claims.

So DESIGN.md is a **contract document**: a brand/design brief in a machine-skimmable envelope. Its colors are claims, not values under test.

## 2. This repo's architecture: where the system of record lives

Authority flows one direction ([ARCHITECTURE.md §§1–3](../ARCHITECTURE.md), [ADR-0002](../adr/0002-palette-first-style-spec.md)):

`style-spec.json` (recorded decisions: creative palette, ramp steps, cluster) → `tokens/` (values: 3-tier DTCG, alias-only above primitives, sRGB-gamut-clamped) → `token-audit` (measured dual WCAG + APCA gate, 28 pairs/theme, provenance manifests) → `tokens.css` + `theme.css` + `components.md` (compiled views). Nothing downstream is a source; a value that disagrees with the gate fails the build.

Relationship of DESIGN.md concepts to our artifacts:

| DESIGN.md concept                  | Our artifact (source of truth)                                                               | Relationship                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `colors.primary/secondary` (hex)   | Palette anchors in `style-spec.json` → named ramps `color.<slug>.*`                          | Ours are OKLCH, gamut-clamped, ramp-expanded; a DESIGN.md hex would be a rendered snapshot of step 500 |
| `typography` (fontSans, scale)     | Spec typography (family, base, ratio, baseLineHeight) → `font-size`/`line-height` primitives | Ours also carry the baseline rhythm derivation                                                         |
| `rounded` / `spacing` (px strings) | `radius` / `spacing` primitives + semantic `layout` roles                                    | Ours resolve through aliases and density; the document flattens them                                   |
| `components` (name list)           | Component tokens → generated `components.md` (state → token → resolved value)                | Ours document states with measured pairs behind them (audit matrix)                                    |
| 8 prose sections                   | SKILL.md procedures + `references/` (clusters, mappings, contrast floors, scales)            | Our guidance is agent-executed and gate-backed, not read by a hosted AI                                |
| (no equivalent)                    | Audit gate, provenance manifests, tier discipline                                            | The document format has no place for measured evidence — the system's core differentiator              |

## 3. Skills relationship review

- **token-style**: produces the decisions DESIGN.md's frontmatter summarizes (palette, typography, radii). It would _feed_ a generated DESIGN.md, never read one as input — brand judgement enters via interview/clusters, not via a descriptive document.
- **token-extract**: the closest relative of Stitch's extraction skills, but it extracts into our spec (measured pipeline), not into prose. A foreign DESIGN.md could be one more scan source for candidate anchors — evidence, ranked like any other, still subject to read-back.
- **token-math**: owns generation. If DESIGN.md is ever emitted, it is emitted here or in token-build as a derived rendering of the token tree — frontmatter values rendered from tokens, sections templated from references.
- **token-audit**: the authority DESIGN.md lacks. Any DESIGN.md color that disagreed with the audited tree would be a bug in the document, never in the tokens — the consistency check in roadmap X1 exists to prove they cannot drift.
- **token-build**: the natural emitter (it already renders `components.md` from the resolved dictionary); a `DESIGN.md` output would sit beside `components.md` as another compiled view, hashed into the same provenance manifest.

Direction of authority in every case: **spec/tokens are the source; DESIGN.md is derived.** A file whose colors could disagree with the audit gate must never outrank it.

## 4. Verdict

DESIGN.md in the Stitch format is an NN/g front-end style-guide child rendered in the format design AIs already read (see [design-systems-vs-style-guides.md](./design-systems-vs-style-guides.md)) — valuable as an export surface, insufficient as a design system: no tiers, no aliases, no measured contrast, no deterministic generation, no compilable output. Adopting it here means exactly one thing: **generate it from the token system** (roadmap X1, format pinned), with a consistency check binding its frontmatter to token values. Authoring tokens from a DESIGN.md — the direction Stitch's own pipeline implies — is rejected for this architecture.

## Sources

- `C:\Users\toanh\Desktop\Projects\kamiflow-skills\dist\skills\design-system-tokens\assets\templates\design-contract.template.md` (frontmatter + section structure, read directly)
- [stitch-skills-architecture.md](./stitch-skills-architecture.md) §§1–2 (upstream extract/design-md production, frontmatter semantics)
- [ARCHITECTURE.md](../ARCHITECTURE.md) §§1–5; [ADR-0001](../adr/0001-port-style-detection-knowledge.md), [ADR-0002](../adr/0002-palette-first-style-spec.md), [ADR-0003](../adr/0003-configurable-baseline-and-full-audit-matrix.md)
- [design-systems-vs-style-guides.md](./design-systems-vs-style-guides.md) (NN/g child taxonomy)
