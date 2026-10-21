import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { resolveSkillPathPlaceholders } from '../src/shared/paths.ts';

test('resolves <skill-root> and co-located sibling roots', () => {
  const dir = mkdtempSync(join(tmpdir(), 'paths-'));
  try {
    const skillA = join(dir, 'skill-a');
    const skillB = join(dir, 'skill-b');
    mkdirSync(join(skillA, 'scripts'), { recursive: true });
    mkdirSync(join(skillB, 'scripts'), { recursive: true });
    const meta = pathToFileURL(join(skillA, 'scripts', 'tool.mjs')).href;

    assert.equal(
      resolveSkillPathPlaceholders('node <skill-root>/scripts/tool.mjs', meta),
      `node ${skillA}/scripts/tool.mjs`,
    );
    assert.equal(
      resolveSkillPathPlaceholders('node <skill-b-root>/scripts/other.mjs', meta),
      `node ${skillB}/scripts/other.mjs`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('leaves a missing sibling placeholder intact', () => {
  const dir = mkdtempSync(join(tmpdir(), 'paths-'));
  try {
    const skillA = join(dir, 'skill-a');
    mkdirSync(join(skillA, 'scripts'), { recursive: true });
    const meta = pathToFileURL(join(skillA, 'scripts', 'tool.mjs')).href;

    assert.equal(
      resolveSkillPathPlaceholders('node <missing-root>/scripts/tool.mjs', meta),
      'node <missing-root>/scripts/tool.mjs',
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
