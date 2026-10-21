import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { planDeploy, runLink } from '../scripts/link-skills.mjs';

test('runLink --help completes cleanly', () => {
  const code = runLink(['--help']);
  assert.equal(code, 0);
});

test('runLink --unlink in temp directory executes cleanly without error', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'deploy-test-'));
  try {
    const code = runLink(['--unlink', '--dir', tempDir]);
    assert.equal(code, 0);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('planDeploy places absent skills in the selected mode', () => {
  assert.deepEqual(planDeploy({ skills: ['a'], existing: { a: 'absent' } }), [
    { kind: 'place', skill: 'a', mode: 'link' },
  ]);
  assert.deepEqual(planDeploy({ skills: ['a'], existing: { a: 'absent' }, copy: true }), [
    { kind: 'place', skill: 'a', mode: 'copy' },
  ]);
});

test('planDeploy replaces an owned link', () => {
  assert.deepEqual(planDeploy({ skills: ['a'], existing: { a: 'link' } }), [
    { kind: 'remove-link', skill: 'a' },
    { kind: 'place', skill: 'a', mode: 'link' },
  ]);
});

test('planDeploy skips a real directory in link mode', () => {
  assert.deepEqual(planDeploy({ skills: ['a'], existing: { a: 'directory' } }), [
    { kind: 'skip', skill: 'a' },
  ]);
});

test('planDeploy refuses a real directory without --force and stops', () => {
  assert.deepEqual(
    planDeploy({ skills: ['a', 'b'], existing: { a: 'directory', b: 'absent' }, copy: true }),
    [{ kind: 'refuse', skill: 'a' }],
  );
});

test('planDeploy deletes a real directory with --copy --force', () => {
  assert.deepEqual(
    planDeploy({
      skills: ['a'],
      existing: { a: 'directory' },
      copy: true,
      force: true,
    }),
    [
      { kind: 'remove-directory', skill: 'a' },
      { kind: 'place', skill: 'a', mode: 'copy' },
    ],
  );
});

test('planDeploy prunes only non-skill candidates', () => {
  assert.deepEqual(
    planDeploy({
      skills: ['a'],
      existing: { a: 'absent' },
      pruneCandidates: ['a', 'dead'],
    }),
    [
      { kind: 'place', skill: 'a', mode: 'link' },
      { kind: 'prune', skill: 'dead' },
    ],
  );
  assert.deepEqual(
    planDeploy({
      skills: ['a'],
      existing: { a: 'absent' },
      prune: false,
      pruneCandidates: ['dead'],
    }),
    [{ kind: 'place', skill: 'a', mode: 'link' }],
  );
});
