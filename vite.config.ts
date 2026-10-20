import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { discoverSkillEntries } from './scripts/build-engine.mjs';

const rootDir = dirname(fileURLToPath(import.meta.url));
const skillsDir = resolve(rootDir, 'src/skills');
const distDir = resolve(rootDir, 'dist');

/**
 * Mirrors every `src/skills/<skill>/` package into `dist/<skill>/`:
 * SKILL.md + templates/ + assets/ + examples/ copied verbatim; bundled
 * scripts made executable. dist/ is production-readiness: per-skill README.md
 * files stay in src/ only and never ship.
 */
function syncSkillPackages(): Plugin {
  return {
    name: 'sync-skill-packages',
    closeBundle() {
      for (const skill of readdirSync(skillsDir, { withFileTypes: true })) {
        if (!skill.isDirectory()) continue;
        const src = join(skillsDir, skill.name);
        const dest = join(distDir, skill.name);
        mkdirSync(dest, { recursive: true });

        const skillMd = join(src, 'SKILL.md');
        if (existsSync(skillMd)) cpSync(skillMd, join(dest, 'SKILL.md'));

        for (const dir of ['templates', 'assets', 'examples', 'references', 'agents'] as const) {
          const from = join(src, dir);
          if (existsSync(from)) cpSync(from, join(dest, dir), { recursive: true });
        }

        const outScripts = join(dest, 'scripts');
        if (!existsSync(outScripts)) continue;
        for (const file of readdirSync(outScripts)) {
          if (file.endsWith('.mjs')) chmodSync(join(outScripts, file), 0o755);
        }
      }
    },
  };
}

// `npm run build` (scripts/build-all.mjs) builds ONE skill per Vite pass via
// SKILL_ENTRY=<skill>, so Rollup inlines shared code into that skill's .mjs
// instead of emitting a dist/_chunks/ shared chunk — each dist/<skill>/ folder
// must run standalone after being copied to ~/agents/skills/.
// A bare `vite build` (all entries, shared chunk) still works for quick checks.
const onlySkill = process.env['SKILL_ENTRY'];
const allEntries = discoverSkillEntries(skillsDir);
const entries =
  onlySkill === undefined
    ? allEntries
    : Object.fromEntries(
        Object.entries(allEntries).filter(
          ([key]) => key === onlySkill || key.startsWith(`${onlySkill}/`),
        ),
      );
const singleEntry = Object.keys(entries).length === 1;

export default defineConfig({
  plugins: [syncSkillPackages()],
  resolve: {
    alias: { '@shared': resolve(rootDir, 'src/shared') },
    // Node condition: style-dictionary's `./fs` export must resolve to its
    // node:fs implementation, not the browser memfs shim (`default`).
    conditions: ['node'],
  },
  // SSR (Node) build: bundles CLIs for Node, so bare built-ins (`fs`) are
  // treated as built-ins instead of browser shims; noExternal inlines all deps.
  // The `node` export condition is also scoped to the SSR environment
  // (Vite 8 environment resolution): style-dictionary's `./fs` export must
  // resolve to its node:fs entry, not the browser memfs default.
  ssr: { target: 'node', noExternal: true, resolve: { conditions: ['node'] } },
  environments: { ssr: { resolve: { conditions: ['node'] } } },
  build: {
    ssr: true,
    outDir: distDir,
    emptyOutDir: process.env['SKILL_EMPTY'] !== '0',
    target: 'node20',
    // Vite 8 / Rolldown: default minifier is Oxc (replaces 'esbuild').
    sourcemap: false,
    reportCompressedSize: false,
    rollupOptions: {
      input: entries,
      // Inline every npm dependency; Node built-ins (`node:*` and bare) stay external.
      // Exception: prettier — style-dictionary lazy-imports it only inside its
      // JS/TS output formats, which this engine never emits (all formats are
      // custom hooks); externalizing keeps ~450 kB of dead parser out.
      external: [/^node:/, /^prettier(\/.*)?$/, /^playwright(-core)?(\/.*)?$/, ...builtinModules],
      // style-dictionary's fs-node entry swaps memfs → node:fs via a top-level
      // setFs() call; Rolldown drops it under a blanket `false`, so that one
      // module keeps its side effects.
      treeshake: { moduleSideEffects: (id: string) => id.endsWith('fs-node.js') },
      output: {
        format: 'es',
        entryFileNames: '[name].mjs',
        chunkFileNames: '_chunks/[name]-[hash].mjs',
        banner: '#!/usr/bin/env node',
        ...(singleEntry ? { codeSplitting: false } : {}),
      },
    },
  },
});
