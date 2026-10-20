import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import test from 'node:test';
import {
  assertSafeOutDir,
  checkAuditStamp,
  computeTreeHash,
  sha256Hex,
  writeAuditStamp,
} from '../src/shared/guard.ts';

test('sha256Hex computes deterministic hash', () => {
  assert.equal(
    sha256Hex('hello world'),
    'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
  );
});

test('assertSafeOutDir rejects cwd, ancestors of cwd, and home directory', () => {
  const cwd = process.cwd();
  assert.ok(assertSafeOutDir(cwd, cwd) !== null);
  assert.ok(assertSafeOutDir(join(cwd, '..'), cwd) !== null);
  assert.equal(assertSafeOutDir(join(tmpdir(), 'safe-test-dir'), cwd), null);
});

test('audit stamp write, check, and computeTreeHash cycle cleanly', () => {
  const dir = mkdtempSync(join(tmpdir(), 'guard-test-'));
  try {
    writeFileSync(join(dir, 'test.tokens.json'), '{"token":1}', 'utf8');
    assert.equal(checkAuditStamp(dir), 'missing');

    const treeHashBefore = computeTreeHash(dir);
    assert.ok(treeHashBefore.length === 64);

    writeAuditStamp(dir, { minRatio: 4.5, minApca: 60 });
    assert.equal(checkAuditStamp(dir), 'pass');

    // Modifying tokens invalidates stamp
    writeFileSync(join(dir, 'test.tokens.json'), '{"token":2}', 'utf8');
    assert.equal(checkAuditStamp(dir), 'stale');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
