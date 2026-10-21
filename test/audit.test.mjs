import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { auditTokens } from '../src/shared/audit-report.ts';
import { runAudit } from '../src/skills/token-audit/scripts/audit.ts';
import { runGenerate } from '../src/skills/token-math/scripts/generate.ts';

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

test('auditTokens returns a passing report for the generated example tree', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-pass-'));
  try {
    const tokensDir = join(dir, 'tokens');
    runGenerate([
      '--spec',
      'src/skills/token-style/assets/style-spec.example.json',
      '--out',
      tokensDir,
    ]);
    const result = auditTokens(tokensDir, { theme: 'light', minRatio: 4.5, minApca: 60 });
    assert.equal(result.pass, true);
    assert.equal(result.provenance.status, 'clean');
    assert.equal(result.themes.light.pairs.length, 42);
    assert.ok(result.themes.light.pairs.every((pair) => pair.pass));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runAudit with --spec checks spec binding and fails on mismatch', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-spec-'));
  try {
    const specPath = join(dir, 'style-spec.json');
    const changedSpecPath = join(dir, 'style-spec-changed.json');
    const specData = JSON.parse(
      readFileSync('src/skills/token-style/assets/style-spec.example.json', 'utf8'),
    );
    writeFileSync(specPath, JSON.stringify(specData, null, 2), 'utf8');
    specData.palette[0].anchor.l = 0.55;
    writeFileSync(changedSpecPath, JSON.stringify(specData, null, 2), 'utf8');

    const tokensDir = join(dir, 'tokens');
    assert.equal(runGenerate(['--spec', specPath, '--out', tokensDir]), 0);

    // Matching spec -> pass, stamp written
    assert.equal(runAudit(['--tokens', tokensDir, '--spec', specPath]), 0);
    assert.equal(existsSync(join(tokensDir, '.token-engine-audit.json')), true);

    // Changed spec -> fail, stamp removed
    assert.equal(runAudit(['--tokens', tokensDir, '--spec', changedSpecPath]), 1);
    assert.equal(existsSync(join(tokensDir, '.token-engine-audit.json')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('auditTokens computes remedy suggestions for failed pairs and includes them in JSON output', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-remedy-'));
  try {
    const specPath = join(dir, 'style-spec.json');
    const specData = JSON.parse(
      readFileSync('src/skills/token-style/assets/style-spec.example.json', 'utf8'),
    );
    specData.overrides = {
      light: {
        'semantic.color.text.tertiary': '{color.neutral.200}',
      },
    };
    writeFileSync(specPath, JSON.stringify(specData, null, 2), 'utf8');

    const tokensDir = join(dir, 'tokens');
    assert.equal(runGenerate(['--spec', specPath, '--out', tokensDir]), 0);

    const result = auditTokens(tokensDir, { theme: 'light', minRatio: 4.5, minApca: 60 });
    assert.equal(result.pass, false);
    const failedPairs = result.themes.light.pairs.filter((p) => !p.pass);
    assert.ok(failedPairs.length > 0);
    const tertiaryPair = failedPairs.find((p) => p.foreground === 'semantic.color.text.tertiary');
    assert.ok(tertiaryPair !== undefined);
    assert.ok(tertiaryPair.suggestion !== undefined);
    assert.equal(tertiaryPair.suggestion.path, 'semantic.color.text.tertiary');
    assert.notEqual(tertiaryPair.suggestion.alias, '{color.neutral.200}');
    assert.ok(tertiaryPair.suggestion.ratio >= 4.5);
    assert.ok(tertiaryPair.suggestion.apcaLc >= 60);
    assert.equal(tertiaryPair.suggestion.side, 'foreground');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('auditTokens falls back to background suggestion when no foreground step passes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-remedy-bg-'));
  try {
    const specPath = join(dir, 'style-spec.json');
    const specData = JSON.parse(
      readFileSync('src/skills/token-style/assets/style-spec.example.json', 'utf8'),
    );
    specData.overrides = {
      light: {
        'semantic.color.text.primary': '{color.neutral.500}',
        'semantic.color.bg.canvas': '{color.neutral.600}',
      },
    };
    writeFileSync(specPath, JSON.stringify(specData, null, 2), 'utf8');

    const tokensDir = join(dir, 'tokens');
    assert.equal(runGenerate(['--spec', specPath, '--out', tokensDir]), 0);

    const result = auditTokens(tokensDir, { theme: 'light', minRatio: 4.5, minApca: 60 });
    assert.equal(result.pass, false);
    const primaryPair = result.themes.light.pairs.find(
      (p) =>
        p.foreground === 'semantic.color.text.primary' &&
        p.background === 'semantic.color.bg.canvas',
    );
    assert.ok(primaryPair !== undefined);
    assert.equal(primaryPair.pass, false);
    assert.ok(primaryPair.suggestion !== undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
