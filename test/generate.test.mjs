import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
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
