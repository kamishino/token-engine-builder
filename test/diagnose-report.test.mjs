import assert from 'node:assert/strict';
import console from 'node:console';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runDiagnose } from '../src/skills/improve-design-system/scripts/diagnose.ts';
import { runGenerate } from '../src/skills/token-math/scripts/generate.ts';

const exampleSpec = 'src/skills/token-style/assets/style-spec.example.json';

test('runDiagnose --help returns 0', () => {
  assert.equal(runDiagnose(['--help']), 0);
});

test('runDiagnose on empty directory prints valid JSON with spec-missing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'diag-script-empty-'));
  try {
    let output = '';
    const originalLog = console.log;
    console.log = (msg) => {
      output += msg;
    };
    try {
      assert.equal(runDiagnose(['--root', dir]), 0);
    } finally {
      console.log = originalLog;
    }
    const parsed = JSON.parse(output);
    assert.equal(parsed.state.spec.status, 'missing');
    assert.ok(parsed.findings.some((f) => f.id === 'spec-missing'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runDiagnose on generated tree prints valid JSON with valid spec and present tokens', () => {
  const dir = mkdtempSync(join(tmpdir(), 'diag-script-tree-'));
  try {
    const specPath = join(dir, 'style-spec.json');
    writeFileSync(specPath, readFileSync(exampleSpec, 'utf8'), 'utf8');
    const tokensDir = join(dir, 'tokens');
    assert.equal(runGenerate(['--spec', specPath, '--out', tokensDir]), 0);

    let output = '';
    const originalLog = console.log;
    console.log = (msg) => {
      output += msg;
    };
    try {
      assert.equal(runDiagnose(['--root', dir, '--spec', specPath, '--tokens', tokensDir]), 0);
    } finally {
      console.log = originalLog;
    }
    const parsed = JSON.parse(output);
    assert.equal(parsed.state.spec.status, 'valid');
    assert.equal(parsed.state.tokens.status, 'present');
    assert.ok(Array.isArray(parsed.findings));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
