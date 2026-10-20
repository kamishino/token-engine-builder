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
import { PROFILE_FILE_NAMES, UI_PROFILE_IDS } from '../src/shared/profile-registry.ts';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const BASE_PAIRS = [
  ['build/tokens.css', 'src/skills/token-build/examples/tokens.example.css'],
  ['build/theme.css', 'src/skills/token-build/examples/theme.example.css'],
  ['build/components.md', 'src/skills/token-build/examples/components.example.md'],
  ['build/DESIGN.md', 'src/skills/token-build/examples/design.example.md'],
];

export const GOLD_PAIRS = [
  ...BASE_PAIRS,
  ...UI_PROFILE_IDS.map((profile) => {
    const fileName = PROFILE_FILE_NAMES[profile];
    const extension = fileName.endsWith('.json') ? 'json' : 'css';
    return [
      `build/profiles/${fileName}`,
      `src/skills/token-build/examples/${profile}.example.${extension}`,
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

  try {
    run('dist/token-math/scripts/generate.mjs', [
      '--spec',
      join(rootDir, 'dist/token-style/assets/style-spec.example.json').replaceAll('\\', '/'),
      '--out',
      'tokens',
    ]);
    run('dist/token-audit/scripts/audit.mjs', ['--tokens', 'tokens']);
    run('dist/token-build/scripts/build.mjs', [
      '--tokens',
      'tokens',
      '--out',
      'build',
      '--theme',
      'light',
      '--spec',
      join(rootDir, 'dist/token-style/assets/style-spec.example.json').replaceAll('\\', '/'),
    ]);
    run('dist/token-build/scripts/build.mjs', [
      '--tokens',
      'tokens',
      '--out',
      'build/dark',
      '--theme',
      'dark',
    ]);
    for (const profile of UI_PROFILE_IDS) {
      run('dist/token-build/scripts/build.mjs', [
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

const isMain =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  process.exitCode = runSampleCss();
}
