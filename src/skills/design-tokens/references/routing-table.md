# Routing Table — State Decision Matrix

Read when understanding how the engine routes project state to the next action. The `token-engine route` command is authoritative; this document explains its logic.

## State Decision Matrix

| State                     | Detected Condition                        | Next Role / Action        | Next Command                                                                                                           | Rationale                                                                                  |
| ------------------------- | ----------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **No specification**      | `tokens.config.json` missing              | `extract` / Socratic      | `node <skill-root>/scripts/token-engine.mjs extract --root . --out tokens.config.json` or — (agent interview)         | Extract if the project has existing CSS/code colors; otherwise run the Socratic interview. |
| **Invalid specification** | `tokens.config.json` fails validation     | Socratic review           | — (agent interview, no script)                                                                                         | Review printed schema validation errors and fix required fields.                           |
| **Missing tokens**        | `tokens/` missing or empty                | `generate` or `sync`      | `node <skill-root>/scripts/token-engine.mjs generate --spec tokens.config.json --out tokens`                            | Generate the 3-tier DTCG token scaffold from the specification.                            |
| **Audit not passing**     | Stamp missing, stale, or contrast failure | `audit`                   | `node <skill-root>/scripts/token-engine.mjs audit --tokens tokens --min-ratio 4.5`                                     | Measure contrast across 42 pairs and record passing stamp.                                 |
| **Spec binding mismatch** | Tokens do not match spec hash             | `generate` (force)        | `node <skill-root>/scripts/token-engine.mjs generate --spec tokens.config.json --out tokens --force`                    | Re-generate tokens to reflect specification changes.                                       |
| **Missing build**         | `build/` missing or incomplete            | `build`                   | `node <skill-root>/scripts/token-engine.mjs build --tokens tokens --out build --theme light --spec tokens.config.json` | Compile tokens to CSS variables, Tailwind `@theme`, and `DESIGN.md`.                       |
| **All systems green**     | Full pipeline verified                    | `diagnose`                | `node <skill-root>/scripts/token-engine.mjs diagnose --root .`                                                         | Pipeline is certified; evaluate system health and coverage.                                |

`<skill-root>` is the installed folder containing the loaded `SKILL.md`. Before running a command, state the resolved value of `<skill-root>` in your reply, then substitute it.
