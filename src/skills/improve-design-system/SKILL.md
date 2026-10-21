---
name: improve-design-system
description: 'Review a design system, find gaps, and write a self-contained HTML report with resolution steps.'
license: MIT
compatibility: Node.js >=22.12
allowed-tools: 'Bash Read Write'
disable-model-invocation: true
---

# Improve Design System — Review & Proposal Report

Evaluates a project's design system health (spec validity, token tier coverage, WCAG+APCA contrast compliance, build parity, and documentation drift) and produces a visual, self-contained HTML report. If no design system exists, proposes a full token specification aligned to the project goal.

## Usage

Run commands from the user's project root directory; `~/.agents/skills/improve-design-system` is this skill's installed folder.

```bash
node ~/.agents/skills/improve-design-system/scripts/diagnose.mjs [--root <dir>] [--spec <style-spec.json>] [--tokens <dir>] [--build <dir>]
```

## Steps

1. **Diagnose**: run the diagnosis script against the project root:

   ```bash
   node ~/.agents/skills/improve-design-system/scripts/diagnose.mjs --root .
   ```

   (Pass `--spec`, `--tokens`, or `--build` when targets differ from default root locations.)
   - Done when: the command exits 0 and prints structured JSON containing `state`, `findings`, and `nextActions`.

2. **Branch on system existence**:
   - **No design system** (`state.spec.status === 'missing'`): read `package.json`, `README.md`, and up to five source files to understand the product domain and brand tone. Write a proposal report outlining the recommended palette anchors, modular type ratio, spacing density, corner radii presets, and the exact `style-spec.json` skeleton. State that running `token-style` (or `token-extract` if code colors exist) will formally record the decisions. Do not write or edit files in the repository.
   - **Existing design system**: use the structured diagnosis findings (errors, warnings, contrast shortfall remedies, provenance tamper reports, and missing artifacts) as the review content.
   - Done when: the branch's required inputs are read and the review findings or proposal skeleton are ready for the report.

3. **Write report**: compose a self-contained HTML review following `references/report-format.md` into the OS temp directory (`design-system-review-<timestamp>.html`). Open it for visual inspection (`start <path>` on Windows, `open <path>` on macOS, `xdg-open <path>` on Linux) and tell the user the absolute path. Never edit working-tree tokens, spec, or build files here.
   - Done when: the report HTML file is written to temp and opened.

4. **Read back**: in chat, summarize the top three findings by severity, state the single top recommendation with its exact command, and ask: "Which hole should I resolve first?"
   - Done when: the user sees the summary, the top recommendation, and the report file path.
