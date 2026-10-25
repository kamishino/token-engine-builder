---
'token-engine-builder': minor
---

Evolve default design token contract filename to `tokens.config.json`:
- Updated `resolveSystemPaths` to prefer `tokens.config.json` while maintaining transparent backwards compatibility fallback to `style-spec.json`.
- Updated `token-engine` CLI (`sync`, `init`) to default to `tokens.config.json`.
- Updated cognitive skill guidelines and references to use `tokens.config.json`.
- Added unit tests in `test/system-state.test.mjs` verifying resolution precedence.
