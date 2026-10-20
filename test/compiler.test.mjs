import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildTokens } from '../src/shared/compiler.ts';
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
      theme: 'light',
      visualizer: true,
      guide: {
        name: 'Compiler Test Brand',
        overview: 'Test overview description.',
      },
    });

    assert.equal(emitted.length, 5);

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
