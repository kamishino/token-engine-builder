---
'token-engine-builder': patch
---

Refactor token-engine CLI and subcommands to typed shared cores:
- Extracted programmatic execution cores into `src/shared/`: `generateTokens`, `auditTokens`, `compileTokens`, `extractSpec`, and `routeProject`.
- Added standard exit code taxonomy (`EXIT`) with typed errors across `token-engine` subcommands (OK=0, USAGE=2, REFUSAL=3, AUDIT=4, VALIDATION=5).
- Enabled idempotent clean re-runs for token generators and compilers without requiring `--force`.
- Implemented non-destructive audit stamp verification preserving valid stamps when spec binding fails.
- Preserved clean stream discipline: errors to stderr, clean JSON to stdout on `--json`.
- Added friendly error guidance for optional Playwright dependency when using `--url`.
