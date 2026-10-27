import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { diagnoseDesignSystem } from '../src/shared/diagnose.ts';
import { resolveSystemPaths } from '../src/shared/system-state.ts';
import { runAudit } from '../src/shared/audit.ts';
import { runBuild } from '../src/shared/build.ts';
import { runGenerate } from '../src/shared/generate.ts';

const exampleSpec = 'src/skills/design-tokens/assets/style-spec.example.json';

test('diagnoseDesignSystem reports spec-missing and routing nextActions on empty directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'diag-empty-'));
  try {
    const paths = resolveSystemPaths(dir);
    const diagnosis = diagnoseDesignSystem(dir, paths);
    assert.equal(diagnosis.state.spec.status, 'missing');
    assert.ok(diagnosis.findings.some((f) => f.id === 'spec-missing'));
    const extractAction = diagnosis.nextActions.find((a) => a.skill === 'extract');
    assert.ok(extractAction !== undefined);
    assert.ok(extractAction.command.includes('token-engine.mjs extract'));
    assert.ok(extractAction.command.includes('<skill-root>'));
    assert.doesNotMatch(extractAction.command, /~\/\.agents/);
    const styleAction = diagnosis.nextActions.find((a) => a.skill === 'design-tokens');
    assert.ok(styleAction !== undefined);
    assert.equal(styleAction.command, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test('diagnoseDesignSystem reports spec-invalid with scriptless token-style nextAction', () => {
  const dir = mkdtempSync(join(tmpdir(), 'diag-invalid-'));
  try {
    const specPath = join(dir, 'style-spec.json');
    const specData = JSON.parse(readFileSync(exampleSpec, 'utf8'));
    specData.palette.push({
      role: 'primary',
      name: 'crimson',
      anchor: { l: 0.5, c: 0.2, h: 25, alpha: 1 },
    });
    writeFileSync(specPath, JSON.stringify(specData, null, 2), 'utf8');

    const paths = resolveSystemPaths(dir, { spec: specPath });
    const diagnosis = diagnoseDesignSystem(dir, paths);
    assert.equal(diagnosis.state.spec.status, 'invalid');
    assert.ok(diagnosis.findings.some((f) => f.id === 'spec-invalid'));
    const styleAction = diagnosis.nextActions.find((a) => a.skill === 'design-tokens');
    assert.ok(styleAction !== undefined);
    assert.equal(styleAction.command, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('diagnoseDesignSystem flags low-contrast override with audit-fail and remedy', () => {
  const dir = mkdtempSync(join(tmpdir(), 'diag-remedy-'));
  try {
    const specPath = join(dir, 'style-spec.json');
    const specData = JSON.parse(readFileSync(exampleSpec, 'utf8'));
    specData.overrides = {
      light: {
        'semantic.color.text.tertiary': '{color.neutral.200}',
      },
    };
    writeFileSync(specPath, JSON.stringify(specData, null, 2), 'utf8');

    const tokensDir = join(dir, 'tokens');
    assert.equal(runGenerate(['--spec', specPath, '--out', tokensDir]), 0);

    const paths = resolveSystemPaths(dir, { spec: specPath, tokens: tokensDir });
    const diagnosis = diagnoseDesignSystem(dir, paths);

    const auditFinding = diagnosis.findings.find((f) => f.id.startsWith('audit-fail-'));
    assert.ok(auditFinding !== undefined);
    assert.equal(auditFinding.severity, 'error');
    assert.ok(auditFinding.evidence.some((e) => e.includes('remedy:')));
    assert.ok(diagnosis.nextActions.some((a) => a.skill === 'audit'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('diagnoseDesignSystem reports healthy tree with no error findings', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'diag-healthy-'));
  try {
    const specPath = join(dir, 'style-spec.json');
    writeFileSync(specPath, readFileSync(exampleSpec, 'utf8'), 'utf8');

    const tokensDir = join(dir, 'tokens');
    assert.equal(runGenerate(['--spec', specPath, '--out', tokensDir]), 0);
    assert.equal(runAudit(['--tokens', tokensDir, '--spec', specPath]), 0);

    const buildDir = join(dir, 'build');
    const buildCode = await runBuild([
      '--tokens',
      tokensDir,
      '--out',
      buildDir,
      '--theme',
      'light',
      '--spec',
      specPath,
    ]);
    assert.equal(buildCode, 0);

    const paths = resolveSystemPaths(dir, { spec: specPath, tokens: tokensDir, build: buildDir });
    const diagnosis = diagnoseDesignSystem(dir, paths);

    const errors = diagnosis.findings.filter((f) => f.severity === 'error');
    assert.equal(errors.length, 0);
    assert.ok(diagnosis.nextActions.some((a) => a.skill === 'diagnose'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
