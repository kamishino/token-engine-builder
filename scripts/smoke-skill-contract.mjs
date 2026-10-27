#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(rootDir, 'dist');

const SKILLS = [
  'design-tokens',
  'setup-pre-tokens',
];

if (!existsSync(distDir)) {
  console.error('dist/ directory missing; run npm run build first');
  process.exit(1);
}

let failed = 0;
function fail(msg) {
  failed++;
  console.error(`FAIL: ${msg}`);
}
function pass(msg) {
  console.log(`PASS: ${msg}`);
}

for (const skill of SKILLS) {
  const skillDir = join(distDir, skill);
  const skillMdPath = join(skillDir, 'SKILL.md');
  if (!existsSync(skillMdPath)) {
    fail(`${skill}: dist/${skill}/SKILL.md missing`);
    continue;
  }

  const md = readFileSync(skillMdPath, 'utf8');

  // 1. Literal execution guard if <...-root> placeholders are used
  if (md.includes('-root>') && !md.includes('Never run a command containing literal')) {
    fail(`${skill}: SKILL.md missing literal-execution preflight guard`);
  }

  // 2. Zero hardcoded home-directory references
  if (md.includes('~/.agents/skills')) {
    fail(`${skill}: SKILL.md contains banned hardcoded ~/.agents/skills path`);
  }

  // 3. Command extraction and resolution
  const commands = [...md.matchAll(/node <([a-z0-9-]+)-root>\/scripts\/([a-z0-9.-]+\.mjs)/g)];
  for (const [, target, script] of commands) {
    const targetRoot = target === 'skill' ? skillDir : join(distDir, target);
    const scriptPath = join(targetRoot, 'scripts', script);
    if (!existsSync(scriptPath)) {
      fail(`${skill}: resolved command target missing: ${scriptPath}`);
      continue;
    }
    const res = spawnSync(process.execPath, [scriptPath, '--help'], {
      encoding: 'utf8',
      cwd: distDir,
    });
    if (res.status !== 0 || !res.stdout.includes('Usage:')) {
      fail(`${skill} command ${script} --help failed (exit ${res.status}):\n${res.stderr}`);
    } else {
      pass(`${skill} -> ${target}/scripts/${script} --help`);
    }
  }

  // 4. reference commands verification
  if (skill === 'design-tokens') {
    const refsDir = join(skillDir, 'references');
    if (!existsSync(refsDir)) {
      fail('design-tokens: missing references/ directory');
    } else {
      const refFiles = readdirSync(refsDir).filter((f) => f.endsWith('.md'));
      const routeCmds = new Set();
      for (const refFile of refFiles) {
        const mdContent = readFileSync(join(refsDir, refFile), 'utf8');
        for (const [, target, script] of mdContent.matchAll(
          /node <([a-z0-9-]+)-root>\/scripts\/([a-z0-9.-]+\.mjs)/g,
        )) {
          routeCmds.add(`${target}:${script}`);
        }
      }
      for (const entry of routeCmds) {
        const [target, script] = entry.split(':');
        const targetRoot = target === 'skill' ? skillDir : join(distDir, target);
        const scriptPath = join(targetRoot, 'scripts', script);
        if (!existsSync(scriptPath)) {
          fail(`design-tokens references point to missing script: ${scriptPath}`);
          continue;
        }
        const res = spawnSync(process.execPath, [scriptPath, '--help'], {
          encoding: 'utf8',
          cwd: distDir,
        });
        if (res.status !== 0 || !res.stdout.includes('Usage:')) {
          fail(`design-tokens script reference ${target}/${script} failed (exit ${res.status})`);
        } else {
          pass(`design-tokens script reference -> ${target}/${script} --help`);
        }
      }
    }
  }
}

if (failed > 0) {
  console.error(`\nAgent contract smoke failed with ${failed} error(s).`);
  process.exit(1);
}

console.log('\nAll agent skill contracts and CLI entrypoints verified successfully.');
