---
name: ask-kami
description: 'Entry router: detect design-system state (spec, tokens, audit, build), then propose the next skill and exact command. Use when the user asks where to start or what to do next.'
license: MIT
compatibility: Node.js >=22.12
allowed-tools: 'Bash Read'
---

# Ask Kami — Design System Router

Entry point to the token pipeline: inspects the current workspace, classifies the design-system state, and proposes the next logical skill and exact command.

## Usage

```bash
node ./scripts/route.mjs [--root <dir>] [--json]
```

## Steps

1. **Detect state**: run the router script:

   ```bash
   node ./scripts/route.mjs --root .
   ```

   (Pass `--json` when structured machine output is required.)
   - Done when: the command exits 0 and prints the `state:` status line.

2. **Propose next action**: read the `next:` and `why:` recommendations from the output:
   - When `style-spec.json` is missing, the router proposes both `token-extract` (for existing projects with CSS/code colors) and `token-style` (for greenfield projects). Ask the user which path fits their project.
   - For all other states, present the single recommended skill, exact copy-pasteable command when the skill ships a script (`token-style` has none), and reason.
   - Do not execute the next skill in this turn — hand off cleanly.
   - Done when: the user has the concrete next skill command and knows why it is needed.

See `references/routing-table.md` for the complete state decision matrix.
