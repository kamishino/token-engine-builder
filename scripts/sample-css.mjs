#!/usr/bin/env node
/**
 * Generate sample CSS from the example style-spec via the built skill bundles,
 * then lint it with stylelint. Temp dir is removed afterwards; paths here use
 * forward slashes because the bundled Style Dictionary glob layer needs them.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
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
  console.log('[lint:css] sample CSS passes stylelint');
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
