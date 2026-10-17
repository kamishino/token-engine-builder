#!/usr/bin/env node
/**
 * Generate sample CSS from the example style-spec via the built skill bundles,
 * diff it against the checked-in gold standards, then lint it with stylelint.
 * Temp dir is removed afterwards; paths here use forward slashes because the
 * bundled Style Dictionary glob layer needs them.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workDir = mkdtempSync(join(tmpdir(), 'token-engine-css-'));
// Via node directly: the .cmd shim does not spawn from execFileSync on Windows.
const stylelintEntry = join(rootDir, 'node_modules', 'stylelint', 'bin', 'stylelint.mjs');

function run(script, args) {
  execFileSync(process.execPath, [join(rootDir, script), ...args], {
    cwd: workDir,
    stdio: 'inherit',
  });
}

try {
  run('dist/token-math/scripts/generate.mjs', [
    '--spec',
    join(rootDir, 'dist/design-style/assets/style-spec.example.json').replaceAll('\\', '/'),
    '--out',
    'tokens',
  ]);
  run('dist/token-build/scripts/build.mjs', [
    '--tokens',
    'tokens',
    '--out',
    'build',
    '--theme',
    'light',
  ]);
  run('dist/token-build/scripts/build.mjs', [
    '--tokens',
    'tokens',
    '--out',
    'build/dark',
    '--theme',
    'dark',
  ]);
  execFileSync(
    process.execPath,
    [stylelintEntry, '--config', join(rootDir, 'stylelint.config.mjs'), 'build/**/*.css'],
    { cwd: workDir, stdio: 'inherit' },
  );
  let drifted = null;
  for (const [built, gold] of [
    ['build/tokens.css', 'src/skills/token-build/examples/tokens.example.css'],
    ['build/theme.css', 'src/skills/token-build/examples/theme.example.css'],
  ]) {
    const actual = readFileSync(join(workDir, built), 'utf8').replaceAll('\r\n', '\n');
    const expected = readFileSync(join(rootDir, gold), 'utf8').replaceAll('\r\n', '\n');
    if (actual !== expected) {
      drifted = `${built} drifted from ${gold} — regenerate the gold standards from the example spec`;
      break;
    }
  }
  if (drifted !== null) {
    console.error(`[lint:css] FAIL ${drifted}`);
    process.exitCode = 1;
  } else {
    console.log('[lint:css] sample CSS matches gold standards');
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
