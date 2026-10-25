---
'token-engine-builder': minor
---

Transition to the unified `token-engine` CLI and flagship `design-tokens` cognitive skill:
- Added unified `token-engine` CLI (`dist/cli/token-engine.mjs`) registered as `"bin": { "token-engine": "dist/cli/token-engine.mjs" }`.
- Added `token-engine sync`: single-pass pipeline command running extraction, mathematical 3-tier generation, WCAG/APCA contrast auditing, and multi-theme compilation.
- Added `token-engine init`, `audit`, `build`, `extract`, and `scaffold` subcommands.
- Added flagship cognitive agent skill `src/skills/design-tokens/SKILL.md` (Matt Pocock model) focusing on context discovery, Socratic palette design, and production codebase refactoring.
- Added deprecation notices to existing 7 micro-skills pointing to `design-tokens` and `token-engine`.
