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
import { isSkillStale } from './build-engine.mjs';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function runLink(argv = process.argv.slice(2), { root = rootDir } = {}) {
  if (argv.includes('--help')) {
    console.log('Usage: link-skills.mjs [--dir <path>] [--copy] [--force] [--no-prune] [--unlink]');
    return 0;
  }

  function flagValue(flag) {
    const index = argv.indexOf(flag);
    return index === -1 ? undefined : argv[index + 1];
  }

  const currentSkillsDir = join(root, 'src', 'skills');
  const currentDistDir = join(root, 'dist');
  const targetDir = resolve(flagValue('--dir') ?? join(homedir(), '.agents', 'skills'));
  const copyMode = argv.includes('--copy');
  const forceCopy = argv.includes('--force');
  const prune = !argv.includes('--no-prune');
  const unlinkOnly = argv.includes('--unlink');

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
    const scripted = stale.filter((skill) => existsSync(join(currentSkillsDir, skill, 'scripts')));
    if (scripted.length > 0) {
      console.log(`[deploy] rebuilding stale: ${scripted.join(', ')}`);
      execFileSync(process.execPath, [join(root, 'scripts', 'build-all.mjs'), ...scripted], {
        cwd: root,
        stdio: 'inherit',
      });
    } else {
      console.log(`[deploy] stale statics in: ${stale.join(', ')} (syncing without rebuild)`);
    }
  } else {
    console.log('[deploy] all bundles up to date');
  }

  for (const skill of skills) {
    const from = join(currentDistDir, skill);
    const dest = join(targetDir, skill);
    if (existsSync(dest) || isLink(dest)) {
      // Never recurse into a link: unlink it. Recursive removal runs only on
      // real directories in copy mode (rm would follow junctions into dist/).
      if (isLink(dest)) removeLink(dest);
      else if (!copyMode) {
        console.error(
          `[deploy] SKIP ${skill}: ${dest} is a real directory, not a link (remove by hand)`,
        );
        continue;
      } else if (!forceCopy) {
        console.error(
          `[deploy] refusing to delete real directory ${dest} in --copy mode (pass --force)`,
        );
        return 1;
      } else rmSync(dest, { recursive: true, force: true });
    }
    if (copyMode) cpSync(from, dest, { recursive: true });
    else symlinkSync(from, dest, 'junction');
    console.log(`[deploy] ${copyMode ? 'copied' : 'linked'} ${skill} → ${dest}`);
  }

  if (prune) {
    for (const entry of readdirSync(targetDir, { withFileTypes: true })) {
      // Only links resolving inside this repo's dist/ are ours; foreign links
      // (other skill sets) and real directories are never touched.
      const path = join(targetDir, entry.name);
      if (skills.includes(entry.name) || !isLink(path)) continue;
      const target = resolve(targetDir, readlinkSync(path));
      if (
        target !== currentDistDir &&
        !target.startsWith(`${currentDistDir}\\`) &&
        !target.startsWith(`${currentDistDir}/`)
      ) {
        continue;
      }
      removeLink(path);
      console.log(`[deploy] pruned dead link ${entry.name}`);
    }
  }
  return 0;
}

const isMain =
  process.argv[1] !== undefined &&
  (resolve(process.argv[1]) === fileURLToPath(import.meta.url) ||
    process.argv[1].endsWith('link-skills.mjs'));

if (isMain) {
  const code = runLink();
  if (code !== 0) process.exit(code);
}
