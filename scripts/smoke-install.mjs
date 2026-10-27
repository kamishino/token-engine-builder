#!/usr/bin/env node
/**
 * Smoke-test cross-machine skill installation via `skills add` (skills.sh ecosystem).
 * Verifies that:
 * 1. A clean checkout containing ONLY the committed mirror (no node_modules, dist, or release)
 *    is fully discoverable by the skills CLI.
 * 2. Project install (-a claude-code -a codex) installs runnable skills and scripts/token-engine.mjs.
 * 3. Global install (-g -a claude-code) places runnable skills into the user home.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMainModule } from '../src/shared/paths.ts';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const EXCLUDED_TOP_LEVEL = new Set(['.git', 'node_modules', 'dist', 'release']);

function copyCleanSource(sourceRoot, destRoot) {
  mkdirSync(destRoot, { recursive: true });
  for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
    if (EXCLUDED_TOP_LEVEL.has(entry.name)) continue;
    const src = join(sourceRoot, entry.name);
    const dest = join(destRoot, entry.name);
    cpSync(src, dest, { recursive: true });
  }
}

function findFileRecursive(dir, relativeTarget) {
  if (!existsSync(dir)) return null;
  const targetEnd = relativeTarget.replace(/^[/\\]+/, '').replaceAll('/', '\\');
  const queue = [dir];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(full);
      } else {
        const rel = full.slice(dir.length).replace(/^[/\\]+/, '');
        if (rel.endsWith(targetEnd) || rel.replaceAll('/', '\\').endsWith(targetEnd)) {
          return full;
        }
      }
    }
  }
  return null;
}

export function runSmokeInstall({ root = rootDir } = {}) {
  const skillsCli = join(root, 'node_modules', 'skills', 'bin', 'cli.mjs');
  if (!existsSync(skillsCli)) {
    console.error(`FAIL: skills CLI missing at ${skillsCli}. Run npm install.`);
    return 1;
  }

  const mirrorDir = join(root, 'skills');
  if (
    !existsSync(join(mirrorDir, 'design-tokens', 'scripts', 'token-engine.mjs')) ||
    !existsSync(join(mirrorDir, 'design-tokens', 'SKILL.md')) ||
    !existsSync(join(mirrorDir, 'setup-pre-tokens', 'SKILL.md'))
  ) {
    console.error(`FAIL: committed skills/ mirror is missing or incomplete. Run npm run build.`);
    return 1;
  }

  const tempBase = mkdtempSync(join(tmpdir(), 'smoke-skills-install-'));
  const cleanSourceDir = join(tempBase, 'clean-repo');
  const tempHome = join(tempBase, 'home');
  const tempProject = join(tempBase, 'project');

  try {
    console.log('[smoke:install] Preparing clean repo source without dist/ or node_modules/ ...');
    copyCleanSource(root, cleanSourceDir);

    // Verify cleanSource has no dist/ or node_modules/
    if (
      existsSync(join(cleanSourceDir, 'dist')) ||
      existsSync(join(cleanSourceDir, 'node_modules'))
    ) {
      console.error('FAIL: clean source unexpectedly contains dist/ or node_modules/');
      return 1;
    }

    mkdirSync(tempHome, { recursive: true });
    mkdirSync(tempProject, { recursive: true });

    const sharedEnv = {
      ...process.env,
      HOME: tempHome,
      USERPROFILE: tempHome,
      DISABLE_TELEMETRY: '1',
      DO_NOT_TRACK: '1',
    };

    // Scenario 1: Project installation to claude-code and codex
    console.log('[smoke:install] Scenario 1: Project install (-a claude-code -a codex) ...');
    execFileSync(
      process.execPath,
      [skillsCli, 'add', cleanSourceDir, '--skill', '*', '-a', 'claude-code', '-a', 'codex', '-y'],
      { cwd: tempProject, env: sharedEnv, stdio: 'inherit' },
    );

    // Assert project installations
    const projDtSkill = findFileRecursive(tempProject, 'design-tokens/SKILL.md');
    const projDtScript = findFileRecursive(tempProject, 'design-tokens/scripts/token-engine.mjs');
    const projSetupSkill = findFileRecursive(tempProject, 'setup-pre-tokens/SKILL.md');

    if (!projDtSkill) {
      console.error('FAIL: design-tokens/SKILL.md not found in project install.');
      return 1;
    }
    if (!projDtScript) {
      console.error('FAIL: design-tokens/scripts/token-engine.mjs not found in project install.');
      return 1;
    }
    if (!projSetupSkill) {
      console.error('FAIL: setup-pre-tokens/SKILL.md not found in project install.');
      return 1;
    }

    // Verify token-engine CLI runs and shows usage
    const cliOutput = execFileSync(process.execPath, [projDtScript, '--help'], {
      cwd: tempProject,
      encoding: 'utf8',
    });
    if (!cliOutput.includes('Usage: token-engine')) {
      console.error(
        `FAIL: installed token-engine --help did not output expected usage:\n${cliOutput}`,
      );
      return 1;
    }
    console.log('PASS: Scenario 1 (project install) passed.');

    // Scenario 2: Global installation (-g -a claude-code)
    console.log('[smoke:install] Scenario 2: Global install (-g -a claude-code) ...');
    execFileSync(
      process.execPath,
      [skillsCli, 'add', cleanSourceDir, '--skill', '*', '-g', '-a', 'claude-code', '-y'],
      { cwd: tempProject, env: sharedEnv, stdio: 'inherit' },
    );

    const globalDtScript = findFileRecursive(tempHome, 'design-tokens/scripts/token-engine.mjs');
    const globalSetupSkill = findFileRecursive(tempHome, 'setup-pre-tokens/SKILL.md');

    if (!globalDtScript) {
      console.error('FAIL: global design-tokens/scripts/token-engine.mjs not found in temp home.');
      return 1;
    }
    if (!globalSetupSkill) {
      console.error('FAIL: global setup-pre-tokens/SKILL.md not found in temp home.');
      return 1;
    }

    const globalCliOutput = execFileSync(process.execPath, [globalDtScript, '--help'], {
      cwd: tempHome,
      encoding: 'utf8',
    });
    if (!globalCliOutput.includes('Usage: token-engine')) {
      console.error(
        `FAIL: global installed token-engine --help did not output expected usage:\n${globalCliOutput}`,
      );
      return 1;
    }
    console.log('PASS: Scenario 2 (global install) passed.');

    console.log('\n[smoke:install] All installation scenarios passed successfully.');
    return 0;
  } catch (err) {
    console.error('FAIL: smoke install failed with error:', err);
    return 1;
  } finally {
    rmSync(tempBase, { recursive: true, force: true });
  }
}

if (isMainModule(import.meta.url, 'smoke-install.mjs')) {
  const code = runSmokeInstall();
  process.exit(code);
}
