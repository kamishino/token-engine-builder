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

export const GOLD_PAIRS = [
  ['build/tokens.css', 'src/skills/token-build/examples/tokens.example.css'],
  ['build/theme.css', 'src/skills/token-build/examples/theme.example.css'],
  ['build/components.md', 'src/skills/token-build/examples/components.example.md'],
  ['build/DESIGN.md', 'src/skills/token-build/examples/design.example.md'],
  ['build/profiles/shadcn.css', 'src/skills/token-build/examples/shadcn.example.css'],
  ['build/profiles/primevue.css', 'src/skills/token-build/examples/primevue.example.css'],
  ['build/profiles/antd-theme.json', 'src/skills/token-build/examples/antd.example.json'],
  ['build/profiles/mui-theme.json', 'src/skills/token-build/examples/mui.example.json'],
  ['build/profiles/chakra-theme.json', 'src/skills/token-build/examples/chakra.example.json'],
  ['build/profiles/radix-theme.css', 'src/skills/token-build/examples/radix.example.css'],
  ['build/profiles/fluent-theme.json', 'src/skills/token-build/examples/fluent.example.json'],
  ['build/profiles/bootstrap.css', 'src/skills/token-build/examples/bootstrap.example.css'],
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
    const UI_PROFILES = [
      'shadcn',
      'bootstrap',
      'primevue',
      'antd',
      'mui',
      'chakra',
      'radix',
      'fluent',
    ];
    for (const profile of UI_PROFILES) {
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
