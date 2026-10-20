import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  computeBundleHash,
  discoverScriptEntries,
  discoverSkillEntries,
  isSkillStale,
  readBuildStamp,
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
  const distDir = mkdtempSync(join(tmpdir(), 'build-engine-test-'));
  try {
    const skill = 'mock-skill';
    const scriptsDir = join(distDir, skill, 'scripts');
    mkdirSync(scriptsDir, { recursive: true });
    writeFileSync(join(scriptsDir, 'script.mjs'), 'console.log("hello");', 'utf8');

    const stamp = writeBuildStamp(distDir, skill);
    assert.equal(typeof stamp.builtAt, 'number');
    assert.ok(stamp.bundleHash.length === 64);

    const read = readBuildStamp(distDir, skill);
    assert.deepEqual(read, stamp);

    // Freshness check: source not newer, bundle untouched
    const fresh = isSkillStale(skill, {
      skillsDir: distDir,
      distDir,
      sharedNewest: stamp.builtAt - 1000,
      newestMtime: () => stamp.builtAt - 1000,
    });
    assert.equal(fresh, false);

    // Staleness on source modification:
    const staleSource = isSkillStale(skill, {
      skillsDir: distDir,
      distDir,
      sharedNewest: stamp.builtAt + 1000,
      newestMtime: () => stamp.builtAt - 1000,
    });
    assert.equal(staleSource, true);

    // Staleness on bundle modification:
    writeFileSync(join(scriptsDir, 'script.mjs'), 'console.log("tampered");', 'utf8');
    const staleBundle = isSkillStale(skill, {
      skillsDir: distDir,
      distDir,
      sharedNewest: stamp.builtAt - 1000,
      newestMtime: () => stamp.builtAt - 1000,
    });
    assert.equal(staleBundle, true);
  } finally {
    rmSync(distDir, { recursive: true, force: true });
  }
});
