import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { crc32, runPackage, writeZip } from '../scripts/package-release.mjs';

test('crc32 matches standard IEEE 802.3 test vector', () => {
  const buf = Buffer.from('123456789', 'utf8');
  assert.equal(crc32(buf), 0xcbf43926);
});

test('writeZip creates valid zip archive with local file headers', () => {
  const dir = mkdtempSync(join(tmpdir(), 'release-test-'));
  try {
    const fileA = join(dir, 'a.txt');
    writeFileSync(fileA, 'hello world', 'utf8');

    const outZip = join(dir, 'test.zip');
    writeZip([{ path: fileA, arc: 'files/a.txt' }], outZip);

    const zipBytes = readFileSync(outZip);
    assert.ok(zipBytes.length > 30);
    // Standard ZIP signature PK\x03\x04
    assert.equal(zipBytes[0], 0x50);
    assert.equal(zipBytes[1], 0x4b);
    assert.equal(zipBytes[2], 0x03);
    assert.equal(zipBytes[3], 0x04);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runPackage with --dry-run completes cleanly without touching disk', () => {
  const code = runPackage(['--dry-run', '--skip-build']);
  assert.equal(code, 0);
});
