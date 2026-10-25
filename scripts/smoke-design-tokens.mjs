#!/usr/bin/env node
/**
 * Standalone smoke test: simulates an autonomous AI Agent using the
 * flagship `design-tokens` skill in an isolated brownfield monorepo workspace.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const startTime = Date.now();

// 1. Locate the token-engine binary (prefer active installed skill, fallback to dist/cli)
const installedCli = join(homedir(), '.agents', 'skills', 'design-tokens', 'scripts', 'token-engine.mjs');
const localCli = join(root, 'dist', 'cli', 'token-engine.mjs');
const cliPath = existsSync(installedCli) ? installedCli : localCli;

if (!existsSync(cliPath)) {
  console.error(`FAIL: token-engine CLI not found at ${cliPath}; run npm run build first`);
  process.exit(1);
}

console.log(`[smoke] using CLI: ${cliPath}`);

// 2. Setup isolated simulated brownfield monorepo
const tempDir = mkdtempSync(join(tmpdir(), 'smoke-design-tokens-'));
const hudDir = join(tempDir, 'packages', 'hud');
mkdirSync(join(hudDir, 'src'), { recursive: true });

writeFileSync(
  join(tempDir, 'package.json'),
  JSON.stringify({ name: 'hordes-automation-sim', private: true, type: 'module' }, null, 2),
  'utf8',
);

writeFileSync(
  join(tempDir, 'pnpm-lock.yaml'),
  'lockfileVersion: 5.4\n',
  'utf8',
);

// Real-world brownfield HUD with Web Component Shadow DOM and known low-contrast colors
writeFileSync(
  join(hudDir, 'src', 'hud-styles.ts'),
  `
  // Bento HUD Web Component with Shadow DOM
  export const hudStyles = \`
    :host {
      display: block;
      background: #10131dcc;
      color: #dae8ea;
      border-radius: 8px;
    }
    .btn-action {
      background-color: #38bdf8;
      color: #ffffff;
    }
    .text-muted {
      color: #5b858e;
    }
    .hud-card {
      background-color: #151b27;
      color: #dae8ea;
      border: 1px solid #1f2937;
    }
  \`;
  `,
  'utf8',
);

writeFileSync(
  join(hudDir, 'src', 'hud.css'),
  `
  :host {
    --hud-bg: #10131d;
    --hud-text: #dae8ea;
  }
  .hud-panel {
    background: #10131d;
    color: #dae8ea;
  }
  .hud-btn {
    background: #38bdf8;
    color: #ffffff;
  }
  .hud-muted {
    color: #5b858e;
  }
  `,
  'utf8',
);

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures++;
    console.error(`  FAIL: ${msg}`);
  } else {
    console.log(`  PASS: ${msg}`);
  }
}

try {
  // Phase 1: Context Discovery & Triage
  console.log('\n[Phase 1] Codebase Context Discovery');
  const initOut = execFileSync(
    process.execPath,
    [cliPath, 'init', '--root', tempDir, '--dry-run'],
    { cwd: tempDir, encoding: 'utf8' },
  );
  assert(initOut.includes('maturity=brownfield'), 'detects brownfield styling');
  assert(initOut.includes('runtime=shadow-dom'), 'detects Shadow DOM Web Components');
  assert(initOut.includes('pkg=pnpm'), 'detects pnpm package manager');

  // Phase 2: Palette Architecture & Pre-Audit Baseline
  console.log('\n[Phase 2] Palette Extraction & Pre-Audit Baseline');
  execFileSync(
    process.execPath,
    [
      cliPath,
      'extract',
      '--root',
      tempDir,
      '--out',
      join(tempDir, 'style-spec.json'),
      '--audit-baseline',
      '--force',
    ],
    { cwd: tempDir, encoding: 'utf8' },
  );
  assert(existsSync(join(tempDir, 'style-spec.json')), 'emits candidate style-spec.json');
  assert(existsSync(join(tempDir, '.pre-audit-baseline.json')), 'emits .pre-audit-baseline.json');
  assert(existsSync(join(tempDir, 'pre-audit-baseline.md')), 'emits pre-audit-baseline.md');

  const baseline = JSON.parse(readFileSync(join(tempDir, '.pre-audit-baseline.json'), 'utf8'));
  assert(baseline.pairs.length >= 2, `evaluated ${baseline.pairs.length} baseline pairs`);
  assert(baseline.summary.failWcag >= 1, `uncovered ${baseline.summary.failWcag} production contrast failure(s)`);

  // Phase 3: Deterministic Sync (Single-Pass Execution)
  console.log('\n[Phase 3] Deterministic Sync Pipeline (1 Command)');
  const syncOut = execFileSync(
    process.execPath,
    [
      cliPath,
      'sync',
      '--spec',
      join(tempDir, 'style-spec.json'),
      '--tokens',
      join(tempDir, 'tokens'),
      '--out',
      join(tempDir, 'packages', 'tokens'),
      '--theme',
      'all',
      '--selector',
      ':host, :root',
      '--package',
      '@tokens',
      '--force',
    ],
    { cwd: tempDir, encoding: 'utf8' },
  );
  assert(syncOut.includes('pipeline complete'), 'sync completes with exit code 0');
  assert(syncOut.includes('DUAL-AUDIT DELTA SCORECARD'), 'prints Before-vs-After delta scorecard');
  assert(syncOut.includes('Fixed by Token Math'), 'demonstrates production contrast fix');

  // Phase 4: Output Assertion & Verification
  console.log('\n[Phase 4] Output Verification');
  const tokensOutDir = join(tempDir, 'packages', 'tokens');
  assert(existsSync(join(tempDir, 'tokens', '.token-engine-audit.json')), 'cryptographic audit stamp written');
  assert(existsSync(join(tokensOutDir, 'tokens.css')), 'emitted tokens.css');
  assert(existsSync(join(tokensOutDir, 'tokens.js')), 'emitted tokens.js');
  assert(existsSync(join(tokensOutDir, 'tokens.d.ts')), 'emitted tokens.d.ts');
  assert(existsSync(join(tokensOutDir, 'theme.css')), 'emitted theme.css');
  assert(existsSync(join(tokensOutDir, 'package.json')), 'emitted package.json');

  const tokensCss = readFileSync(join(tokensOutDir, 'tokens.css'), 'utf8');
  assert(tokensCss.includes(':host, :root {'), 'tokens.css scopes to :host, :root');
  assert(tokensCss.includes('@media (prefers-color-scheme: dark)'), 'tokens.css includes dark mode media query');
  assert(tokensCss.includes(':host([data-theme="dark"])'), 'tokens.css includes dark mode host attribute selector');

  const tokensJs = readFileSync(join(tokensOutDir, 'tokens.js'), 'utf8');
  assert(tokensJs.includes('export const themes ='), 'tokens.js exports multi-theme dictionary object');

  const tokensDts = readFileSync(join(tokensOutDir, 'tokens.d.ts'), 'utf8');
  assert(tokensDts.includes('export declare const themes:'), 'tokens.d.ts strongly types themes dictionary');

  const pkgJson = JSON.parse(readFileSync(join(tokensOutDir, 'package.json'), 'utf8'));
  assert(pkgJson.name === '@tokens', 'package.json has name @tokens');
  assert(pkgJson.exports['./css'] === './tokens.css', 'package.json maps ./css export');

  const elapsed = Date.now() - startTime;
  console.log(`\n================================================================`);
  if (failures === 0) {
    console.log(`[smoke] SUCCESS: All 18 checks passed in ${elapsed}ms!`);
  } else {
    console.error(`[smoke] FAILED: ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log(`================================================================`);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
