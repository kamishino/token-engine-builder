#!/usr/bin/env node
/**
 * Standalone smoke test: simulates an autonomous AI Agent using the
 * flagship `design-tokens` skill in an isolated brownfield monorepo workspace.
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
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
      join(tempDir, 'tokens.config.json'),
      '--audit-baseline',
      '--force',
    ],
    { cwd: tempDir, encoding: 'utf8' },
  );
  assert(existsSync(join(tempDir, 'tokens.config.json')), 'emits candidate tokens.config.json');
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
      join(tempDir, 'tokens.config.json'),
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

  // Phase 5: setup-pre-tokens Seam & Standalone Engine Lane Verification
  console.log('\n[Phase 5] setup-pre-tokens Seam & Standalone Engine Lane');
  const setupTempDir = mkdtempSync(join(tmpdir(), 'smoke-setup-seam-'));
  const standaloneSkillDir = mkdtempSync(join(tmpdir(), 'smoke-dt-standalone-'));
  try {
    // 1. Copy dist/design-tokens to standalone dir (no sibling skills)
    const distDt = join(root, 'dist', 'design-tokens');
    cpSync(distDt, standaloneSkillDir, { recursive: true });
    const standaloneCli = join(standaloneSkillDir, 'scripts', 'token-engine.mjs');
    assert(existsSync(standaloneCli), 'standalone skill contains scripts/token-engine.mjs');
    assert(existsSync(join(standaloneSkillDir, 'templates', 'tokens')), 'standalone skill contains templates/tokens');

    // 2. Scaffold setup-pre-tokens seeded project
    const templatesDir = join(root, 'src', 'skills', 'setup-pre-tokens', 'templates');
    writeFileSync(
      join(setupTempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'setup-seeded-consumer',
          private: true,
          type: 'module',
          scripts: {
            'tokens:build':
              'style-dictionary build --config sd.config.mjs && style-dictionary build --config sd.dark.config.mjs',
            'lint:styles': 'stylelint "src/styles/**/*.scss"',
          },
        },
        null,
        2,
      ),
      'utf8',
    );
    writeFileSync(
      join(setupTempDir, '.prettierrc.json'),
      readFileSync(join(templatesDir, 'configs/.prettierrc.json'), 'utf8'),
    );
    writeFileSync(
      join(setupTempDir, '.prettierignore'),
      readFileSync(join(templatesDir, 'configs/.prettierignore'), 'utf8').replaceAll('__STYLES_ROOT__', 'src/styles'),
    );
    writeFileSync(
      join(setupTempDir, 'stylelint.config.mjs'),
      readFileSync(join(templatesDir, 'configs/stylelint.config.mjs'), 'utf8').replaceAll('__STYLES_ROOT__', 'src/styles'),
    );
    writeFileSync(
      join(setupTempDir, 'sd.config.mjs'),
      readFileSync(join(templatesDir, 'configs/sd.config.mjs'), 'utf8').replaceAll('__STYLES_ROOT__', 'src/styles'),
    );
    writeFileSync(
      join(setupTempDir, 'sd.dark.config.mjs'),
      readFileSync(join(templatesDir, 'configs/sd.dark.config.mjs'), 'utf8'),
    );

    cpSync(join(templatesDir, 'tokens'), join(setupTempDir, 'tokens'), { recursive: true });
    cpSync(join(templatesDir, 'styles'), join(setupTempDir, 'src/styles'), { recursive: true });
    writeFileSync(
      join(setupTempDir, 'src/styles/README.md'),
      readFileSync(join(templatesDir, 'target-README.md'), 'utf8'),
    );

    // 3. Cognitive-lane spot check before sync: edit light semantic alias and compile with target SD bin
    const sdBin = join(root, 'node_modules', 'style-dictionary', 'bin', 'style-dictionary.js');
    const lightPath = join(setupTempDir, 'tokens', 'semantic', 'light.tokens.json');
    const lightJson = JSON.parse(readFileSync(lightPath, 'utf8'));
    lightJson.semantic.color.action.primary.$value = '{color.primary.700}';
    writeFileSync(lightPath, JSON.stringify(lightJson, null, 2), 'utf8');

    execFileSync(process.execPath, [sdBin, 'build', '--config', 'sd.config.mjs'], { cwd: setupTempDir, stdio: 'pipe' });
    execFileSync(process.execPath, [sdBin, 'build', '--config', 'sd.dark.config.mjs'], { cwd: setupTempDir, stdio: 'pipe' });
    const initialBuiltCss = readFileSync(join(setupTempDir, 'build/tokens.css'), 'utf8');
    assert(
      initialBuiltCss.includes('--semantic-color-action-primary: var(--color-primary-700);'),
      'cognitive fallback: hand-edit semantic alias builds cleanly via target SD',
    );

    // 4. Formulate tokens.config.json and run standalone token-engine sync
    const validSpec = {
      name: 'brand-tokens',
      palette: [
        { role: 'primary', name: 'cerulean', anchor: { l: 0.6, c: 0.15, h: 250 } },
        { role: 'secondary', name: 'amethyst', anchor: { l: 0.6, c: 0.12, h: 285 } },
        { role: 'accent', name: 'sky', anchor: { l: 0.6, c: 0.1, h: 215 } },
      ],
      typography: {
        baseSizePx: 16,
        ratio: 1.25,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
    };
    writeFileSync(join(setupTempDir, 'tokens.config.json'), JSON.stringify(validSpec, null, 2), 'utf8');

    const syncSeamOut = execFileSync(
      process.execPath,
      [standaloneCli, 'sync', '--spec', 'tokens.config.json', '--force', '--out', 'build/engine', '--theme', 'all'],
      { cwd: setupTempDir, encoding: 'utf8' },
    );
    assert(syncSeamOut.includes('pipeline complete'), 'standalone sync completes cleanly on setup-seeded project');
    assert(existsSync(join(setupTempDir, 'tokens/.token-engine-audit.json')), 'sync writes audit stamp');
    assert(existsSync(join(setupTempDir, 'build/engine/tokens.css')), 'sync parks engine outputs under build/engine');
    assert(
      existsSync(join(setupTempDir, 'tokens/semantic/high-contrast.tokens.json')),
      'sync generates high-contrast theme via bundled templates',
    );

    // 5. Run target Style Dictionary build on generated DTCG object tokens
    execFileSync(process.execPath, [sdBin, 'build', '--config', 'sd.config.mjs'], { cwd: setupTempDir, stdio: 'pipe' });
    execFileSync(process.execPath, [sdBin, 'build', '--config', 'sd.dark.config.mjs'], { cwd: setupTempDir, stdio: 'pipe' });

    const postSyncCss = readFileSync(join(setupTempDir, 'build/tokens.css'), 'utf8');
    assert(/oklch\(\d+(\.\d+)?%/.test(postSyncCss), 'target SD transforms DTCG color objects to oklch(...) strings');
    assert(!postSyncCss.includes('[object Object]'), 'target SD output contains zero [object Object] artifacts');

    const postSyncVars = readFileSync(join(setupTempDir, 'src/styles/abstracts/_variables.scss'), 'utf8');
    assert(
      postSyncVars.includes('$semantic-color-feedback-success-bg:'),
      '_variables.scss regenerated with generated feedback tokens',
    );
  } finally {
    rmSync(setupTempDir, { recursive: true, force: true });
    rmSync(standaloneSkillDir, { recursive: true, force: true });
  }

  const elapsed = Date.now() - startTime;
  console.log(`\n================================================================`);
  if (failures === 0) {
    console.log(`[smoke] SUCCESS: All 26 checks passed in ${elapsed}ms!`);
  } else {
    console.error(`[smoke] FAILED: ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log(`================================================================`);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
