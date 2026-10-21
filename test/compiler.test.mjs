import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  buildTokens,
  loadThemeTokens,
  ResolvedDictionary,
  verifyGeneratedFiles,
} from '../src/shared/compiler.ts';
import { runGenerate } from '../src/skills/token-math/scripts/generate.ts';

test('buildTokens compiles DTCG tokens to CSS, Tailwind @theme, docs, and visualizer', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'compiler-test-'));
  try {
    const tokensDir = join(dir, 'tokens');
    const outDir = join(dir, 'out');
    runGenerate([
      '--spec',
      'src/skills/token-style/assets/style-spec.example.json',
      '--out',
      tokensDir,
    ]);

    const source = [
      `${tokensDir.replaceAll('\\', '/')}/primitive/**/*.tokens.json`,
      `${tokensDir.replaceAll('\\', '/')}/semantic/light.tokens.json`,
      `${tokensDir.replaceAll('\\', '/')}/component/**/*.tokens.json`,
    ];

    const emitted = await buildTokens({
      source,
      outDir,
      visualizer: true,
      guide: {
        name: 'Compiler Test Brand',
        overview: 'Test overview description.',
      },
    });

    assert.ok(emitted.artifacts['tokens.css']?.endsWith('tokens.css'));
    assert.ok(emitted.artifacts['theme.css']?.endsWith('theme.css'));
    assert.ok(emitted.artifacts['components.md']?.endsWith('components.md'));
    assert.ok(emitted.artifacts['DESIGN.md']?.endsWith('DESIGN.md'));
    assert.ok(emitted.artifacts['visualizer.html']?.endsWith('visualizer.html'));

    const tokensCss = readFileSync(join(outDir, 'tokens.css'), 'utf8');
    assert.ok(tokensCss.includes(':root {'));
    assert.ok(tokensCss.includes('--color-'));

    const themeCss = readFileSync(join(outDir, 'theme.css'), 'utf8');
    assert.ok(themeCss.includes('@theme {'));

    const componentsMd = readFileSync(join(outDir, 'components.md'), 'utf8');
    assert.ok(componentsMd.includes('## button'));

    const designMd = readFileSync(join(outDir, 'DESIGN.md'), 'utf8');
    assert.ok(designMd.includes('Compiler Test Brand'));
    assert.ok(designMd.includes('## Colors'));

    const visualizerHtml = readFileSync(join(outDir, 'visualizer.html'), 'utf8');
    assert.ok(visualizerHtml.includes('<!DOCTYPE html>'));
    assert.ok(visualizerHtml.includes('Compiler Test Brand'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ResolvedDictionary provides lookup and fail-closed require', () => {
  const dict = new ResolvedDictionary([
    { name: 'primary', path: ['color', 'brand', '500'], $value: '#2563eb' },
    { name: 'canvas', path: ['color', 'bg', 'canvas'], value: '#ffffff' },
  ]);

  assert.equal(dict.optional('color.brand.500', '#000'), '#2563eb');
  assert.equal(dict.optional('color.bg.canvas', '#000'), '#ffffff');
  assert.equal(dict.optional('nonexistent.path', '#fallback'), '#fallback');
  assert.equal(dict.require('color.brand.500', 'test-format'), '#2563eb');
  assert.throws(() => dict.require('nonexistent.path', 'test-format'), {
    message: /format test-format: missing required token "nonexistent.path"/,
  });
});

test('buildTokens fails closed when required token is missing', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'compiler-fail-'));
  try {
    const tokensDir = join(dir, 'tokens');
    const outDir = join(dir, 'out');
    runGenerate([
      '--spec',
      'src/skills/token-style/assets/style-spec.example.json',
      '--out',
      tokensDir,
    ]);

    rmSync(join(tokensDir, 'primitive', 'radius.tokens.json'));

    const source = [
      `${tokensDir.replaceAll('\\', '/')}/primitive/**/*.tokens.json`,
      `${tokensDir.replaceAll('\\', '/')}/semantic/light.tokens.json`,
      `${tokensDir.replaceAll('\\', '/')}/component/**/*.tokens.json`,
    ];

    await assert.rejects(
      () =>
        buildTokens({
          source,
          outDir,
        }),
      /missing required token|Some token references/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('loadThemeTokens fails closed on a missing theme file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'theme-missing-'));
  try {
    await assert.rejects(() => loadThemeTokens(dir, 'light'), /semantic theme file not found/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('verifyGeneratedFiles returns no problems for valid artifacts', () => {
  const problems = verifyGeneratedFiles({
    css: ':root { --color-blue: oklch(60% 0.15 250); }',
    theme: '@theme { --color-blue: oklch(60% 0.15 250); }',
    design: '---\ncolors:\n  primary: "#2563eb"\n---',
    expectedPrimaryHex: '#2563eb',
  });
  assert.deepEqual(problems, []);
});

test('verifyGeneratedFiles reports missing oklch, missing theme block, or design primary mismatch', () => {
  const problems = verifyGeneratedFiles({
    css: ':root { --color-blue: #2563eb; }',
    theme: ':root { --color-blue: #2563eb; }',
    design: '---\ncolors:\n  primary: "#112233"\n---',
    expectedPrimaryHex: '#2563eb',
  });
  assert.equal(problems.length, 3);
  assert.ok(problems.some((p) => p.includes('tokens.css carries no oklch()')));
  assert.ok(problems.some((p) => p.includes('theme.css has no @theme block')));
  assert.ok(problems.some((p) => p.includes('DESIGN.md primary #112233 ≠ spec anchor #2563eb')));
});
