import assert from 'node:assert/strict';
import test from 'node:test';
import { getArg, isMainModule } from '../src/shared/paths.ts';
import { runAudit } from '../src/skills/token-audit/scripts/audit.ts';
import { runBuild } from '../src/skills/token-build/scripts/build.ts';
import { runExtract } from '../src/skills/token-extract/scripts/extract.ts';
import { runGenerate } from '../src/skills/token-math/scripts/generate.ts';

test('isMainModule correctly identifies module execution context', () => {
  assert.equal(isMainModule('file:///nonexistent/target.ts'), false);
  assert.equal(isMainModule(import.meta.url, 'program-seams.test.mjs'), true);
});
test('getArg returns value and treats adjacent flags as absence', () => {
  assert.equal(getArg(['--spec', 'style.json'], '--spec'), 'style.json');
  assert.equal(getArg(['--spec', '--force'], '--spec'), undefined);
  assert.equal(getArg(['--spec', '--force'], '--spec', 'fallback.json'), 'fallback.json');
  assert.equal(getArg(['--force'], '--spec', 'fallback.json'), 'fallback.json');
});

test('runGenerate, runAudit, runBuild, runExtract execute through program seam', async () => {
  const genCode = runGenerate(['--help']);
  assert.equal(genCode, 0);

  const auditCode = runAudit(['--help']);
  assert.equal(auditCode, 0);

  const buildCode = await runBuild(['--help']);
  assert.equal(buildCode, 0);

  const extractCode = await runExtract(['--help']);
  assert.equal(extractCode, 0);
});
