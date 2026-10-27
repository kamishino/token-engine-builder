import assert from 'node:assert/strict';
import console from 'node:console';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { evaluateAudit as auditTokens } from '../src/shared/audit-report.ts';
import { runAudit } from '../src/shared/audit.ts';
import { EXIT } from '../src/shared/exit-codes.ts';
import { runGenerate } from '../src/shared/generate.ts';

test('runAudit fails closed on empty tokens directory and writes no stamp', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-empty-'));
  try {
    const tokensDir = join(dir, 'tokens');
    mkdirSync(tokensDir);
    const code = runAudit(['--tokens', tokensDir]);
    assert.equal(code, EXIT.AUDIT);
    assert.equal(existsSync(join(tokensDir, '.token-engine-audit.json')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runAudit emits structured diagnostics when tokens directory is missing', () => {
  const originalError = console.error;
  const messages = [];
  console.error = (...args) => messages.push(args.join(' '));
  try {
    const code = runAudit(['--tokens', '/nonexistent-tokens-dir-test']);
    assert.equal(code, EXIT.USAGE);
    const output = messages.join('\n');
    assert.match(output, /state: missing-tokens/);
    assert.match(output, /next: token-engine extract/);
    assert.match(output, /why: token-engine audit requires/);
  } finally {
    console.error = originalError;
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
    assert.equal(code, EXIT.AUDIT);
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
      'src/skills/design-tokens/assets/tokens.config.example.json',
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
    const specPath = join(dir, 'tokens.config.json');
    const changedSpecPath = join(dir, 'tokens.config-changed.json');
    const specData = JSON.parse(
      readFileSync('src/skills/design-tokens/assets/tokens.config.example.json', 'utf8'),
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
    assert.equal(runAudit(['--tokens', tokensDir, '--spec', changedSpecPath]), EXIT.AUDIT);
    assert.equal(existsSync(join(tokensDir, '.token-engine-audit.json')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('auditTokens computes remedy suggestions for failed pairs and includes them in JSON output', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-remedy-'));
  try {
    const specPath = join(dir, 'tokens.config.json');
    const specData = JSON.parse(
      readFileSync('src/skills/design-tokens/assets/tokens.config.example.json', 'utf8'),
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
    const specPath = join(dir, 'tokens.config.json');
    const specData = JSON.parse(
      readFileSync('src/skills/design-tokens/assets/tokens.config.example.json', 'utf8'),
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

test('runAudit with --baseline displays before-vs-after delta scorecard', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-delta-'));
  try {
    const tokensDir = join(dir, 'tokens');
    runGenerate([
      '--spec',
      'src/skills/design-tokens/assets/tokens.config.example.json',
      '--out',
      tokensDir,
    ]);

    const baselinePath = join(dir, '.pre-audit-baseline.json');
    const mockBaseline = {
      timestamp: new Date().toISOString(),
      pairs: [
        {
          id: 'app.css::.btn-primary',
          selector: '.btn-primary',
          file: 'app.css',
          fgHex: '#ffffff',
          bgHex: '#38bdf8',
          wcagRatio: 2.85,
          apcaLc: 42.1,
          passWcag: false,
          passApca: false,
          roleTag: 'button',
        },
        {
          id: 'app.css::body',
          selector: 'body',
          file: 'app.css',
          fgHex: '#dae8ea',
          bgHex: '#10131d',
          wcagRatio: 12.5,
          apcaLc: 95.2,
          passWcag: true,
          passApca: true,
          roleTag: 'text.primary',
        },
      ],
      summary: {
        total: 2,
        passWcag: 1,
        failWcag: 1,
        passApca: 1,
        failApca: 1,
        avgRatio: 7.68,
      },
    };
    writeFileSync(baselinePath, JSON.stringify(mockBaseline, null, 2), 'utf8');

    const originalLog = console.log;
    let output = '';
    console.log = (...args) => {
      output += args.join(' ') + '\n';
    };
    try {
      const code = runAudit(['--tokens', tokensDir, '--baseline', baselinePath]);
      assert.equal(code, 0);
    } finally {
      console.log = originalLog;
    }

    assert.ok(output.includes('DUAL-AUDIT DELTA SCORECARD'));
    assert.ok(output.includes('.btn-primary'));
    assert.ok(output.includes('Fixed by Token Math'));
    assert.ok(output.includes('Maintained'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('auditTokens fails with code 4 when non-audit component tokens form an alias cycle', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-comp-cycle-'));
  try {
    const tokensDir = join(dir, 'tokens');
    runGenerate([
      '--spec',
      'src/skills/design-tokens/assets/tokens.config.example.json',
      '--out',
      tokensDir,
    ]);

    // Introduce a component-only alias cycle
    writeFileSync(
      join(tokensDir, 'component', 'button.tokens.json'),
      JSON.stringify({
        component: {
          button: {
            bg: { $value: '{component.button.hoverBg}', $type: 'color' },
            hoverBg: { $value: '{component.button.bg}', $type: 'color' },
          },
        },
      }),
      'utf8',
    );

    const result = runAudit(['--tokens', tokensDir]);
    assert.equal(result, EXIT.AUDIT);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('auditTokens fails with code 4 when themes have asymmetric semantic token paths', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-parity-'));
  try {
    const tokensDir = join(dir, 'tokens');
    runGenerate([
      '--spec',
      'src/skills/design-tokens/assets/tokens.config.example.json',
      '--out',
      tokensDir,
    ]);

    // Add extra semantic token only to light theme
    const lightPath = join(tokensDir, 'semantic', 'light.tokens.json');
    const lightData = JSON.parse(readFileSync(lightPath, 'utf8'));
    lightData.semantic.color.action.secondary = '{color.sky.500}';
    writeFileSync(lightPath, JSON.stringify(lightData, null, 2), 'utf8');

    const result = runAudit(['--tokens', tokensDir, '--theme', 'both']);
    assert.equal(result, EXIT.AUDIT);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
