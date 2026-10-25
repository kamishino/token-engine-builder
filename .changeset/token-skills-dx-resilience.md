---
'token-engine-builder': minor
---

Enhance `token-*` skills DX and agent resilience based on real-world monorepo trials:
- `token-build`: Added `--theme all` batch multi-theme compilation, emitting consolidated `tokens.css` with automatic theme switching (`@media (prefers-color-scheme: dark)` and `[data-theme="..."]`) alongside standalone split theme files.
- `token-build`: Added typed JavaScript and TypeScript dictionary exports (`tokens.js` and `tokens.d.ts`) by default for WebGL, Canvas, and frontend runtime consumers.
- `token-build`: Added `--selector <string>` (defaults to `:root`) to support Web Components and Shadow DOM scoping (e.g. `--selector ":host, :root"`).
- `token-build`: Added `--package [name]` to scaffold monorepo workspace packages (`package.json` with `./css`, `./theme`, and `.` exports).
- `token-build` & `token-audit`: Standardized cold-start diagnostics on missing prerequisites (`state: missing-tokens`, `next: token-extract`, and `why:`).
- `token-math` & paths: Prevented local development and workstation build directory paths from leaking into runtime CLI hints, preserving portable placeholders.
