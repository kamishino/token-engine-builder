import assert from 'node:assert/strict';
import console from 'node:console';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { EXIT } from '../src/shared/exit-codes.ts';
import { oklchToHex } from '../src/shared/colors.ts';
import { guideFromSpec } from '../src/shared/compiler.ts';
import { publishCssOutputs } from '../src/shared/guard.ts';
import { loadStyleSpec } from '../src/shared/spec.ts';
import { runBuild } from '../src/shared/build.ts';
test('guideFromSpec maps palette roles and typography to DESIGN.md guide data', () => {
  const spec = loadStyleSpec('src/skills/design-tokens/assets/tokens.config.example.json').spec;
  const guide = guideFromSpec(spec);
  const primary = spec.palette.find((entry) => entry.role === 'primary');
  const secondary = spec.palette.find((entry) => entry.role === 'secondary');
  assert.equal(guide.name, 'Example Brand');
  assert.equal(guide.primaryHex, oklchToHex(primary.anchor));
  assert.equal(guide.secondaryHex, oklchToHex(secondary.anchor));
  assert.equal(guide.scale, spec.typography.ratio);
  assert.equal(guide.density, spec.density);
});

test('publishCssOutputs writes a manifest and reports missing artifacts', () => {
  const dir = mkdtempSync(join(tmpdir(), 'publish-css-'));
  try {
    const tokensDir = join(dir, 'tokens');
    const cssDir = join(dir, 'out');
    mkdirSync(tokensDir, { recursive: true });
    mkdirSync(cssDir, { recursive: true });
    writeFileSync(join(tokensDir, 'color.tokens.json'), '{"color":{}}', 'utf8');
    writeFileSync(join(cssDir, 'tokens.css'), ':root {}', 'utf8');

    const ok = publishCssOutputs(cssDir, tokensDir, {
      'tokens.css': join(cssDir, 'tokens.css'),
    });
    assert.deepEqual(ok.missing, []);
    assert.ok(existsSync(join(cssDir, '.token-engine-css-manifest.json')));

    const missing = publishCssOutputs(cssDir, tokensDir, {
      'missing.css': join(cssDir, 'missing.css'),
    });
    assert.deepEqual(missing.missing, [join(cssDir, 'missing.css')]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runBuild emits structured diagnostics when tokens directory is missing', async () => {
  const originalError = console.error;
  const messages = [];
  console.error = (...args) => messages.push(args.join(' '));
  try {
    const code = await runBuild(['--tokens', '/nonexistent-tokens-dir-test']);
    assert.equal(code, EXIT.USAGE);
    const output = messages.join('\n');
    assert.match(output, /state: missing-tokens/);
    assert.match(output, /next: token-engine extract/);
    assert.match(output, /why: token-engine build requires/);
  } finally {
    console.error = originalError;
  }
});

test('runBuild supports --theme all, --selector, --package, and emits typed TS/JS', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'build-request-all-'));
  try {
    const tokensDir = join(dir, 'tokens');
    const outDir = join(dir, 'out');
    const { runGenerate } = await import('../src/shared/generate.ts');
    runGenerate([
      '--spec',
      'src/skills/design-tokens/assets/tokens.config.example.json',
      '--out',
      tokensDir,
    ]);

    const code = await runBuild([
      '--tokens',
      tokensDir,
      '--out',
      outDir,
      '--theme',
      'all',
      '--selector',
      ':host, :root',
      '--package',
      '@tokens',
      '--allow-unaudited',
      '--force',
    ]);
    assert.equal(code, 0);

    const tokensCss = readFileSync(join(outDir, 'tokens.css'), 'utf8');
    assert.ok(tokensCss.includes(':host, :root {'));
    assert.ok(tokensCss.includes('@media (prefers-color-scheme: dark)'));
    assert.ok(tokensCss.includes(':host([data-theme="dark"])'));

    assert.ok(existsSync(join(outDir, 'tokens.light.css')));
    assert.ok(existsSync(join(outDir, 'tokens.dark.css')));
    assert.ok(existsSync(join(outDir, 'tokens.high-contrast.css')));

    const tokensJs = readFileSync(join(outDir, 'tokens.js'), 'utf8');
    assert.ok(tokensJs.includes('export const'));
    assert.ok(tokensJs.includes('export const themes ='));

    const tokensDts = readFileSync(join(outDir, 'tokens.d.ts'), 'utf8');
    assert.ok(tokensDts.includes('export declare const'));
    assert.ok(tokensDts.includes('export declare const themes:'));

    const pkgJson = JSON.parse(readFileSync(join(outDir, 'package.json'), 'utf8'));
    assert.equal(pkgJson.name, '@tokens');
    assert.equal(pkgJson.main, './tokens.js');
    assert.equal(pkgJson.types, './tokens.d.ts');
    assert.equal(pkgJson.exports['./css'], './tokens.css');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runBuild single theme succeeds from tokens directory outside process.cwd()', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'build-external-tokens-'));
  try {
    const tokensDir = join(dir, 'tokens');
    const outDir = join(dir, 'out');
    const { runGenerate } = await import('../src/shared/generate.ts');
    runGenerate([
      '--spec',
      'src/skills/design-tokens/assets/tokens.config.example.json',
      '--out',
      tokensDir,
    ]);

    const code = await runBuild([
      '--tokens',
      tokensDir,
      '--out',
      outDir,
      '--theme',
      'light',
      '--allow-unaudited',
    ]);
    assert.equal(code, 0);
    assert.ok(existsSync(join(outDir, 'tokens.css')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
