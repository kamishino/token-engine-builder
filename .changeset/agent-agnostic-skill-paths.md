---
'token-engine-builder': patch
---

Make skill paths install-agnostic: `SKILL.md` commands use `<skill-root>`/`<target-skill-root>` resolved by the agent, runtime next-command output resolves co-located sibling skills and falls back to placeholders, and the READMEs document common agent skills directories plus `npm run deploy -- --dir`.
