import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Auto-discover `src/skills/<skill>/scripts/*.ts` → `dist/<skill>/scripts/<name>.mjs` mapping. */
export function discoverSkillEntries(skillsDir) {
  const entries = {};
  if (!existsSync(skillsDir)) return entries;
  const { scriptEntries } = discoverScriptEntries(skillsDir);
  for (const { skill, script } of scriptEntries) {
    entries[`${skill}/scripts/${script}`] = join(skillsDir, skill, 'scripts', `${script}.ts`);
  }
  return entries;
}

/**
 * Auto-discover script entries as structured list with optional skill-name filtering.
 */
export function discoverScriptEntries(skillsDir, only = []) {
  const scriptEntries = [];
  if (!existsSync(skillsDir)) return { scriptEntries: [], uniqueSkills: [] };

  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const sDir = join(skillsDir, entry.name, 'scripts');
    if (existsSync(sDir)) {
      for (const f of readdirSync(sDir)) {
        if (f.endsWith('.ts')) {
          const scriptName = f.replace(/\.ts$/, '');
          if (only.length === 0 || only.includes(entry.name)) {
            scriptEntries.push({ skill: entry.name, script: scriptName });
          }
        }
      }
    }
  }
  const uniqueSkills = [...new Set(scriptEntries.map((e) => e.skill))];
  return { scriptEntries, uniqueSkills };
}

/** Compute aggregate SHA-256 hash over sorted .mjs bundle files in a scripts directory. */
export function computeBundleHash(scriptsDir) {
  if (!existsSync(scriptsDir)) return '';
  const hash = createHash('sha256');
  for (const file of readdirSync(scriptsDir).sort()) {
    if (file.endsWith('.mjs')) hash.update(readFileSync(join(scriptsDir, file)));
  }
  return hash.digest('hex');
}

/** Read a skill's .buildstamp file. */
export function readBuildStamp(distDir, skill) {
  try {
    const stampPath = join(distDir, skill, '.buildstamp');
    const parsed = JSON.parse(readFileSync(stampPath, 'utf8'));
    if (typeof parsed.builtAt !== 'number' || typeof parsed.bundleHash !== 'string') return null;
    return { builtAt: parsed.builtAt, bundleHash: parsed.bundleHash };
  } catch {
    return null;
  }
}

/** Write a skill's .buildstamp file. */
export function writeBuildStamp(distDir, skill) {
  const scriptsDir = join(distDir, skill, 'scripts');
  const bundleHash = computeBundleHash(scriptsDir);
  const builtAt = Date.now();
  const stampPath = join(distDir, skill, '.buildstamp');
  writeFileSync(stampPath, `${JSON.stringify({ builtAt, bundleHash })}\n`, 'utf8');
  return { builtAt, bundleHash };
}

function walkFiles(dir, visit) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(path, visit);
    else visit(path);
  }
}

function newestMtime(dir) {
  if (!existsSync(dir)) return Number.NEGATIVE_INFINITY;
  let newest = lstatSync(dir).mtimeMs;
  walkFiles(dir, (path) => {
    newest = Math.max(newest, lstatSync(path).mtimeMs);
  });
  return newest;
}

const TOOLCHAIN = [
  'scripts/build-engine.mjs',
  'scripts/build-all.mjs',
  'scripts/link-skills.mjs',
  'vite.config.ts',
  'package.json',
];

/** Check if a built skill is stale relative to its sources or bundle bytes. */
export function isSkillStale(skill, { root }) {
  const stamp = readBuildStamp(join(root, 'dist'), skill);
  if (stamp === null) return true;
  const sharedNewest = Math.max(
    newestMtime(join(root, 'src', 'shared')),
    ...TOOLCHAIN.map((rel) => {
      const path = join(root, rel);
      return existsSync(path) ? lstatSync(path).mtimeMs : Number.NEGATIVE_INFINITY;
    }),
  );
  const sources = Math.max(newestMtime(join(root, 'src', 'skills', skill)), sharedNewest);
  const currentBundleHash = computeBundleHash(join(root, 'dist', skill, 'scripts'));
  return sources > stamp.builtAt || currentBundleHash !== stamp.bundleHash;
}
