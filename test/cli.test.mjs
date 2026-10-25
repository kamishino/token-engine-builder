import assert from 'node:assert/strict';
import console from 'node:console';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli, runSync, usage } from '../src/cli/index.ts';

const exampleSpec = 'src/skills/token-style/assets/style-spec.example.json';

test('token-engine usage prints CLI commands and options', () => {
  const text = usage();
  assert.ok(text.includes('Usage: token-engine <command>'));
  assert.ok(text.includes('sync'));
  assert.ok(text.includes('init'));
  assert.ok(text.includes('audit'));
  assert.ok(text.includes('build'));
  assert.ok(text.includes('scaffold'));
});

test('runCli --help prints usage and exits 0', async () => {
  const originalLog = console.log;
  let output = '';
  console.log = (...args) => {
    output += args.join(' ') + '\n';
  };
  try {
    const code = await runCli(['--help']);
    assert.equal(code, 0);
    assert.ok(output.includes('Usage: token-engine <command>'));
  } finally {
    console.log = originalLog;
  }
});

test('runCli init detects context and routes appropriately', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cli-init-'));
  try {
    const code = await runCli(['init', '--root', dir]);
    assert.equal(code, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runCli scaffold creates companion configs', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cli-scaffold-'));
  try {
    const code = await runCli([
      'scaffold',
      '--root',
      dir,
      '--formatter',
      'prettier',
      '--linter',
      'stylelint',
      '--css',
      'native',
    ]);
    assert.equal(code, 0);
    assert.ok(existsSync(join(dir, '.prettierrc.json')));
    assert.ok(existsSync(join(dir, '.stylelintrc.json')));
    assert.ok(existsSync(join(dir, 'tokens.import.css')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runSync executes complete pipeline end-to-end in a single pass', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cli-sync-'));
  try {
    const specPath = join(dir, 'style-spec.json');
    writeFileSync(specPath, readFileSync(exampleSpec, 'utf8'), 'utf8');
    const tokensDir = join(dir, 'tokens');
    const outDir = join(dir, 'build');

    const code = await runSync([
      '--spec',
      specPath,
      '--tokens',
      tokensDir,
      '--out',
      outDir,
      '--theme',
      'all',
      '--selector',
      ':host, :root',
      '--package',
      '@my-tokens',
      '--force',
    ]);
    assert.equal(code, 0);

    // Verify token-math outputs
    assert.ok(existsSync(join(tokensDir, 'primitive', 'color.tokens.json')));
    assert.ok(existsSync(join(tokensDir, 'semantic', 'light.tokens.json')));

    // Verify token-audit stamp
    assert.ok(existsSync(join(tokensDir, '.token-engine-audit.json')));

    // Verify token-build outputs
    assert.ok(existsSync(join(outDir, 'tokens.css')));
    assert.ok(existsSync(join(outDir, 'tokens.js')));
    assert.ok(existsSync(join(outDir, 'tokens.d.ts')));
    assert.ok(existsSync(join(outDir, 'theme.css')));
    assert.ok(existsSync(join(outDir, 'package.json')));

    const css = readFileSync(join(outDir, 'tokens.css'), 'utf8');
    assert.ok(css.includes(':host, :root {'));
    assert.ok(css.includes('@media (prefers-color-scheme: dark)'));

    const pkg = JSON.parse(readFileSync(join(outDir, 'package.json'), 'utf8'));
    assert.equal(pkg.name, '@my-tokens');
    assert.equal(pkg.main, './tokens.js');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
