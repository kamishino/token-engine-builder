---
'token-engine-builder': patch
---

Build toolchain migrated to Vite 8 (Rolldown): Oxc minification replaces esbuild, per-skill bundles use `codeSplitting: false`, style-dictionary's node:fs entry is preserved through tree-shaking, and its lazy prettier import is externalized (~450 kB of dead parser removed from token-build). Shipped bundle behavior is unchanged; token-build shrinks from 1.64 MB to 1.17 MB.
