import assert from 'node:assert/strict';
import console from 'node:console';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { EXIT } from '../src/shared/exit-codes.ts';
import { runCli, runSync, usage } from '../src/cli/index.ts';

const exampleSpec = 'src/skills/design-tokens/assets/style-spec.example.json';

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

test('runCli routes --help to specific subcommands correctly', async () => {
  for (const cmd of ['init', 'audit', 'build', 'extract', 'scaffold']) {
    const originalLog = console.log;
    let output = '';
    console.log = (...args) => {
      output += args.join(' ') + '\n';
    };
    try {
      const code = await runCli([cmd, '--help']);
      assert.equal(code, 0);
      assert.ok(output.includes('Usage:'));
    } finally {
      console.log = originalLog;
    }
  }
});

test('runSync refuses overwrite without --force on existing targets, and succeeds with --force', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cli-refusal-'));
  try {
    const specPath = join(dir, 'style-spec.json');
    writeFileSync(specPath, readFileSync(exampleSpec, 'utf8'), 'utf8');
    const tokensDir = join(dir, 'tokens');
    const outDir = join(dir, 'build');

    // Run 1: initial generation
    const code1 = await runSync([
      '--spec',
      specPath,
      '--tokens',
      tokensDir,
      '--out',
      outDir,
    ]);
    assert.equal(code1, 0);

    // Run 2: without --force refuses existing targets
    const code2 = await runSync([
      '--spec',
      specPath,
      '--tokens',
      tokensDir,
      '--out',
      outDir,
    ]);
    assert.equal(code2, 3);

    // Run 3: with --force overwrites successfully
    const code3 = await runSync([
      '--spec',
      specPath,
      '--tokens',
      tokensDir,
      '--out',
      outDir,
      '--force',
    ]);
    assert.equal(code3, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runSync --json outputs parseable JSON report', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cli-json-'));
  const originalLog = console.log;
  let output = '';
  console.log = (...args) => {
    output += args.join(' ') + '\n';
  };
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
      '--json',
    ]);
    assert.equal(code, 0);
    const parsed = JSON.parse(output.trim());
    assert.equal(parsed.status, 'success');
    assert.equal(parsed.spec, specPath);
    assert.equal(parsed.tokensDir, tokensDir);
    assert.equal(parsed.outDir, outDir);
  } finally {
    console.log = originalLog;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runCli propagates EXIT taxonomy exit codes', async () => {
  // 1. Unknown command -> EXIT.USAGE (2)
  const codeUnknown = await runCli(['unknown-subcommand']);
  assert.equal(codeUnknown, EXIT.USAGE);

  const dir = mkdtempSync(join(tmpdir(), 'cli-exit-taxonomy-'));
  try {
    // 2. runSync on syntactically invalid spec file -> EXIT.VALIDATION (5)
    const invalidSpecPath = join(dir, 'invalid-spec.json');
    writeFileSync(invalidSpecPath, '{ "name": "Broken", "palette": [] }', 'utf8');
    const codeValidation = await runSync(['--spec', invalidSpecPath, '--tokens', join(dir, 'tokens')]);
    assert.equal(codeValidation, EXIT.VALIDATION);

    // 3. runCli(['audit']) against failing-contrast fixture -> EXIT.AUDIT (4)
    const validSpecPath = join(dir, 'style-spec.json');
    const specData = JSON.parse(readFileSync(exampleSpec, 'utf8'));
    specData.palette[0].anchor.l = 0.95;
    writeFileSync(validSpecPath, JSON.stringify(specData, null, 2), 'utf8');

    const tokensDir = join(dir, 'failing-tokens');
    await runCli(['generate', '--spec', validSpecPath, '--out', tokensDir]);
    const codeAudit = await runCli(['audit', '--tokens', tokensDir]);
    assert.equal(codeAudit, EXIT.AUDIT);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
