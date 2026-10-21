import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { specInputHash, TOKENS_MANIFEST_NAME } from '../src/shared/guard.ts';
import { loadStyleSpec } from '../src/shared/spec.ts';
import { runGenerate } from '../src/skills/token-math/scripts/generate.ts';

const exampleSpec = 'src/skills/token-style/assets/style-spec.example.json';

test('runGenerate refuses a second write without --force', () => {
  const dir = mkdtempSync(join(tmpdir(), 'generate-refusal-'));
  try {
    const specPath = join(dir, 'style-spec.json');
    writeFileSync(specPath, readFileSync(exampleSpec, 'utf8'), 'utf8');
    const outDir = join(dir, 'tokens');
    assert.equal(runGenerate(['--spec', specPath, '--out', outDir]), 0);
    assert.equal(runGenerate(['--spec', specPath, '--out', outDir]), 1);
    assert.equal(runGenerate(['--spec', specPath, '--out', outDir, '--force']), 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runGenerate writes a manifest whose inputHash matches specInputHash', () => {
  const dir = mkdtempSync(join(tmpdir(), 'generate-inputhash-'));
  try {
    const outDir = join(dir, 'tokens');
    assert.equal(runGenerate(['--spec', exampleSpec, '--out', outDir]), 0);
    const manifest = JSON.parse(readFileSync(join(outDir, TOKENS_MANIFEST_NAME), 'utf8'));
    const expectedHash = specInputHash(loadStyleSpec(exampleSpec).spec);
    assert.equal(manifest.inputHash, expectedHash);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
