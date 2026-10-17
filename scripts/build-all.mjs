#!/usr/bin/env node
/**
 * Builds each skill in its own Vite pass (SKILL_ENTRY) so every
 * dist/<skill>/scripts/*.mjs is fully self-contained — no shared chunks.
 * Skills without scripts are still synced by the sync-skill-packages plugin.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = join(rootDir, 'src', 'skills');
const viteBin = join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');

const skillsWithScripts = readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(skillsDir, entry.name, 'scripts')))
  .map((entry) => entry.name)
  .filter((name) =>
    readdirSync(join(skillsDir, name, 'scripts')).some((file) => file.endsWith('.ts')),
  );

rmSync(join(rootDir, 'dist'), { recursive: true, force: true });

skillsWithScripts.forEach((skill, index) => {
  console.log(`\n[build] ${skill}`);
  execFileSync(process.execPath, [viteBin, 'build'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, SKILL_ENTRY: skill, SKILL_EMPTY: index === 0 ? '1' : '0' },
  });
});

console.log(`\n[build] done: ${skillsWithScripts.length} skill(s) → dist/`);
