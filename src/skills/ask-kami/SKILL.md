---
name: ask-kami
description: 'Design-system entry router: detect spec, tokens, audit, and build state, then name the next skill and exact command.'
license: MIT
compatibility: Node.js >=22.12
allowed-tools: 'Bash Read'
disable-model-invocation: true
---

# Ask Kami — Design System Router

Entry point to the token pipeline: inspects the current workspace, classifies the design-system state, and proposes the next logical skill and exact command.

## Usage

Run commands from the user's project root. `<skill-root>` is the absolute path to this skill's installed folder (the folder containing this `SKILL.md`); resolve it with your skill loader or by locating this file.

**Before running a command:** state the resolved value of `<skill-root>` (and any other `<...-root>` placeholder in the command) in your reply, then substitute it. If you cannot resolve it, stop and ask the user for the skill folder. Never run a command containing literal `<` or `>`.

Example: if this file is at `~/.claude/skills/ask-kami/SKILL.md`, then `<skill-root>` is `~/.claude/skills/ask-kami`.

```bash
node <skill-root>/scripts/route.mjs [--root <dir>] [--json]
```

## Steps

1. **Detect state**: run the router script:

   ```bash
   node <skill-root>/scripts/route.mjs --root .
   ```

   (Pass `--json` when structured machine output is required.)
   - Done when: the command exits 0 and prints a `state:` status line plus a `next:` recommendation line (or `next: none`).

2. **Propose next action**: read the `next:` and `why:` recommendations from the output:
   - When `style-spec.json` is missing, the router proposes both `token-extract` (for existing projects with CSS/code colors) and `token-style` (for greenfield projects). Ask the user which path fits their project.
   - For all other states, present the single recommended skill, exact copy-pasteable command when the skill ships a script (`token-style` has none), and reason.
   - Do not execute the next skill in this turn — hand off cleanly.
   - Done when: the user has the concrete next skill command and knows why it is needed.

See `references/routing-table.md` for the complete state decision matrix.
