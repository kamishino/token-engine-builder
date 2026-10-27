import assert from 'node:assert/strict';
import test from 'node:test';
import { EXIT } from '../src/shared/exit-codes.ts';
import { getArg, isMainModule } from '../src/shared/paths.ts';
import { runAudit } from '../src/shared/audit.ts';
import { runBuild } from '../src/shared/build.ts';
import { runDiagnose } from '../src/shared/diagnose.ts';
import { runExtract } from '../src/shared/extract.ts';
import { runFigma } from '../src/shared/figma.ts';
import { runGenerate } from '../src/shared/generate.ts';
import { runRoute } from '../src/shared/route.ts';

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

test('runGenerate, runAudit, runBuild, runExtract, runFigma execute through program seam', async () => {
  const genCode = runGenerate(['--help']);
  assert.equal(genCode, 0);

  const auditCode = runAudit(['--help']);
  assert.equal(auditCode, 0);

  const buildCode = await runBuild(['--help']);
  assert.equal(buildCode, 0);

  const extractCode = await runExtract(['--help']);
  assert.equal(extractCode, 0);

  const figmaCode = runFigma(['--help']);
  assert.equal(figmaCode, 0);

  const figmaErrCode = runFigma([]);
  assert.equal(figmaErrCode, EXIT.USAGE);

  const routeCode = runRoute(['--help']);
  assert.equal(routeCode, 0);

  const diagnoseCode = runDiagnose(['--help']);
  assert.equal(diagnoseCode, 0);
});
