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
import { existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMainModule } from '../src/shared/paths.ts';
import {
  discoverScriptEntries,
  listSkills,
  syncSkillPackages,
  writeBuildStamp,
} from './build-engine.mjs';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function planBuildPasses(skillsDir, only = []) {
  const allSkills = listSkills(skillsDir);
  const unknown = only.filter((name) => !allSkills.includes(name));
  if (unknown.length > 0) throw new Error(`unknown skill: ${unknown.join(', ')}`);
  const requested = only.length === 0 ? allSkills : only;
  const scripted = requested.filter((skill) => existsSync(join(skillsDir, skill, 'scripts')));
  const { scriptEntries } =
    scripted.length === 0 ? { scriptEntries: [] } : discoverScriptEntries(skillsDir, scripted);
  const builtSkills = [...new Set(scriptEntries.map((entry) => entry.skill))].sort();
  const staticSkills = allSkills
    .filter((skill) => !existsSync(join(skillsDir, skill, 'scripts')))
    .sort();
  return {
    allSkills,
    requested,
    scriptEntries,
    builtSkills,
    staticSkills,
    wipe: only.length === 0,
  };
}

export function runBuildAll(argv = process.argv.slice(2), { root = rootDir, runVite } = {}) {
  const only = argv.filter((arg) => !arg.startsWith('-'));
  const skillsDir = join(root, 'src', 'skills');
  const distDir = join(root, 'dist');
  const plan = planBuildPasses(skillsDir, only);
  if (plan.wipe) rmSync(distDir, { recursive: true, force: true });

  const runner =
    runVite ??
    ((pass) => {
      execFileSync(
        process.execPath,
        [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'],
        {
          cwd: root,
          stdio: 'inherit',
          env: { ...process.env, ...pass.env },
        },
      );
    });

  plan.scriptEntries.forEach(({ skill, script }, index) => {
    console.log(`\n[build] ${skill}/${script}`);
    runner({
      skill,
      script,
      env: {
        SKILL_ENTRY: `${skill}/scripts/${script}`,
        SKILL_EMPTY: plan.wipe && index === 0 ? '1' : '0',
      },
    });
  });

  // Statics are copied on every pass; call directly so a static-only build syncs too.
  syncSkillPackages(skillsDir, distDir);
  for (const skill of [...plan.builtSkills, ...plan.staticSkills]) {
    writeBuildStamp(distDir, skill);
  }

  console.log(
    `\n[build] done: ${plan.scriptEntries.length} script(s) across ${plan.builtSkills.length} skill(s) → dist/`,
  );
  return plan;
}

if (isMainModule(import.meta.url, 'build-all.mjs')) {
  runBuildAll();
}
