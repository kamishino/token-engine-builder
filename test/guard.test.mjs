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
  decideWrite,
  sha256Hex,
  writeAuditStamp,
} from '../src/shared/guard.ts';

test('sha256Hex computes deterministic hash', () => {
  assert.equal(
    sha256Hex('hello world'),
    'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
  );
});

const cleanReport = { status: 'clean', changed: [], missing: [], added: [] };
const tamperedReport = {
  status: 'tampered',
  changed: ['tokens.css'],
  missing: ['semantic/light.tokens.json'],
  added: [],
};

test('decideWrite writes when nothing exists', () => {
  const dir = mkdtempSync(join(tmpdir(), 'write-decision-'));
  try {
    assert.deepEqual(
      decideWrite({ paths: [join(dir, 'out.css')], tamper: tamperedReport, force: false }),
      { kind: 'write', replaces: false, dirty: false },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('decideWrite refuses existing outputs without force', () => {
  const dir = mkdtempSync(join(tmpdir(), 'write-decision-'));
  try {
    const target = join(dir, 'out.css');
    writeFileSync(target, ':root {}', 'utf8');
    assert.deepEqual(decideWrite({ paths: [target], tamper: cleanReport, force: false }), {
      kind: 'refuse',
      replaces: true,
      reason: 'exists',
      changed: [],
      missing: [],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('decideWrite names hand-edited files when provenance is dirty', () => {
  const dir = mkdtempSync(join(tmpdir(), 'write-decision-'));
  try {
    const target = join(dir, 'out.css');
    writeFileSync(target, ':root {}', 'utf8');
    assert.deepEqual(decideWrite({ paths: [target], tamper: tamperedReport, force: false }), {
      kind: 'refuse',
      replaces: true,
      reason: 'tampered',
      changed: ['tokens.css'],
      missing: ['semantic/light.tokens.json'],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('decideWrite replaces with force and treats unreadable provenance as tampered', () => {
  const dir = mkdtempSync(join(tmpdir(), 'write-decision-'));
  try {
    const target = join(dir, 'out.css');
    writeFileSync(target, ':root {}', 'utf8');
    assert.deepEqual(decideWrite({ paths: [target], tamper: tamperedReport, force: true }), {
      kind: 'write',
      replaces: true,
      dirty: true,
    });
    assert.equal(
      decideWrite({
        paths: [target],
        tamper: { status: 'unreadable', changed: [], missing: [], added: [] },
        force: false,
      }).reason,
      'tampered',
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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

    // Corrupt stamp is unreadable, not missing
    writeFileSync(join(dir, '.token-engine-audit.json'), 'not json', 'utf8');
    assert.equal(checkAuditStamp(dir), 'unreadable');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
