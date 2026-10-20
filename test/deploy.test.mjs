import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runLink } from '../scripts/link-skills.mjs';

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
