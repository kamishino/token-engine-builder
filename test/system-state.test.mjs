import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { inspectSystem, resolveSystemPaths } from '../src/shared/system-state.ts';
import { runGenerate } from '../src/shared/generate.ts';

const exampleSpec = 'src/skills/design-tokens/assets/style-spec.example.json';

test('inspectSystem correctly classifies missing system in empty directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'system-empty-'));
  try {
    const paths = resolveSystemPaths(dir);
    const state = inspectSystem(dir, paths);
    assert.equal(state.spec.status, 'missing');
    assert.equal(state.tokens.status, 'missing');
    assert.equal(state.build.status, 'missing');
    assert.equal(state.auditStamp, 'missing');
    assert.equal(state.binding, 'unverified');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('inspectSystem reflects generated token tree and detects tampered provenance', () => {
  const dir = mkdtempSync(join(tmpdir(), 'system-generated-'));
  try {
    const tokensDir = join(dir, 'tokens');
    assert.equal(runGenerate(['--spec', exampleSpec, '--out', tokensDir]), 0);

    const paths = resolveSystemPaths(dir, { spec: exampleSpec, tokens: tokensDir });
    const stateClean = inspectSystem(dir, paths);
    assert.equal(stateClean.spec.status, 'valid');
    assert.equal(stateClean.tokens.status, 'present');
    assert.equal(stateClean.tokens.themes.length, 3);
    assert.equal(stateClean.provenance.status, 'clean');
    assert.equal(stateClean.binding, 'match');

    // Tamper a token file
    writeFileSync(join(tokensDir, 'primitive', 'color.tokens.json'), '{"tampered":true}', 'utf8');
    const stateTampered = inspectSystem(dir, paths);
    assert.equal(stateTampered.provenance.status, 'tampered');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveSystemPaths resolves tokens.config.json with fallback to style-spec.json', () => {
  const dir = mkdtempSync(join(tmpdir(), 'system-spec-paths-'));
  try {
    // Neither exists: defaults to tokens.config.json
    assert.equal(resolveSystemPaths(dir).spec, join(dir, 'tokens.config.json'));

    // Only style-spec.json exists: falls back to style-spec.json
    writeFileSync(join(dir, 'style-spec.json'), '{}', 'utf8');
    assert.equal(resolveSystemPaths(dir).spec, join(dir, 'style-spec.json'));

    // tokens.config.json created: prefers tokens.config.json
    writeFileSync(join(dir, 'tokens.config.json'), '{}', 'utf8');
    assert.equal(resolveSystemPaths(dir).spec, join(dir, 'tokens.config.json'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
