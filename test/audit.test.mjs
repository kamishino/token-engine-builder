import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runAudit } from '../src/skills/token-audit/scripts/audit.ts';

test('runAudit fails closed on empty tokens directory and writes no stamp', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-empty-'));
  try {
    const tokensDir = join(dir, 'tokens');
    mkdirSync(tokensDir);
    const code = runAudit(['--tokens', tokensDir]);
    assert.equal(code, 1);
    assert.equal(existsSync(join(tokensDir, '.token-engine-audit.json')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runAudit fails closed on theme with missing roles and writes no stamp', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-noroles-'));
  try {
    const tokensDir = join(dir, 'tokens');
    mkdirSync(join(tokensDir, 'semantic'), { recursive: true });
    writeFileSync(
      join(tokensDir, 'semantic', 'light.tokens.json'),
      '{"semantic":{"color":{}}}',
      'utf8',
    );
    const code = runAudit(['--tokens', tokensDir]);
    assert.equal(code, 1);
    assert.equal(existsSync(join(tokensDir, '.token-engine-audit.json')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
