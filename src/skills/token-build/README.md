# token-build

Final stage of the pipeline: compiles an audited 3-tier token tree into CSS custom properties plus a Tailwind v4 `@theme` block, via programmatic Style Dictionary v5 — no Style Dictionary install needed downstream.

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

Entry condition: `token-audit` exits 0 on this exact tree. Each build emits `tokens.css` (`:root`, OKLCH colors, rem dimensions), `theme.css` (Tailwind v4 `@theme`), `components.md` (component specifications with states and composite patterns), and `DESIGN.md` (Stitch-format guide; `--spec <style-spec.json>` renders frontmatter/prose from the recorded palette). Optional `--visualizer` emits `visualizer.html` for interactive visual inspection in browsers. UI-library profiles (`--profile shadcn|bootstrap|primevue|antd|mui|chakra|radix|fluent`) emit one dual-theme CSS file mapped to that library's variables — see `references/ui-library-profiles.md` for the full library list. Gold standards live in `examples/`, and `templates/sd.config.json` documents the config shape. The full procedure is in [SKILL.md](SKILL.md).
