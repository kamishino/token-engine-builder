# Routing Table — State Decision Matrix

Read when understanding how `ask-kami` maps project state to the next action. The `route.mjs` script is authoritative; this document explains its logic.

## State Decision Matrix

| State                     | Detected Condition                        | Next Skill                      | Next Command                                                                                                        | Rationale                                                                                  |
| ------------------------- | ----------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **No specification**      | `style-spec.json` missing                 | `token-extract` / `token-style` | `node ./scripts/extract.mjs --root . --out style-spec.json` or — (agent interview, no script) | Extract if the project has existing CSS/code colors; otherwise run the Socratic interview. |
| **Invalid specification** | `style-spec.json` fails validation        | `token-style`                   | — (agent interview, no script)                                                      | Review printed schema validation errors and fix required fields.                           |
| **Missing tokens**        | `tokens/` missing or empty                | `token-math`                    | `node ./scripts/generate.mjs --spec style-spec.json --out tokens`                                                   | Generate the 3-tier DTCG token scaffold from the specification.                            |
| **Audit not passing**     | Stamp missing, stale, or contrast failure | `token-audit`                   | `node ./scripts/audit.mjs --tokens tokens --spec style-spec.json`                                                   | Measure contrast across 42 pairs and record passing stamp.                                 |
| **Spec binding mismatch** | Tokens do not match spec hash             | `token-math`                    | `node ./scripts/generate.mjs --spec style-spec.json --out tokens --force`                                           | Re-generate tokens to reflect specification changes.                                       |
| **Missing build**         | `build/` missing or incomplete            | `token-build`                   | `node ./scripts/build.mjs --tokens tokens --out build --theme light --spec style-spec.json`                         | Compile tokens to CSS variables, Tailwind `@theme`, and `DESIGN.md`.                       |
| **All systems green**     | Full pipeline verified                    | `improve-design-system`         | `node ./scripts/diagnose.mjs --root .`                                                                              | Pipeline is certified; evaluate system health and coverage.                                |

The router script omits `command` for skills without a script (such as `token-style`).
