# Dependency update check — 2026-10

Evidence gathered 2026-10-19: `npm outdated` plus live registry peer/engine ranges. Exactly three packages are behind, all majors (Wanted == Current everywhere else, so no patch/minor updates exist to apply).

| Package       | Current | Latest | Decision | Reason                                                                                                                                                                                                                                                                                           |
| ------------- | ------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `typescript`  | 6.0.3   | 7.0.2  | **Hold** | Blocker intact: `typescript-eslint@8.71.2` peer range is `typescript: >=4.8.4 <6.1.0` (verified live). TS 7 has no stable JS compiler API for typescript-eslint to consume. Revisit when the peer range admits ≥7 (expected with a TS 7.1 API).                                                  |
| `vite`        | 7.3.7   | 8.3.4  | **Hold** | Vite 8 replaces Rollup with Rolldown; this repo's three load-bearing build decisions (per-skill passes, SSR/Node mode, inline token merge) sit on the Rollup option surface (ARCHITECTURE.md §4). Engines (`^20.19.0 \|\| >=22.12.0`) are satisfied, so this is a migration project, not a bump. |
| `@types/node` | 22.20.5 | 26.6.5 | **Hold** | Types-only package tracking a Node 26 runtime; local and CI run Node 22 (`engines >=22.12`, CI setup-node 22). The 22 line stays until the runtime moves.                                                                                                                                        |

Everything else in `devDependencies` is at its in-range latest (colorjs.io 0.7.1, style-dictionary 5.7.0 — engines `node >=22.0.0`, satisfied — ESLint 10, Prettier, stylelint, changesets included). No version changes were made by this check; if a future check finds in-range patch/minor updates, `npm update` applies them without a decision.

Sources: `npm outdated` output (2026-10-19); `npm view typescript-eslint@latest peerDependencies`; `npm view style-dictionary@latest engines`; `npm view vite@latest engines`; `package.json` engines/scripts.
