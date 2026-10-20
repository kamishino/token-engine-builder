import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { planBuildPasses, runBuildAll } from '../scripts/build-all.mjs';

function makeRoot() {
  const root = mkdtempSync(join(tmpdir(), 'build-all-test-'));
  const skillsDir = join(root, 'src', 'skills');
  for (const skill of ['alpha', 'beta']) {
    mkdirSync(join(skillsDir, skill, 'scripts'), { recursive: true });
    writeFileSync(join(skillsDir, skill, 'scripts', `${skill}.ts`), 'export {};\n');
  }
  mkdirSync(join(skillsDir, 'statik'), { recursive: true });
  writeFileSync(join(skillsDir, 'statik', 'SKILL.md'), '# statik\n');
  return { root, skillsDir };
}

test('planBuildPasses selects scripted and static skills', () => {
  const { root, skillsDir } = makeRoot();
  try {
    const full = planBuildPasses(skillsDir, []);
    assert.equal(full.wipe, true);
    assert.deepEqual(full.builtSkills, ['alpha', 'beta']);
    assert.deepEqual(full.staticSkills, ['statik']);

    const filtered = planBuildPasses(skillsDir, ['alpha']);
    assert.equal(filtered.wipe, false);
    assert.deepEqual(filtered.builtSkills, ['alpha']);
    assert.deepEqual(filtered.staticSkills, ['statik']);

    const staticOnly = planBuildPasses(skillsDir, ['statik']);
    assert.deepEqual(staticOnly.scriptEntries, []);
    assert.deepEqual(staticOnly.builtSkills, []);
    assert.deepEqual(staticOnly.staticSkills, ['statik']);
    assert.throws(() => planBuildPasses(skillsDir, ['nope']), /unknown skill: nope/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runBuildAll stamps only built and synced skills', () => {
  const { root } = makeRoot();
  try {
    const passes = [];
    runBuildAll(['alpha'], {
      root,
      runVite: (pass) => passes.push(pass),
    });
    assert.equal(passes.length, 1);
    assert.equal(passes[0].env.SKILL_ENTRY, 'alpha/scripts/alpha');
    assert.equal(passes[0].env.SKILL_EMPTY, '0');
    assert.ok(existsSync(join(root, 'dist', 'alpha', '.buildstamp')));
    assert.ok(existsSync(join(root, 'dist', 'statik', '.buildstamp')));
    assert.ok(!existsSync(join(root, 'dist', 'beta', '.buildstamp')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
