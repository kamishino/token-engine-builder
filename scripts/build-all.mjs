#!/usr/bin/env node
/**
 * Builds each skill in its own Vite pass (SKILL_ENTRY) so every
 * dist/<skill>/scripts/*.mjs is fully self-contained — no shared chunks.
 * Skills without scripts are still synced by the sync-skill-packages plugin.
 *
 * Usage: node scripts/build-all.mjs [skill...] — with names, only those
 * skills build (dist/ is wiped only for full builds, filtered builds append).
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = join(rootDir, 'src', 'skills');
const viteBin = join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');

const only = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
const skillsWithScripts = readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(skillsDir, entry.name, 'scripts')))
  .map((entry) => entry.name)
  .filter((name) =>
    readdirSync(join(skillsDir, name, 'scripts')).some((file) => file.endsWith('.ts')),
  )
  .filter((name) => only.length === 0 || only.includes(name));

for (const name of only) {
  if (!skillsWithScripts.includes(name)) {
    console.error(`[build] unknown skill: ${name}`);
    process.exit(1);
  }
}

// Full builds start clean; filtered builds append so sibling outputs survive.
const wipe = only.length === 0;
if (wipe) rmSync(join(rootDir, 'dist'), { recursive: true, force: true });

skillsWithScripts.forEach((skill, index) => {
  console.log(`\n[build] ${skill}`);
  execFileSync(process.execPath, [viteBin, 'build'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, SKILL_ENTRY: skill, SKILL_EMPTY: wipe && index === 0 ? '1' : '0' },
  });
});

console.log(`\n[build] done: ${skillsWithScripts.length} skill(s) → dist/`);

// Freshness/integrity stamps for link-skills.mjs: every src skill gets a JSON
// stamp {builtAt, bundleHash}, including scriptless skills. link-skills
// rebuilds when sources are newer than builtAt OR bundle bytes no longer
// match bundleHash (post-build tampering).
// (Dist file mtimes cannot signal freshness: copied statics keep source mtimes.)
for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const scriptsDir = join(rootDir, 'dist', entry.name, 'scripts');
  let bundleHash = '';
  if (existsSync(scriptsDir)) {
    const hash = createHash('sha256');
    for (const file of readdirSync(scriptsDir).sort()) {
      if (file.endsWith('.mjs')) hash.update(readFileSync(join(scriptsDir, file)));
    }
    bundleHash = hash.digest('hex');
  }
  writeFileSync(
    join(rootDir, 'dist', entry.name, '.buildstamp'),
    `${JSON.stringify({ builtAt: Date.now(), bundleHash })}\n`,
    'utf8',
  );
}
