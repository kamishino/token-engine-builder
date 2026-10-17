# ADR-0001 — Port style-detection knowledge from kamiflow design-system-tokens

Status: accepted (2026-10-17)

## Context

The kamiflow `design-system-tokens` skill (predecessor of this repo) runs a unified style pipeline: discovery scan + interview (Pass 0 / Gate A), Kobayashi 16-cluster palette mapping with admissible OKLCH bounds, APCA+WCAG dual certification, DESIGN.md contract generation, and a visualizer approval gate (Gate B). This repo's 4-skill pipeline (`token-style → token-math → token-audit → token-build`) shipped interview-first only, with a single inline adjective→hue rule. Research notes (`docs/research/skill-categorization-and-style-detection.md`, `design-skills-survey.md`, `skills-architecture-comparison.md`) catalogued the gap. A double-check of the old knowledge base found it mostly sound, with defects to fix on port: heuristic APCA formula, non-spec `$type` names, string color values, raw literals inside its component seed, drifting version numbers, and two contradictory sine-chroma formulas.

## Decision

Port knowledge as `references/` documents inside owning skills — `style-clusters.md`, `design-mappings.md`, `discovery-checklist.md` (token-style), `contrast.md` role floors (token-audit) — applying corrections during the port: bounds only (never token values), kebab token keys, DTCG object colors, single version from `package.json`. Record the resolved cluster in `style-spec.json`. Explicitly **not** ported in this decision: APCA dual certification, DESIGN.md contract generation, Gate B visualizer, exemplar-matching, and a shadcn output profile. Each may be revisited by its own ADR when a concrete consumer demands it.

## Consequences

- Anchor selection is bounded and auditable (cluster + read-back) instead of improvised; light-cluster anchors pick near the lightness floor, verified by the audit gate (light action deepened to `brand.700` as a direct consequence).
- The old monolith stays a separate product; convergent evolution happens here by porting knowledge, not by importing its router or engines.
- References must never describe behavior no script implements; future ports land doc + engine together.
