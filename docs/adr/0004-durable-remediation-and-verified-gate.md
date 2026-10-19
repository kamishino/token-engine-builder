# ADR-0004 — Durable remediation, verified gate, recorded cluster bounds

Status: accepted (2026-10-19)

## Context

The usage/iteration research (`docs/research/agent-usage-scenarios-and-iteration.md`) found three procedural seams where a SKILL.md instruction, not code, carried the rule: remediation rung 1 edited a generated semantic file that the next `generate` rewrites (fix evaporates and trips provenance); `token-build` never verified the audit ran (the gate was an honour rule at the build boundary); and cluster conformance was checked only by the agent's own read-back (an out-of-cluster anchor passed every script). It also found `targets.minWcagRatio` recorded in every spec but read by no script, and DESIGN.md files invisible to token-extract.

## Decision

1. **Durable remediation lives in the spec**: `overrides` (theme → semantic path → alias) is applied by generate into the generated semantic files, before the provenance manifest is hashed. Editing generated files is removed as a remediation action. (Preserving hand-edited semantic files across regeneration was rejected: it would restore a second edit surface.)
2. **The gate is verified, not honoured**: a passing audit writes `.token-engine-audit.json` (tree hash of the token files); build recomputes the hash and refuses without a fresh passing stamp. The only bypass is the explicit, printed `--allow-unaudited` flag — visible friction, never a silent default or a warn-only pass.
3. **Cluster bounds are recorded in the spec** (`clusterBounds`, copied from the cluster table at record time) and generate warns — never fails — on out-of-bounds anchors. (A machine-readable cluster table inside generate was rejected: it would duplicate the reference document's bounds in a second home.)
4. Supporting wiring: DESIGN.md frontmatter ingestion in token-extract (frontmatter preserved as recorded; prose remains evidence), and the audit `--spec` flag so the recorded `targets.minWcagRatio` actually drives the floor when no CLI floor is given.

## Consequences

- Remediation survives regeneration and is itself provenance-covered; the spec remains the single edit surface for every durable decision.
- A consumer tree predating the stamp needs one audit run (or the explicit bypass) before its first build — that friction is the gate working as intended.
- Out-of-cluster creative departures remain allowed and now leave a printed, greppable trace at generate time instead of depending on read-back discipline.
