import assert from 'node:assert/strict';
import console from 'node:console';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runRoute } from '../src/skills/ask-kami/scripts/route.ts';
import { runAudit } from '../src/skills/token-audit/scripts/audit.ts';
import { runGenerate } from '../src/skills/token-math/scripts/generate.ts';

const exampleSpec = 'src/skills/token-style/assets/style-spec.example.json';

test('runRoute returns 0 and prints missing spec state on empty directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'route-empty-'));
  try {
    let output = '';
    const originalLog = console.log;
    console.log = (msg) => {
      output += `${msg}\n`;
    };
    try {
      assert.equal(runRoute(['--root', dir]), 0);
    } finally {
      console.log = originalLog;
    }
    assert.match(output, /^next: token-style$/m);
    assert.match(
      output,
      /next: token-extract — node .*extract\.mjs --root \. --out style-spec\.json/,
    );
    assert.doesNotMatch(output, /node \.\/scripts/);
    assert.doesNotMatch(output, /token-style — .*generate\.mjs/);
    assert.equal(runRoute(['--root', dir, '--json']), 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runRoute detects generated tree and suggests next action', () => {
  const dir = mkdtempSync(join(tmpdir(), 'route-tokens-'));
  try {
    const specPath = join(dir, 'style-spec.json');
    writeFileSync(specPath, readFileSync(exampleSpec, 'utf8'), 'utf8');
    const tokensDir = join(dir, 'tokens');
    assert.equal(runGenerate(['--spec', specPath, '--out', tokensDir]), 0);

    // Audit stamp is missing -> next action is token-audit
    assert.equal(runRoute(['--root', dir]), 0);

    // Audit passes -> next action is token-build
    assert.equal(runAudit(['--tokens', tokensDir, '--spec', specPath]), 0);
    assert.equal(runRoute(['--root', dir]), 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runRoute detects shadow-dom and tailors token-build command with --selector', () => {
  const dir = mkdtempSync(join(tmpdir(), 'route-shadow-'));
  try {
    const specPath = join(dir, 'style-spec.json');
    writeFileSync(specPath, readFileSync(exampleSpec, 'utf8'), 'utf8');
    const tokensDir = join(dir, 'tokens');
    runGenerate(['--spec', specPath, '--out', tokensDir]);
    runAudit(['--tokens', tokensDir, '--spec', specPath]);

    // Create a Web Component source file using :host
    writeFileSync(join(dir, 'hud.ts'), ':host { display: block; color: #fff; }', 'utf8');

    let output = '';
    const originalLog = console.log;
    console.log = (msg) => {
      output += `${msg}\n`;
    };
    try {
      assert.equal(runRoute(['--root', dir]), 0);
    } finally {
      console.log = originalLog;
    }

    assert.match(output, /context=brownfield runtime=shadow-dom/);
    assert.match(output, /--selector ":host, :root"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runRoute with --scaffold creates toolchain companion files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'route-scaffold-'));
  try {
    const code = runRoute([
      '--root',
      dir,
      '--scaffold',
      '--formatter',
      'prettier',
      '--linter',
      'stylelint',
      '--css',
      'tailwind',
    ]);
    assert.equal(code, 0);

    const prettierConfig = JSON.parse(readFileSync(join(dir, '.prettierrc.json'), 'utf8'));
    assert.equal(prettierConfig.semi, true);

    const stylelintConfig = JSON.parse(readFileSync(join(dir, '.stylelintrc.json'), 'utf8'));
    assert.equal(stylelintConfig.rules['color-no-hex'], true);

    const tailwindImport = readFileSync(join(dir, 'theme.import.css'), 'utf8');
    assert.ok(tailwindImport.includes('@import "tailwindcss";'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
