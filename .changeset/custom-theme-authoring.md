---
'token-engine-builder': minor
---

Dynamic Custom Theme Authoring (C2) shipped: consumers can now declare arbitrary custom themes (e.g. `sepia`, `solarized`, brand variants) in `style-spec.json` via `themes: { [name]: { mode: 'light'|'dark', surfaceSteps, actionStep } }`. End-to-end integration across token-math, token-audit, and token-build (`--theme <name>`).
