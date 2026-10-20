import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  computeBundleHash,
  discoverScriptEntries,
  discoverSkillEntries,
  isSkillStale,
  listSkills,
  readBuildStamp,
  syncSkillPackages,
  writeBuildStamp,
} from '../scripts/build-engine.mjs';

test('discoverScriptEntries discovers existing skills and scripts', () => {
  const { scriptEntries, uniqueSkills } = discoverScriptEntries('src/skills');
  assert.ok(scriptEntries.length >= 5);
  assert.ok(uniqueSkills.includes('token-math'));
  assert.ok(uniqueSkills.includes('token-audit'));
  assert.ok(uniqueSkills.includes('token-build'));
  assert.ok(uniqueSkills.includes('token-extract'));
});

test('discoverSkillEntries delegates to discoverScriptEntries and returns record map', () => {
  const entries = discoverSkillEntries('src/skills');
  assert.ok('token-math/scripts/generate' in entries);
  assert.ok('token-audit/scripts/audit' in entries);
  assert.ok('token-build/scripts/build' in entries);
});
test('computeBundleHash returns empty string on missing directory', () => {
  assert.equal(computeBundleHash('nonexistent-dir'), '');
});

test('buildstamp writing, reading, and staleness detection round-trip cleanly', () => {
  const rootDir = mkdtempSync(join(tmpdir(), 'build-engine-test-'));
  try {
    const skill = 'mock-skill';
    const distScriptsDir = join(rootDir, 'dist', skill, 'scripts');
    mkdirSync(distScriptsDir, { recursive: true });
    writeFileSync(join(distScriptsDir, 'script.mjs'), 'console.log("hello");', 'utf8');

    const srcSkillDir = join(rootDir, 'src', 'skills', skill);
    mkdirSync(srcSkillDir, { recursive: true });
    writeFileSync(join(srcSkillDir, 'index.ts'), 'export const a = 1;', 'utf8');

    const sharedDir = join(rootDir, 'src', 'shared');
    mkdirSync(sharedDir, { recursive: true });
    writeFileSync(join(sharedDir, 'types.ts'), 'export type X = 1;', 'utf8');

    const stamp = writeBuildStamp(join(rootDir, 'dist'), skill);
    assert.equal(typeof stamp.builtAt, 'number');
    assert.ok(stamp.bundleHash.length === 64);

    const read = readBuildStamp(join(rootDir, 'dist'), skill);
    assert.deepEqual(read, stamp);

    // Freshness check: source not newer, bundle untouched
    const fresh = isSkillStale(skill, { root: rootDir });
    assert.equal(fresh, false);

    // Staleness on source modification:
    const future = new Date(stamp.builtAt + 5000);
    utimesSync(join(srcSkillDir, 'index.ts'), future, future);
    const staleSource = isSkillStale(skill, { root: rootDir });
    assert.equal(staleSource, true);

    // Reset source mtime back to past
    const past = new Date(stamp.builtAt - 5000);
    utimesSync(join(srcSkillDir, 'index.ts'), past, past);

    // Staleness on toolchain modification (build-engine.mjs):
    const scriptsDir = join(rootDir, 'scripts');
    mkdirSync(scriptsDir, { recursive: true });
    writeFileSync(join(scriptsDir, 'build-engine.mjs'), '// new code', 'utf8');
    utimesSync(join(scriptsDir, 'build-engine.mjs'), future, future);
    const staleToolchain = isSkillStale(skill, { root: rootDir });
    assert.equal(staleToolchain, true);
    rmSync(join(scriptsDir, 'build-engine.mjs'));

    // Staleness on bundle modification:
    writeFileSync(join(distScriptsDir, 'script.mjs'), 'console.log("tampered");', 'utf8');
    const staleBundle = isSkillStale(skill, { root: rootDir });
    assert.equal(staleBundle, true);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test('listSkills lists all directory names sorted', () => {
  const dir = mkdtempSync(join(tmpdir(), 'list-skills-test-'));
  try {
    mkdirSync(join(dir, 'beta'), { recursive: true });
    mkdirSync(join(dir, 'alpha'), { recursive: true });
    assert.deepEqual(listSkills(dir), ['alpha', 'beta']);
    assert.deepEqual(listSkills(join(dir, 'nonexistent')), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('syncSkillPackages copies SKILL.md and static directories to dist', () => {
  const root = mkdtempSync(join(tmpdir(), 'sync-skills-test-'));
  try {
    const skillsDir = join(root, 'src', 'skills');
    const distDir = join(root, 'dist');
    mkdirSync(join(skillsDir, 'alpha', 'references'), { recursive: true });
    writeFileSync(join(skillsDir, 'alpha', 'SKILL.md'), '# alpha\n', 'utf8');
    writeFileSync(join(skillsDir, 'alpha', 'references', 'x.md'), 'ref x\n', 'utf8');

    syncSkillPackages(skillsDir, distDir);
    assert.ok(existsSync(join(distDir, 'alpha', 'SKILL.md')));
    assert.ok(existsSync(join(distDir, 'alpha', 'references', 'x.md')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
