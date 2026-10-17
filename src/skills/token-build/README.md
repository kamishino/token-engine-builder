# token-build

Final stage of the pipeline: compiles an audited 3-tier token tree into CSS custom properties plus a Tailwind v4 `@theme` block, via programmatic Style Dictionary v4 — no Style Dictionary install needed downstream.

## Install

```bash
cp -r dist/token-build ~/agents/skills/token-build
```

Requires Node `>=22.12`. No install step: Style Dictionary is inlined into `scripts/build.mjs` at build time.

## Use

```bash
node ~/agents/skills/token-build/scripts/build.mjs --tokens tokens --out build --theme light
node ~/agents/skills/token-build/scripts/build.mjs --tokens tokens --out build/dark --theme dark
```

Entry condition: `token-audit` exits 0 on this exact tree. Each build emits `tokens.css` (`:root`, OKLCH colors, rem dimensions) and `theme.css` (Tailwind v4 `@theme`); gold standards live in `examples/`, and `templates/sd.config.json` documents the config shape. The full procedure is in [SKILL.md](SKILL.md).
