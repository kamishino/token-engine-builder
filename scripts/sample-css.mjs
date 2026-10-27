#!/usr/bin/env node
/**
 * Generate sample CSS from the example tokens config via the built skill bundles,
 * diff it against the checked-in gold standards, then lint it with stylelint.
 * Temp dir is removed afterwards; paths here use forward slashes because the
 * bundled Style Dictionary glob layer needs them.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMainModule } from '../src/shared/paths.ts';
import { profileFileName, UI_PROFILE_IDS } from '../src/shared/profile-registry.ts';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const BASE_PAIRS = [
  ['build/tokens.css', 'test/fixtures/gold/tokens.example.css'],
  ['build/theme.css', 'test/fixtures/gold/theme.example.css'],
  ['build/components.md', 'test/fixtures/gold/components.example.md'],
  ['build/DESIGN.md', 'test/fixtures/gold/design.example.md'],
];

export const GOLD_PAIRS = [
  ...BASE_PAIRS,
  ...UI_PROFILE_IDS.map((profile) => {
    const fileName = profileFileName(profile);
    const extension = fileName.endsWith('.json') ? 'json' : 'css';
    return [
      `build/profiles/${fileName}`,
      `test/fixtures/gold/${profile}.example.${extension}`,
    ];
  }),
];

export function diffGold({ root = rootDir, workDir, pairs = GOLD_PAIRS }) {
  const drifted = [];
  for (const [built, gold] of pairs) {
    const actual = readFileSync(join(workDir, built), 'utf8').replaceAll('\r\n', '\n');
    const expected = readFileSync(join(root, gold), 'utf8').replaceAll('\r\n', '\n');
    if (actual !== expected) {
      drifted.push(`${built} drifted from ${gold}`);
    }
  }
  return drifted;
}

export function runSampleCss({ root = rootDir } = {}) {
  const workDir = mkdtempSync(join(tmpdir(), 'token-engine-css-'));
  // Via node directly: the .cmd shim does not spawn from execFileSync on Windows.
  const stylelintEntry = join(root, 'node_modules', 'stylelint', 'bin', 'stylelint.mjs');

  function run(script, args) {
    execFileSync(process.execPath, [join(root, script), ...args], {
      cwd: workDir,
      stdio: 'inherit',
    });
  }

  const cliScript = 'dist/cli/token-engine.mjs';
  const exampleSpec = join(rootDir, 'dist/design-tokens/assets/tokens.config.example.json').replaceAll('\\', '/');

  try {
    run(cliScript, [
      'generate',
      '--spec',
      exampleSpec,
      '--out',
      'tokens',
    ]);
    run(cliScript, ['audit', '--tokens', 'tokens']);
    run(cliScript, [
      'build',
      '--tokens',
      'tokens',
      '--out',
      'build',
      '--theme',
      'light',
      '--spec',
      exampleSpec,
    ]);
    run(cliScript, [
      'build',
      '--tokens',
      'tokens',
      '--out',
      'build/dark',
      '--theme',
      'dark',
    ]);
    for (const profile of UI_PROFILE_IDS) {
      run(cliScript, [
        'build',
        '--tokens',
        'tokens',
        '--out',
        'build/profiles',
        '--profile',
        profile,
        '--force',
      ]);
    }
    execFileSync(
      process.execPath,
      [stylelintEntry, '--config', join(rootDir, 'stylelint.config.mjs'), 'build/**/*.css'],
      { cwd: workDir, stdio: 'inherit' },
    );
    const drifted = diffGold({ root, workDir });
    if (drifted.length > 0) {
      for (const msg of drifted) console.error(`[lint:css] FAIL ${msg}`);
      console.error('[lint:css] update the gold file if the change is intended');
      return 1;
    }
    console.log('[lint:css] sample CSS matches gold standards');
    return 0;
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

if (isMainModule(import.meta.url, 'sample-css.mjs')) {
  process.exitCode = runSampleCss();
}
