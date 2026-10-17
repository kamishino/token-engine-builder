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
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  unlinkSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = join(rootDir, 'src', 'skills');
const distDir = join(rootDir, 'dist');

const argv = process.argv.slice(2);
if (argv.includes('--help')) {
  console.log('Usage: link-skills.mjs [--dir <path>] [--copy] [--no-prune] [--unlink]');
  process.exit(0);
}

function flagValue(flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

const targetDir = resolve(flagValue('--dir') ?? join(homedir(), '.agents', 'skills'));
const copyMode = argv.includes('--copy');
const prune = !argv.includes('--no-prune');
const unlinkOnly = argv.includes('--unlink');

const skills = readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

function walk(dir, visit) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, visit);
    else visit(path);
  }
}

/** Newest mtime (ms) under dir, or -Infinity when absent. */
function newestMtime(dir) {
  if (!existsSync(dir)) return Number.NEGATIVE_INFINITY;
  let newest = lstatSync(dir).mtimeMs;
  walk(dir, (path) => {
    newest = Math.max(newest, lstatSync(path).mtimeMs);
  });
  return newest;
}

const toolchain = [
  join(rootDir, 'scripts', 'build-all.mjs'),
  join(rootDir, 'vite.config.ts'),
  join(rootDir, 'package.json'),
];
const sharedNewest = Math.max(
  newestMtime(join(rootDir, 'src', 'shared')),
  ...toolchain.map((f) => lstatSync(f).mtimeMs),
);

function readStamp(skill) {
  try {
    const value = Number(readFileSync(join(distDir, skill, '.buildstamp'), 'utf8').trim());
    return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
  } catch {
    return Number.NEGATIVE_INFINITY;
  }
}

function isStale(skill) {
  const sources = Math.max(newestMtime(join(skillsDir, skill)), sharedNewest);
  return sources > readStamp(skill);
}

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
  process.exit(0);
}

mkdirSync(targetDir, { recursive: true });

// Rebuild stale skills before linking so dist/ always matches src/.
const stale = skills.filter(isStale);
if (stale.length > 0) {
  const scripted = stale.filter((skill) => existsSync(join(skillsDir, skill, 'scripts')));
  const args = scripted.length > 0 ? scripted : [];
  console.log(`[deploy] rebuilding stale: ${stale.join(', ')}`);
  execFileSync(process.execPath, [join(rootDir, 'scripts', 'build-all.mjs'), ...args], {
    cwd: rootDir,
    stdio: 'inherit',
  });
} else {
  console.log('[deploy] all bundles up to date');
}

for (const skill of skills) {
  const from = join(distDir, skill);
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
      target !== distDir &&
      !target.startsWith(`${distDir}\\`) &&
      !target.startsWith(`${distDir}/`)
    ) {
      continue;
    }
    removeLink(path);
    console.log(`[deploy] pruned dead link ${entry.name}`);
  }
}
// Self-check for Windows throwaway dirs (junctions into temp are never production).
if (targetDir.startsWith(tmpdir())) {
  console.error('[deploy] WARNING: target is inside the OS temp dir');
}
