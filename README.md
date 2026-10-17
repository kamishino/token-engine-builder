# token-engine-builder

Builds and packages self-contained AI agent skills for 3-tier W3C DTCG design tokens. Each skill under `src/skills/<skill-name>/` builds 1:1 into `dist/<skill-name>/` — copy that folder to `~/agents/skills/<skill-name>/` and it runs standalone (`node`, no `npm install`).

## Pipeline

```text
1-design-style   Socratic interview            → style-spec.json
2-token-math     generate.mjs --spec …         → tokens/ (1-primitive → 2-semantic → 3-component)
3-token-audit    audit.mjs --tokens tokens     → WCAG 2.1 gate (exit 0/1)
4-token-build    build.mjs --tokens tokens     → tokens.css + Tailwind v4 theme.css
```

## Develop

```bash
npm install        # everything is a devDependency — Vite inlines it at build time
npm run build      # → dist/<skill>/ (SKILL.md + scripts/*.mjs + templates/ + assets/)
npm run check      # typecheck + lint + build
```

## Architecture notes

- **Tree-shaking**: `colorjs.io` is imported only via `colorjs.io/fn` procedural partials, registering just `sRGB` + `OKLCH` (`src/shared/colors.ts`); ESLint bans the monolithic entry. Vite builds in SSR/Node mode (`resolve.conditions: ['node']`, `ssr.noExternal`) with `treeshake: { moduleSideEffects: false }` + esbuild minify; Node built-ins stay external, all npm deps inline. `scripts/build-all.mjs` builds one skill per Vite pass so no shared chunk leaks between skill folders.
- **Style Dictionary v4** is driven programmatically with ESM imports (`style-dictionary`, `style-dictionary/utils`) and custom hooks: `color/oklch`, `dimension/rem`, `tailwind/v4-theme` (`src/shared/compiler.ts`). Token sources are expanded/merged in-process and passed as inline `tokens` — SD's bundled glob loader does not survive re-bundling.
- **Portability**: bundled scripts resolve `templates/`/`assets/` from `import.meta.url` (`src/shared/paths.ts`), never from cwd.
- **Tiers**: raw values live only in `1-primitive/`; semantic (per-theme) and component tokens are `{alias}`-only. `audit.mjs` enforces it.
