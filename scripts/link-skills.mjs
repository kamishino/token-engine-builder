#!/usr/bin/env node
/**
 * Deploy built skills: link (or copy) every dist/<skill>/ into an agents
 * skills directory (default ~/.agents/skills).
 *
 * Freshness: a skill rebuilds when anything it bundles is newer than its
 * dist output — its own sources, src/shared/, or the build toolchain
 * (scripts/build-all.mjs, vite.config.ts, package.json). Rebuilds reuse
 * scripts/build-all.mjs so bundles stay identical to `npm run build`.
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  unlinkSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getArg, hasFlag, isMainModule } from '../src/shared/paths.ts';
import { isSkillStale } from './build-engine.mjs';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Decide deploy actions without touching the filesystem. `existing` maps each
 * skill to what currently sits at its destination; `pruneCandidates` are link
 * names resolving inside this repo's dist/. Stops at the first refusal so the
 * executor never touches a later skill (matches the single-pass deploy).
 */
export function planDeploy({
  skills,
  existing,
  copy = false,
  force = false,
  prune = true,
  pruneCandidates = [],
}) {
  const mode = copy ? 'copy' : 'link';
  const actions = [];
  for (const skill of skills) {
    const kind = existing[skill] ?? 'absent';
    if (kind === 'link') {
      actions.push({ kind: 'remove-link', skill });
      actions.push({ kind: 'place', skill, mode });
      continue;
    }
    if (kind === 'absent') {
      actions.push({ kind: 'place', skill, mode });
      continue;
    }
    if (!copy) {
      actions.push({ kind: 'skip', skill });
      continue;
    }
    if (!force) {
      actions.push({ kind: 'refuse', skill });
      return actions;
    }
    actions.push({ kind: 'remove-directory', skill });
    actions.push({ kind: 'place', skill, mode });
  }
  if (prune) {
    for (const skill of pruneCandidates) {
      if (!skills.includes(skill)) actions.push({ kind: 'prune', skill });
    }
  }
  return actions;
}

export function runLink(argv = process.argv.slice(2), { root = rootDir } = {}) {
  if (hasFlag(argv, '--help')) {
    console.log('Usage: link-skills.mjs [--dir <path>] [--copy] [--force] [--no-prune] [--unlink]');
    return 0;
  }

  const currentSkillsDir = join(root, 'src', 'skills');
  const currentDistDir = join(root, 'dist');
  const targetDir = resolve(getArg(argv, '--dir') ?? join(homedir(), '.agents', 'skills'));
  const copyMode = hasFlag(argv, '--copy');
  const forceCopy = hasFlag(argv, '--force');
  const prune = !hasFlag(argv, '--no-prune');
  const unlinkOnly = hasFlag(argv, '--unlink');

  // Self-check for Windows throwaway dirs (hoisted before mutation)
  if (targetDir.startsWith(tmpdir())) {
    console.error('[deploy] WARNING: target is inside the OS temp dir');
  }

  const skills = readdirSync(currentSkillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const isStale = (skill) => isSkillStale(skill, { root });

  function isLink(path) {
    try {
      return lstatSync(path).isSymbolicLink();
    } catch {
      return false;
    }
  }

  function removeLink(path) {
    // unlinkSync removes the link itself on Windows junctions too; the target is untouched.
    unlinkSync(path);
  }

  if (unlinkOnly) {
    for (const skill of skills) {
      const dest = join(targetDir, skill);
      if (isLink(dest)) {
        removeLink(dest);
        console.log(`[deploy] unlinked ${skill}`);
      }
    }
    return 0;
  }

  mkdirSync(targetDir, { recursive: true });

  // Rebuild stale skills before linking so dist/ always matches src/.
  const stale = skills.filter(isStale);
  if (stale.length > 0) {
    console.log(`[deploy] refreshing stale: ${stale.join(', ')}`);
    execFileSync(
      process.execPath,
      ['--experimental-strip-types', join(root, 'scripts', 'build-all.mjs'), ...stale],
      { cwd: root, stdio: 'inherit' },
    );
  } else {
    console.log('[deploy] all bundles up to date');
  }

  const existing = {};
  for (const skill of skills) {
    const dest = join(targetDir, skill);
    existing[skill] = isLink(dest) ? 'link' : existsSync(dest) ? 'directory' : 'absent';
  }

  const pruneCandidates = readdirSync(targetDir, { withFileTypes: true })
    .map((entry) => entry.name)
    .filter((name) => {
      const path = join(targetDir, name);
      if (!isLink(path)) return false;
      const target = resolve(targetDir, readlinkSync(path));
      return (
        target === currentDistDir ||
        target.startsWith(`${currentDistDir}\\`) ||
        target.startsWith(`${currentDistDir}/`)
      );
    });

  for (const action of planDeploy({
    skills,
    existing,
    copy: copyMode,
    force: forceCopy,
    prune,
    pruneCandidates,
  })) {
    const dest = join(targetDir, action.skill);
    if (action.kind === 'remove-link') {
      removeLink(dest);
    } else if (action.kind === 'remove-directory') {
      rmSync(dest, { recursive: true, force: true });
    } else if (action.kind === 'place') {
      const from = join(currentDistDir, action.skill);
      if (action.mode === 'copy') cpSync(from, dest, { recursive: true });
      else symlinkSync(from, dest, 'junction');
      console.log(
        `[deploy] ${action.mode === 'copy' ? 'copied' : 'linked'} ${action.skill} → ${dest}`,
      );
    } else if (action.kind === 'skip') {
      console.error(
        `[deploy] SKIP ${action.skill}: ${dest} is a real directory, not a link (remove by hand)`,
      );
    } else if (action.kind === 'prune') {
      removeLink(dest);
      console.log(`[deploy] pruned dead link ${action.skill}`);
    } else {
      console.error(
        `[deploy] refusing to delete real directory ${dest} in --copy mode (pass --force)`,
      );
      return 1;
    }
  }
  return 0;
}

if (isMainModule(import.meta.url, 'link-skills.mjs')) {
  const code = runLink();
  if (code !== 0) process.exit(code);
}
