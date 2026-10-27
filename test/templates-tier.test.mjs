import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { evaluateAudit } from '../src/shared/audit-report.ts';

test('shared templates/tokens provides a complete, audit-passing 3-tier DTCG token tree', () => {
  const dir = mkdtempSync(join(tmpdir(), 'templates-tier-test-'));
  try {
    const tokensDir = join(dir, 'tokens');
    cpSync('src/shared/templates/tokens', tokensDir, { recursive: true });

    const result = evaluateAudit(tokensDir, { theme: 'both' });

    assert.equal(result.pass, true, 'audit result should pass');
    assert.deepEqual(
      Object.keys(result.themes).sort(),
      ['dark', 'high-contrast', 'light'],
      'audits light, dark, and high-contrast themes',
    );

    for (const [themeName, report] of Object.entries(result.themes)) {
      assert.equal(report.pass, true, `theme ${themeName} should pass audit`);
      assert.deepEqual(
        report.unresolvedAliases,
        [],
        `theme ${themeName} should have zero unresolved aliases`,
      );
      assert.deepEqual(
        report.rawValueViolations,
        [],
        `theme ${themeName} should have zero raw-value violations`,
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
