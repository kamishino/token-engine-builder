#!/usr/bin/env node
/**
 * Standalone smoke-test harness: runs 39 end-to-end scenarios against
 * freshly built dist/ skill copies in an isolated temporary install root.
 */
import { spawn, spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const SKILLS = [
  'ask-kami',
  'improve-design-system',
  'token-audit',
  'token-build',
  'token-extract',
  'token-math',
  'token-style',
];

if (!existsSync(distDir)) {
  console.error('dist/ directory missing; run npm run build first');
  process.exit(1);
}

for (const skill of SKILLS) {
  if (!existsSync(join(distDir, skill))) {
    console.error(`dist/${skill} missing; run npm run build first`);
    process.exit(1);
  }
}

const tempRoot = mkdtempSync(join(tmpdir(), 'token-engine-smoke-'));
const skillsRoot = join(tempRoot, 'skills');
const workRoot = join(tempRoot, 'work');

mkdirSync(skillsRoot, { recursive: true });
mkdirSync(workRoot, { recursive: true });

// 1. Copy each built skill into the temp install root
for (const skill of SKILLS) {
  cpSync(join(distDir, skill), join(skillsRoot, skill), { recursive: true });
}

// 2. Link Playwright packages so copied token-extract can resolve its dynamic import
const tempNodeModules = join(tempRoot, 'node_modules');
mkdirSync(tempNodeModules, { recursive: true });
for (const pkg of ['playwright', 'playwright-core']) {
  const pkgSrc = join(root, 'node_modules', pkg);
  if (existsSync(pkgSrc)) {
    try {
      symlinkSync(
        pkgSrc,
        join(tempNodeModules, pkg),
        process.platform === 'win32' ? 'junction' : 'dir',
      );
    } catch {
      // Junction exists or permission error; continue
    }
  }
}

function scriptPath(skill, scriptName) {
  return join(skillsRoot, skill, 'scripts', scriptName);
}

function run(skill, scriptName, args, cwd) {
  const res = spawnSync(process.execPath, [scriptPath(skill, scriptName), ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
  return {
    code: res.status ?? 1,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
  };
}

function runAsync(skill, scriptName, args, cwd) {
  return new Promise((resolveResult) => {
    const child = spawn(process.execPath, [scriptPath(skill, scriptName), ...args], {
      cwd,
      env: { ...process.env, NO_COLOR: '1' },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('close', (code) => {
      resolveResult({
        code: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

function work(id) {
  const dir = join(workRoot, id);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function expectExit(res, expected, label) {
  if (res.code !== expected) {
    const tail = (res.stderr || res.stdout).slice(-400).trim();
    throw new Error(`${label}: exit ${res.code} (wanted ${expected})\n${tail}`);
  }
}

function expectContains(text, needle, label) {
  if (!text.includes(needle)) {
    throw new Error(`${label}: expected text to include "${needle}"\nactual: ${text.slice(-300)}`);
  }
}

function expectNotContains(text, needle, label) {
  if (text.includes(needle)) {
    throw new Error(
      `${label}: expected text NOT to include "${needle}"\nactual: ${text.slice(-300)}`,
    );
  }
}

function expectClose(actual, expected, tol, label) {
  if (Math.abs(actual - expected) > tol) {
    throw new Error(`${label}: ${actual} not within ${tol} of ${expected}`);
  }
}

function expectFile(path, label) {
  if (!existsSync(path)) {
    throw new Error(`${label}: file missing: ${path}`);
  }
}

let seedDir = null;
let seedOk = false;

const CASES = [
  // --- Packaging & Help ---
  {
    id: 'P1',
    title: 'packaging: all copied skills --help',
    run: async () => {
      const scripts = [
        ['ask-kami', 'route.mjs'],
        ['improve-design-system', 'diagnose.mjs'],
        ['token-audit', 'audit.mjs'],
        ['token-build', 'build.mjs'],
        ['token-build', 'figma.mjs'],
        ['token-extract', 'extract.mjs'],
        ['token-math', 'generate.mjs'],
      ];
      const dir = work('P1');
      for (const [skill, script] of scripts) {
        const res = run(skill, script, ['--help'], dir);
        expectExit(res, 0, `${skill}/${script} --help`);
        expectContains(res.stdout, 'Usage:', `${skill}/${script} usage`);
        expectContains(res.stdout, script, `${skill}/${script} script name`);
      }
    },
  },
  {
    id: 'P2',
    title: 'packaging: token-style assets',
    run: async () => {
      const sDir = join(skillsRoot, 'token-style');
      expectFile(join(sDir, 'SKILL.md'), 'SKILL.md');
      const example = readJson(join(sDir, 'assets/style-spec.example.json'));
      const primaries = example.palette.filter((p) => p.role === 'primary');
      if (primaries.length !== 1) {
        throw new Error(`expected 1 primary in example spec, found ${primaries.length}`);
      }
      const compact = readJson(join(sDir, 'examples/style-spec.compact.json'));
      if (compact.rampSteps !== 9) {
        throw new Error(`expected rampSteps 9 in compact spec, found ${compact.rampSteps}`);
      }
      for (const ref of [
        'style-clusters.md',
        'design-mappings.md',
        'color-naming.md',
        'discovery-checklist.md',
      ]) {
        expectFile(join(sDir, 'references', ref), `references/${ref}`);
      }
    },
  },

  // --- Pipeline Seed ---
  {
    id: 'S1',
    title: 'pipeline seed (generate -> audit -> build light/dark -> route/diagnose)',
    run: async () => {
      const dir = work('seed');
      cpSync(
        join(skillsRoot, 'token-style/assets/style-spec.example.json'),
        join(dir, 'style-spec.json'),
      );

      // 1. generate
      const genRes = run(
        'token-math',
        'generate.mjs',
        ['--spec', 'style-spec.json', '--out', 'tokens'],
        dir,
      );
      expectExit(genRes, 0, 'seed generate');
      expectFile(join(dir, 'tokens/primitive/color.tokens.json'), 'seed primitive tokens');
      expectFile(join(dir, 'tokens/.token-engine-tokens-manifest.json'), 'seed manifest');

      // 2. audit
      const auditRes = run(
        'token-audit',
        'audit.mjs',
        ['--tokens', 'tokens', '--spec', 'style-spec.json'],
        dir,
      );
      expectExit(auditRes, 0, 'seed audit');
      expectContains(auditRes.stdout, 'audit PASS', 'seed audit pass');
      expectContains(auditRes.stdout, '[light]', 'seed audit light');
      expectContains(auditRes.stdout, '[dark]', 'seed audit dark');
      expectContains(auditRes.stdout, '[high-contrast]', 'seed audit hc');
      expectFile(join(dir, 'tokens/.token-engine-audit.json'), 'seed audit stamp');

      // 3. build light
      const buildRes = run(
        'token-build',
        'build.mjs',
        ['--tokens', 'tokens', '--out', 'build', '--theme', 'light', '--spec', 'style-spec.json'],
        dir,
      );
      expectExit(buildRes, 0, 'seed build light');
      for (const art of ['tokens.css', 'theme.css', 'components.md', 'DESIGN.md']) {
        expectFile(join(dir, 'build', art), `seed build ${art}`);
      }
      const tokensCss = readFileSync(join(dir, 'build/tokens.css'), 'utf8');
      expectContains(tokensCss, 'oklch(', 'tokens.css oklch');
      const themeCss = readFileSync(join(dir, 'build/theme.css'), 'utf8');
      expectContains(themeCss, '@theme', 'theme.css @theme');
      const comps = readFileSync(join(dir, 'build/components.md'), 'utf8');
      expectContains(comps, '## button', 'components.md button');
      expectContains(comps, '## Composite patterns', 'components.md composite');
      const design = readFileSync(join(dir, 'build/DESIGN.md'), 'utf8');
      expectContains(design, 'primary: "#2784d5"', 'DESIGN.md primary');

      // 4. build dark
      const darkRes = run(
        'token-build',
        'build.mjs',
        [
          '--tokens',
          'tokens',
          '--out',
          'build/dark',
          '--theme',
          'dark',
          '--spec',
          'style-spec.json',
        ],
        dir,
      );
      expectExit(darkRes, 0, 'seed build dark');
      expectFile(join(dir, 'build/dark/tokens.css'), 'seed dark tokens.css');

      // 5. route
      const routeRes = run('ask-kami', 'route.mjs', ['--root', '.'], dir);
      expectExit(routeRes, 0, 'seed route');
      expectContains(
        routeRes.stdout,
        'state: spec=valid tokens=present audit=pass build=present',
        'seed route state',
      );
      expectContains(routeRes.stdout, 'next: improve-design-system', 'seed route next');

      // 6. diagnose
      const diagRes = run('improve-design-system', 'diagnose.mjs', ['--root', '.'], dir);
      expectExit(diagRes, 0, 'seed diagnose');
      const diagJson = JSON.parse(diagRes.stdout);
      const errors = diagJson.findings.filter((f) => f.severity === 'error');
      if (errors.length > 0) {
        throw new Error(
          `seed diagnose had unexpected errors: ${errors.map((e) => e.id).join(', ')}`,
        );
      }
      if (diagJson.nextActions[0]?.skill !== 'improve-design-system') {
        throw new Error(`seed diagnose unexpected nextAction: ${diagJson.nextActions[0]?.skill}`);
      }

      seedDir = dir;
      seedOk = true;
    },
  },

  // --- Extract Scenarios ---
  {
    id: 'E1',
    title: 'extract: empty input/',
    run: async () => {
      const dir = work('E1');
      mkdirSync(join(dir, 'input'), { recursive: true });
      const res = run(
        'token-extract',
        'extract.mjs',
        ['--root', 'input', '--out', 'style-spec.json'],
        dir,
      );
      expectExit(res, 1, 'empty extract');
      expectContains(
        res.stderr,
        'no color signals found — fall back to the token-style interview',
        'empty extract stderr',
      );
      if (existsSync(join(dir, 'style-spec.json'))) {
        throw new Error('style-spec.json should not exist for empty extraction');
      }
    },
  },
  {
    id: 'E2',
    title: 'extract: css-theme',
    run: async () => {
      const dir = work('E2');
      const input = join(dir, 'input');
      mkdirSync(input, { recursive: true });
      writeFileSync(
        join(input, 'theme.css'),
        `@theme {
  --color-primary: oklch(60% 0.15 250);
  --color-secondary: oklch(60% 0.1275 285);
  --color-accent: oklch(60% 0.1275 215);
}
body { font-family: "Inter", system-ui, sans-serif; border-radius: 8px; }`,
        'utf8',
      );
      const res = run(
        'token-extract',
        'extract.mjs',
        ['--root', 'input', '--out', 'style-spec.json'],
        dir,
      );
      expectExit(res, 0, 'css-theme extract');
      const spec = readJson(join(dir, 'style-spec.json'));
      const roles = spec.palette.map((p) => p.role);
      if (JSON.stringify(roles) !== JSON.stringify(['primary', 'secondary', 'accent'])) {
        throw new Error(`expected [primary, secondary, accent], got ${JSON.stringify(roles)}`);
      }
      expectClose(spec.palette[0].anchor.l, 0.6, 0.01, 'primary L');
      expectClose(spec.palette[0].anchor.c, 0.15, 0.01, 'primary C');
      expectClose(spec.palette[0].anchor.h, 250, 1.0, 'primary H');
      expectClose(spec.palette[1].anchor.h, 285, 1.0, 'secondary H');
      expectClose(spec.palette[2].anchor.h, 215, 1.0, 'accent H');
      if (spec.harmony !== undefined) {
        throw new Error(`expected harmony undefined, got ${spec.harmony}`);
      }
      if (spec.typography?.fontFamily !== 'Inter, system-ui, sans-serif') {
        throw new Error(`unexpected font: ${spec.typography?.fontFamily}`);
      }
      if (spec.radius?.md !== 8) {
        throw new Error(`unexpected radius md: ${spec.radius?.md}`);
      }
    },
  },
  {
    id: 'E3',
    title: 'extract: tailwind-v3',
    run: async () => {
      const dir = work('E3');
      const input = join(dir, 'input');
      mkdirSync(input, { recursive: true });
      writeFileSync(
        join(input, 'tailwind.config.js'),
        "module.exports = { theme: { extend: { colors: { primary: { 500: '#2563eb' }, secondary: '#7c3aed' } } } };",
        'utf8',
      );
      const res = run(
        'token-extract',
        'extract.mjs',
        ['--root', 'input', '--out', 'style-spec.json'],
        dir,
      );
      expectExit(res, 0, 'tailwind-v3 extract');
      const spec = readJson(join(dir, 'style-spec.json'));
      const roles = spec.palette.map((p) => p.role);
      if (!roles.includes('primary') || !roles.includes('secondary') || !roles.includes('accent')) {
        throw new Error(`expected 3 roles including primary, secondary, accent; got ${roles}`);
      }
      expectClose(spec.palette[0].anchor.h, 262.9, 2.0, 'primary hue');
      expectClose(spec.palette[1].anchor.h, 293.0, 2.0, 'secondary hue');
      if (spec.harmony !== 'analogous') {
        throw new Error(`expected harmony analogous, got ${spec.harmony}`);
      }
    },
  },
  {
    id: 'E4',
    title: 'extract: design.md',
    run: async () => {
      const dir = work('E4');
      const input = join(dir, 'input');
      mkdirSync(input, { recursive: true });
      cpSync(join(skillsRoot, 'token-extract/examples/DESIGN.md'), join(input, 'DESIGN.md'));
      const res = run(
        'token-extract',
        'extract.mjs',
        ['--root', 'input', '--out', 'style-spec.json'],
        dir,
      );
      expectExit(res, 0, 'design.md extract');
      expectContains(res.stdout, 'frontmatter: colors.primary', 'frontmatter note');
      const spec = readJson(join(dir, 'style-spec.json'));
      expectClose(spec.palette[0].anchor.h, 46.23, 2.0, 'primary H');
      expectClose(spec.palette[1].anchor.h, 188.4, 2.0, 'secondary H (should be ~188.4 cyan)');
      if (spec.harmony !== 'analogous') {
        throw new Error(`expected harmony analogous, got ${spec.harmony}`);
      }
      if (spec.typography?.fontFamily !== 'Fraunces, Georgia, serif') {
        throw new Error(`unexpected font: ${spec.typography?.fontFamily}`);
      }
      expectClose(spec.typography?.ratio, 1.333, 0.01, 'type ratio');
      if (spec.radius?.md !== 10) {
        throw new Error(`unexpected radius md: ${spec.radius?.md}`);
      }
      if (spec.density !== 'comfortable') {
        throw new Error(`unexpected density: ${spec.density}`);
      }
    },
  },
  {
    id: 'E5',
    title: 'extract: page.html',
    run: async () => {
      const dir = work('E5');
      const input = join(dir, 'input');
      mkdirSync(input, { recursive: true });
      writeFileSync(
        join(input, 'page.html'),
        '<html style="font-family: Fraunces, serif; background:#fdf6ec; color:#b3541e"><body><h1>Hi</h1></body></html>',
        'utf8',
      );
      const res = run(
        'token-extract',
        'extract.mjs',
        ['--html', 'input/page.html', '--out', 'style-spec.json'],
        dir,
      );
      expectExit(res, 0, 'html extract');
      const spec = readJson(join(dir, 'style-spec.json'));
      if (spec.palette.length < 2) {
        throw new Error(`expected at least 2 palette entries, got ${spec.palette.length}`);
      }
      const hasAmber = spec.palette.some((p) => Math.abs(p.anchor.h - 46.23) < 3.0);
      if (!hasAmber) {
        throw new Error('expected an anchor near hue 46.23 in palette');
      }
      if (!spec.typography?.fontFamily?.startsWith('Fraunces')) {
        throw new Error(
          `expected fontFamily starting with Fraunces, got ${spec.typography?.fontFamily}`,
        );
      }
    },
  },
  {
    id: 'E6',
    title: 'extract: URL',
    run: async () => {
      const dir = work('E6');
      const htmlContent =
        '<html style="font-family: Fraunces, serif; background:#fdf6ec; color:#b3541e"><body><h1>Hi</h1></body></html>';
      const server = createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlContent);
      });
      await new Promise((resolveListening) => {
        server.listen(0, '127.0.0.1', () => resolveListening());
      });
      const port = server.address().port;
      const url = `http://127.0.0.1:${port}/`;

      try {
        const res = await runAsync(
          'token-extract',
          'extract.mjs',
          ['--url', url, '--out', 'style-spec.json'],
          dir,
        );
        expectExit(res, 0, 'url extract');
        expectContains(res.stdout, 'evidence:', 'url evidence stdout');
        expectContains(res.stdout, `http://127.0.0.1:${port}`, 'url source in evidence');
        const spec = readJson(join(dir, 'style-spec.json'));
        if (spec.palette.length < 2) {
          throw new Error(`expected at least 2 palette entries, got ${spec.palette.length}`);
        }
        if (!spec.typography?.fontFamily?.startsWith('Fraunces')) {
          throw new Error(`expected font Fraunces, got ${spec.typography?.fontFamily}`);
        }
      } finally {
        await new Promise((resolveClosed) => server.close(resolveClosed));
      }
    },
  },
  {
    id: 'E7',
    title: 'extract: overwrite / dry-run',
    run: async () => {
      const dir = work('E7');
      const input = join(dir, 'input');
      mkdirSync(input, { recursive: true });
      writeFileSync(join(input, 'theme.css'), '@theme { --color-primary: #123456; }', 'utf8');

      // 1. First run creates style-spec.json
      const res1 = run(
        'token-extract',
        'extract.mjs',
        ['--root', 'input', '--out', 'style-spec.json'],
        dir,
      );
      expectExit(res1, 0, 'extract first');

      // 2. Second run without --force refuses
      const res2 = run(
        'token-extract',
        'extract.mjs',
        ['--root', 'input', '--out', 'style-spec.json'],
        dir,
      );
      expectExit(res2, 1, 'extract second no force');
      expectContains(res2.stderr, 'output exists:', 'output exists refusal');

      // 3. Dry-run writes nothing
      const resDry = run(
        'token-extract',
        'extract.mjs',
        ['--root', 'input', '--out', 'dry.json', '--dry-run'],
        dir,
      );
      expectExit(resDry, 0, 'extract dry-run');
      const parsedDry = JSON.parse(resDry.stdout);
      if (!parsedDry.spec) {
        throw new Error('dry-run output missing spec object');
      }
      if (existsSync(join(dir, 'dry.json'))) {
        throw new Error('dry.json should not be written during dry-run');
      }

      // 4. Force overwrites
      const resForce = run(
        'token-extract',
        'extract.mjs',
        ['--root', 'input', '--out', 'style-spec.json', '--force'],
        dir,
      );
      expectExit(resForce, 0, 'extract force');
    },
  },
  {
    id: 'E8',
    title: 'extract: missing inputs',
    run: async () => {
      const dir = work('E8');
      const resRoot = run('token-extract', 'extract.mjs', ['--root', 'missing-dir'], dir);
      expectExit(resRoot, 1, 'missing root');
      expectContains(resRoot.stderr, 'root not found', 'root not found error');

      const resHtml = run('token-extract', 'extract.mjs', ['--html', 'missing.html'], dir);
      expectExit(resHtml, 1, 'missing html');
      expectContains(resHtml.stderr, 'html file not found', 'html not found error');
    },
  },

  // --- Math Scenarios ---
  {
    id: 'M1',
    title: 'math: compact spec 9-step ramp',
    run: async () => {
      const dir = work('M1');
      cpSync(
        join(skillsRoot, 'token-style/examples/style-spec.compact.json'),
        join(dir, 'spec.json'),
      );
      const res = run(
        'token-math',
        'generate.mjs',
        ['--spec', 'spec.json', '--out', 'tokens'],
        dir,
      );
      expectExit(res, 0, 'compact generate');
      const prim = readJson(join(dir, 'tokens/primitive/color.tokens.json'));
      // Pick first palette slug ramp under color (e.g. fern)
      const slugKey = Object.keys(prim.color).find(
        (k) => prim.color[k]['50'] || prim.color[k]['100'],
      );
      const stepCount = Object.keys(prim.color[slugKey]).length;
      if (stepCount !== 9) {
        throw new Error(`expected 9 step keys for ramp ${slugKey}, found ${stepCount}`);
      }
    },
  },
  {
    id: 'M2',
    title: 'math: custom theme',
    run: async () => {
      const dir = work('M2');
      const spec = readJson(join(skillsRoot, 'token-style/examples/style-spec.compact.json'));
      spec.themes = {
        midnight: { mode: 'dark', surfaceSteps: { canvas: 100 }, actionStep: 50 },
      };
      writeJson(join(dir, 'custom.json'), spec);

      const genRes = run(
        'token-math',
        'generate.mjs',
        ['--spec', 'custom.json', '--out', 'tokens'],
        dir,
      );
      expectExit(genRes, 0, 'custom theme generate');
      expectFile(join(dir, 'tokens/semantic/midnight.tokens.json'), 'midnight.tokens.json');

      const buildRes = run(
        'token-build',
        'build.mjs',
        [
          '--tokens',
          'tokens',
          '--out',
          'build-midnight',
          '--theme',
          'midnight',
          '--allow-unaudited',
        ],
        dir,
      );
      expectExit(buildRes, 0, 'custom theme build');
      expectFile(join(dir, 'build-midnight/tokens.css'), 'build-midnight/tokens.css');
    },
  },
  {
    id: 'M3',
    title: 'math: guards (exists, dry-run, tamper force)',
    run: async () => {
      const dir = work('M3');
      cpSync(
        join(skillsRoot, 'token-style/examples/style-spec.compact.json'),
        join(dir, 'spec.json'),
      );

      // 1. First generate
      const res1 = run(
        'token-math',
        'generate.mjs',
        ['--spec', 'spec.json', '--out', 'tokens'],
        dir,
      );
      expectExit(res1, 0, 'generate 1');

      // 2. Second without --force
      const res2 = run(
        'token-math',
        'generate.mjs',
        ['--spec', 'spec.json', '--out', 'tokens'],
        dir,
      );
      expectExit(res2, 1, 'generate exists');
      expectContains(res2.stderr, 'output exists:', 'output exists refusal');

      // 3. Dry-run
      const resDry = run(
        'token-math',
        'generate.mjs',
        ['--spec', 'spec.json', '--out', 'dry', '--dry-run'],
        dir,
      );
      expectExit(resDry, 0, 'generate dry');
      if (existsSync(join(dir, 'dry'))) {
        throw new Error('dry directory should not be created');
      }

      // 4. Tamper file and attempt generate without force
      const lightFile = join(dir, 'tokens/semantic/light.tokens.json');
      const lightData = readJson(lightFile);
      lightData.semantic.color.text.tertiary.$value = '{color.neutral.50}';
      writeJson(lightFile, lightData);

      const resTamper = run(
        'token-math',
        'generate.mjs',
        ['--spec', 'spec.json', '--out', 'tokens'],
        dir,
      );
      expectExit(resTamper, 1, 'generate tamper refuse');
      expectContains(
        resTamper.stderr,
        'refusing to overwrite hand-edited tokens',
        'tamper refusal text',
      );

      // 5. Force overwrites
      const resForce = run(
        'token-math',
        'generate.mjs',
        ['--spec', 'spec.json', '--out', 'tokens', '--force'],
        dir,
      );
      expectExit(resForce, 0, 'generate force');
    },
  },
  {
    id: 'M4',
    title: 'math: bad input (missing & invalid spec)',
    run: async () => {
      const dir = work('M4');
      const resMissing = run(
        'token-math',
        'generate.mjs',
        ['--spec', 'nope.json', '--out', 'tokens'],
        dir,
      );
      expectExit(resMissing, 1, 'missing spec');
      expectContains(resMissing.stderr, 'style-spec not found:', 'missing spec stderr');

      const badSpec = readJson(join(skillsRoot, 'token-style/examples/style-spec.compact.json'));
      badSpec.palette.push({
        role: 'primary',
        name: 'red',
        anchor: { l: 0.5, c: 0.1, h: 20, alpha: 1 },
      });
      writeJson(join(dir, 'bad.json'), badSpec);

      const resBad = run(
        'token-math',
        'generate.mjs',
        ['--spec', 'bad.json', '--out', 'tokens'],
        dir,
      );
      expectExit(resBad, 1, 'invalid spec');
      expectContains(
        resBad.stderr,
        'palette must contain exactly one primary color',
        'invalid spec stderr',
      );
    },
  },

  // --- Audit Scenarios ---
  {
    id: 'A1',
    title: 'audit: pass',
    requiresSeed: true,
    run: async () => {
      const dir = work('A1');
      cpSync(seedDir, dir, { recursive: true });
      const res = run(
        'token-audit',
        'audit.mjs',
        ['--tokens', 'tokens', '--spec', 'style-spec.json'],
        dir,
      );
      expectExit(res, 0, 'audit pass');
      expectContains(res.stdout, 'audit PASS', 'audit pass label');
      expectContains(res.stdout, '[light]', 'audit light header');
      expectContains(res.stdout, '[dark]', 'audit dark header');
      expectContains(res.stdout, '[high-contrast]', 'audit hc header');
      expectFile(join(dir, 'tokens/.token-engine-audit.json'), 'audit stamp');
    },
  },
  {
    id: 'A2',
    title: 'audit: JSON format',
    requiresSeed: true,
    run: async () => {
      const dir = work('A2');
      cpSync(seedDir, dir, { recursive: true });
      const res = run(
        'token-audit',
        'audit.mjs',
        ['--tokens', 'tokens', '--spec', 'style-spec.json', '--json'],
        dir,
      );
      expectExit(res, 0, 'audit json');
      const json = JSON.parse(res.stdout);
      if (json.pass !== true) throw new Error('expected json.pass === true');
      if (json.specBinding !== 'match')
        throw new Error(`expected specBinding match, got ${json.specBinding}`);
      const themes = Object.keys(json.themes);
      if (themes.length !== 3) throw new Error(`expected 3 themes, got ${themes.length}`);
      for (const t of themes) {
        if (json.themes[t].pairs.length !== 42) {
          throw new Error(`theme ${t} has ${json.themes[t].pairs.length} pairs, expected 42`);
        }
      }
    },
  },
  {
    id: 'A3',
    title: 'audit: low contrast override',
    run: async () => {
      const dir = work('A3');
      const spec = readJson(join(skillsRoot, 'token-style/assets/style-spec.example.json'));
      spec.overrides = {
        light: {
          'semantic.color.text.tertiary': '{color.neutral.200}',
        },
      };
      writeJson(join(dir, 'low.json'), spec);

      run('token-math', 'generate.mjs', ['--spec', 'low.json', '--out', 'tokens'], dir);
      const res = run(
        'token-audit',
        'audit.mjs',
        ['--tokens', 'tokens', '--spec', 'low.json'],
        dir,
      );
      expectExit(res, 1, 'audit low contrast');
      expectContains(res.stdout, 'audit FAIL', 'audit FAIL label');
      expectContains(res.stdout, 'FAIL  1.35:1', 'FAIL pair line');
      expectContains(
        res.stdout,
        'remedy: semantic.color.text.tertiary → {color.neutral.600}',
        'remedy line',
      );
      if (existsSync(join(dir, 'tokens/.token-engine-audit.json'))) {
        throw new Error('audit stamp must not exist on failed audit');
      }
    },
  },
  {
    id: 'A4',
    title: 'audit: theme filter and floor enforcement',
    requiresSeed: true,
    run: async () => {
      const dir = work('A4');
      cpSync(seedDir, dir, { recursive: true });

      // 1. Single theme light
      const resLight = run(
        'token-audit',
        'audit.mjs',
        ['--tokens', 'tokens', '--theme', 'light'],
        dir,
      );
      expectExit(resLight, 0, 'audit light');
      expectContains(resLight.stdout, '[light]', 'audit light header');
      expectNotContains(resLight.stdout, '[dark]', 'no dark header');

      // 2. Explicit min-ratio 7 fails
      const resFloor = run(
        'token-audit',
        'audit.mjs',
        ['--tokens', 'tokens', '--min-ratio', '7'],
        dir,
      );
      expectExit(resFloor, 1, 'audit ratio 7');
      expectContains(resFloor.stdout, 'min WCAG ratio 7:1', 'min ratio 7 header');

      // 3. Spec target minWcagRatio 7 fails
      const spec7 = readJson(join(dir, 'style-spec.json'));
      spec7.targets = { minWcagRatio: 7 };
      writeJson(join(dir, 'spec7.json'), spec7);

      const resSpecFloor = run(
        'token-audit',
        'audit.mjs',
        ['--tokens', 'tokens', '--spec', 'spec7.json'],
        dir,
      );
      expectExit(resSpecFloor, 1, 'audit spec target 7');
      expectContains(resSpecFloor.stdout, 'min WCAG ratio 7:1', 'spec target 7 header');
    },
  },
  {
    id: 'A5',
    title: 'audit: tamper failure',
    requiresSeed: true,
    run: async () => {
      const dir = work('A5');
      cpSync(seedDir, dir, { recursive: true });

      const lightFile = join(dir, 'tokens/semantic/light.tokens.json');
      const lightData = readJson(lightFile);
      lightData.semantic.color.text.tertiary.$value = '{color.neutral.50}';
      writeJson(lightFile, lightData);

      const res = run('token-audit', 'audit.mjs', ['--tokens', 'tokens'], dir);
      expectExit(res, 1, 'audit tamper');
      expectContains(
        res.stdout,
        'FAIL  provenance: changed: semantic/light.tokens.json',
        'tamper provenance stdout',
      );
      expectContains(res.stdout, 'audit FAIL', 'audit FAIL label');
    },
  },
  {
    id: 'A6',
    title: 'audit: missing tokens',
    run: async () => {
      const dir = work('A6');
      const res = run('token-audit', 'audit.mjs', ['--tokens', 'missing-tokens'], dir);
      expectExit(res, 1, 'missing tokens');
      expectContains(res.stderr, 'tokens dir not found', 'missing tokens error');
    },
  },

  // --- Build Scenarios ---
  {
    id: 'B1',
    title: 'build: light theme',
    requiresSeed: true,
    run: async () => {
      const dir = work('B1');
      cpSync(seedDir, dir, { recursive: true });

      const res = run(
        'token-build',
        'build.mjs',
        [
          '--tokens',
          'tokens',
          '--out',
          'build-check',
          '--theme',
          'light',
          '--spec',
          'style-spec.json',
        ],
        dir,
      );
      expectExit(res, 0, 'build light');
      for (const art of ['tokens.css', 'theme.css', 'components.md', 'DESIGN.md']) {
        expectFile(join(dir, 'build-check', art), `build-check ${art}`);
      }
      const tokensCss = readFileSync(join(dir, 'build-check/tokens.css'), 'utf8');
      expectContains(tokensCss, 'oklch(', 'tokens.css oklch');
      const themeCss = readFileSync(join(dir, 'build-check/theme.css'), 'utf8');
      expectContains(themeCss, '@theme', 'theme.css @theme');
      const comps = readFileSync(join(dir, 'build-check/components.md'), 'utf8');
      expectContains(comps, '## button', 'button in components.md');
      expectContains(comps, '## Composite patterns', 'composite patterns');
      const design = readFileSync(join(dir, 'build-check/DESIGN.md'), 'utf8');
      expectContains(design, 'primary: "#2784d5"', 'DESIGN.md primary');
    },
  },
  {
    id: 'B2',
    title: 'build: dark theme',
    requiresSeed: true,
    run: async () => {
      const dir = work('B2');
      cpSync(seedDir, dir, { recursive: true });

      const res = run(
        'token-build',
        'build.mjs',
        ['--tokens', 'tokens', '--out', 'build-dark', '--theme', 'dark'],
        dir,
      );
      expectExit(res, 0, 'build dark');
      expectFile(join(dir, 'build-dark/tokens.css'), 'build-dark tokens.css');
      expectContains(res.stdout, 'built (dark)', 'built (dark) stdout');
    },
  },
  {
    id: 'B3',
    title: 'build: profile shadcn',
    requiresSeed: true,
    run: async () => {
      const dir = work('B3');
      cpSync(seedDir, dir, { recursive: true });

      const res = run(
        'token-build',
        'build.mjs',
        ['--tokens', 'tokens', '--out', 'profiles', '--profile', 'shadcn'],
        dir,
      );
      expectExit(res, 0, 'build profile');
      expectFile(join(dir, 'profiles/shadcn.css'), 'shadcn.css');
      const css = readFileSync(join(dir, 'profiles/shadcn.css'), 'utf8');
      expectContains(css, ':root', 'shadcn :root');
      expectContains(css, '.dark', 'shadcn .dark');
    },
  },
  {
    id: 'B4',
    title: 'build: prefix ds',
    requiresSeed: true,
    run: async () => {
      const dir = work('B4');
      cpSync(seedDir, dir, { recursive: true });

      const res = run(
        'token-build',
        'build.mjs',
        [
          '--tokens',
          'tokens',
          '--out',
          'build-prefix',
          '--prefix',
          'ds',
          '--spec',
          'style-spec.json',
        ],
        dir,
      );
      expectExit(res, 0, 'build prefix');
      const tokensCss = readFileSync(join(dir, 'build-prefix/tokens.css'), 'utf8');
      expectContains(tokensCss, '--ds-color-cerulean-500', 'prefixed variable');
      if (/\n {2}--color-/.test(tokensCss)) {
        throw new Error('found unprefixed --color-* custom property in tokens.css');
      }
    },
  },
  {
    id: 'B5',
    title: 'build: visualizer',
    requiresSeed: true,
    run: async () => {
      const dir = work('B5');
      cpSync(seedDir, dir, { recursive: true });

      const res = run(
        'token-build',
        'build.mjs',
        ['--tokens', 'tokens', '--out', 'build-vis', '--visualizer', '--spec', 'style-spec.json'],
        dir,
      );
      expectExit(res, 0, 'build visualizer');
      const visPath = join(dir, 'build-vis/visualizer.html');
      expectFile(visPath, 'visualizer.html');
      const html = readFileSync(visPath, 'utf8');
      expectContains(html, '<!DOCTYPE html>', 'doctype html');
      expectContains(html, 'Example Brand — Visualizer (light)', 'visualizer title');
    },
  },
  {
    id: 'B6',
    title: 'build: audit gate enforcement',
    requiresSeed: true,
    run: async () => {
      const dir = work('B6');
      cpSync(seedDir, dir, { recursive: true });
      rmSync(join(dir, 'tokens/.token-engine-audit.json'), { force: true });

      const resRefuse = run(
        'token-build',
        'build.mjs',
        ['--tokens', 'tokens', '--out', 'build-un', '--theme', 'light'],
        dir,
      );
      expectExit(resRefuse, 1, 'refuse unaudited');
      expectContains(
        resRefuse.stderr,
        'refusing to build: no fresh audit pass for this exact tree (stamp: missing)',
        'unaudited refusal message',
      );

      const resAllow = run(
        'token-build',
        'build.mjs',
        ['--tokens', 'tokens', '--out', 'build-un', '--theme', 'light', '--allow-unaudited'],
        dir,
      );
      expectExit(resAllow, 0, 'allow unaudited');
      expectContains(
        resAllow.stdout,
        'warning: building without a fresh audit pass',
        'allow unaudited warning',
      );
    },
  },
  {
    id: 'B7',
    title: 'build: overwrite and hand-edit tamper protection',
    requiresSeed: true,
    run: async () => {
      const dir = work('B7');
      cpSync(seedDir, dir, { recursive: true });

      // 1. Overwrite refusal without --force
      const resExists = run(
        'token-build',
        'build.mjs',
        ['--tokens', 'tokens', '--out', 'build', '--theme', 'light', '--spec', 'style-spec.json'],
        dir,
      );
      expectExit(resExists, 1, 'build overwrite refuse');
      expectContains(resExists.stderr, 'outputs exist in', 'outputs exist message');

      // 2. Tamper CSS file
      writeFileSync(join(dir, 'build/tokens.css'), '/* hand edit */\n', { flag: 'a' });
      const resTamper = run(
        'token-build',
        'build.mjs',
        ['--tokens', 'tokens', '--out', 'build', '--theme', 'light', '--spec', 'style-spec.json'],
        dir,
      );
      expectExit(resTamper, 1, 'build tamper refuse');
      expectContains(
        resTamper.stderr,
        'refusing to overwrite hand-edited CSS',
        'hand-edited refusal message',
      );

      // 3. Force rebuild
      const resForce = run(
        'token-build',
        'build.mjs',
        [
          '--tokens',
          'tokens',
          '--out',
          'build',
          '--theme',
          'light',
          '--spec',
          'style-spec.json',
          '--force',
        ],
        dir,
      );
      expectExit(resForce, 0, 'build force');
    },
  },
  {
    id: 'B8',
    title: 'build: spec binding mismatch refusal',
    requiresSeed: true,
    run: async () => {
      const dir = work('B8');
      cpSync(seedDir, dir, { recursive: true });

      const otherSpec = readJson(join(dir, 'style-spec.json'));
      otherSpec.palette[0].anchor.h = 300;
      writeJson(join(dir, 'binding.json'), otherSpec);

      const res = run(
        'token-build',
        'build.mjs',
        [
          '--tokens',
          'tokens',
          '--out',
          'build-other',
          '--theme',
          'light',
          '--spec',
          'binding.json',
        ],
        dir,
      );
      expectExit(res, 1, 'binding mismatch refuse');
      expectContains(
        res.stderr,
        'refusing to build: tokens do not match',
        'tokens mismatch prefix',
      );
      expectContains(res.stderr, 'binding: mismatch', 'binding mismatch token');
    },
  },
  {
    id: 'B9',
    title: 'build: dry-run and bad flags',
    requiresSeed: true,
    run: async () => {
      const dir = work('B9');
      cpSync(seedDir, dir, { recursive: true });

      const resDry = run(
        'token-build',
        'build.mjs',
        ['--tokens', 'tokens', '--out', 'dry-build', '--theme', 'light', '--dry-run'],
        dir,
      );
      expectExit(resDry, 0, 'build dry-run');
      expectContains(resDry.stdout, 'would build (light)', 'dry-run stdout');
      if (existsSync(join(dir, 'dry-build'))) {
        throw new Error('dry-build dir should not be created');
      }

      const resProfile = run(
        'token-build',
        'build.mjs',
        ['--tokens', 'tokens', '--out', 'x', '--profile', 'nope'],
        dir,
      );
      expectExit(resProfile, 1, 'unknown profile');
      expectContains(resProfile.stderr, 'unknown profile "nope"', 'unknown profile error');

      const resTheme = run(
        'token-build',
        'build.mjs',
        ['--tokens', 'tokens', '--out', 'x', '--theme', 'nope'],
        dir,
      );
      expectExit(resTheme, 1, 'missing theme');
      expectContains(resTheme.stderr, 'theme not found:', 'missing theme error');

      const resTokens = run(
        'token-build',
        'build.mjs',
        ['--tokens', 'missing-tokens', '--out', 'x'],
        dir,
      );
      expectExit(resTokens, 1, 'missing tokens');
      expectContains(resTokens.stderr, 'tokens dir not found', 'missing tokens error');
    },
  },

  // --- Figma Scenarios ---
  {
    id: 'F1',
    title: 'figma: export + import',
    requiresSeed: true,
    run: async () => {
      const dir = work('F1');
      cpSync(seedDir, dir, { recursive: true });

      const resExport = run(
        'token-build',
        'figma.mjs',
        ['--to-figma', 'tokens', '--out', 'figma.json'],
        dir,
      );
      expectExit(resExport, 0, 'figma export');
      expectContains(resExport.stdout, 'exported', 'exported stdout');
      const figmaData = readJson(join(dir, 'figma.json'));
      if (!figmaData.meta?.variableCollections) {
        throw new Error('figma.json missing meta.variableCollections');
      }
      const varCount = Object.keys(figmaData.meta?.variables || {}).length;
      if (varCount < 300) {
        throw new Error(`expected >300 variables in figma export, found ${varCount}`);
      }

      const resImport = run(
        'token-build',
        'figma.mjs',
        ['--from-figma', 'figma.json', '--out', 'figtokens'],
        dir,
      );
      expectExit(resImport, 0, 'figma import');
      expectFile(
        join(dir, 'figtokens/primitive/figma-imported.tokens.json'),
        'figma-imported.tokens.json',
      );
      expectFile(join(dir, 'figtokens/.token-engine-tokens-manifest.json'), 'figtokens manifest');
    },
  },
  {
    id: 'F2',
    title: 'figma: guards (overwrite refusal and bad flags)',
    requiresSeed: true,
    run: async () => {
      const dir = work('F2');
      cpSync(seedDir, dir, { recursive: true });

      run('token-build', 'figma.mjs', ['--to-figma', 'tokens', '--out', 'figma.json'], dir);
      run('token-build', 'figma.mjs', ['--from-figma', 'figma.json', '--out', 'figtokens'], dir);

      const resAgain = run(
        'token-build',
        'figma.mjs',
        ['--from-figma', 'figma.json', '--out', 'figtokens'],
        dir,
      );
      expectExit(resAgain, 1, 'figma import overwrite refusal');
      expectContains(resAgain.stderr, 'output exists:', 'output exists message');

      const resForce = run(
        'token-build',
        'figma.mjs',
        ['--from-figma', 'figma.json', '--out', 'figtokens', '--force'],
        dir,
      );
      expectExit(resForce, 0, 'figma import force');

      const resNoMode = run('token-build', 'figma.mjs', [], dir);
      expectExit(resNoMode, 1, 'figma no mode');
      expectContains(resNoMode.stderr, 'specify either --to-figma', 'specify mode error');

      const resMissingFile = run('token-build', 'figma.mjs', ['--from-figma', 'missing.json'], dir);
      expectExit(resMissingFile, 1, 'figma missing file');
      expectContains(resMissingFile.stderr, 'figma variables file not found', 'missing file error');

      const resMissingTokens = run('token-build', 'figma.mjs', ['--to-figma', 'missing-dir'], dir);
      expectExit(resMissingTokens, 1, 'figma missing tokens dir');
      expectContains(resMissingTokens.stderr, 'tokens directory not found', 'missing tokens error');
    },
  },

  // --- Route Scenarios ---
  {
    id: 'R1',
    title: 'route: empty directory',
    run: async () => {
      const dir = work('R1');
      const res = run('ask-kami', 'route.mjs', ['--root', '.'], dir);
      expectExit(res, 0, 'route empty');
      expectContains(
        res.stdout,
        'state: spec=missing tokens=missing audit=missing build=missing',
        'empty state',
      );
      expectContains(
        res.stdout,
        'next: token-extract — node ./scripts/extract.mjs --root . --out style-spec.json',
        'extract command line',
      );
      expectContains(res.stdout, 'next: token-style', 'token-style next line');
      // Must not propose generate.mjs for token-style
      const lines = res.stdout.split('\n');
      const styleLine = lines.find((l) => l.startsWith('next: token-style'));
      if (!styleLine) throw new Error('missing next: token-style line');
      if (styleLine.includes('generate.mjs') || styleLine.includes(' — ')) {
        throw new Error(`token-style line should not have script command: "${styleLine}"`);
      }
    },
  },
  {
    id: 'R2',
    title: 'route: state transitions (spec -> tokens -> audited -> built)',
    requiresSeed: true,
    run: async () => {
      const baseDir = work('R2');

      // 1. spec only
      const dSpec = join(baseDir, 'spec-only');
      mkdirSync(dSpec, { recursive: true });
      cpSync(join(seedDir, 'style-spec.json'), join(dSpec, 'style-spec.json'));
      const resSpec = run('ask-kami', 'route.mjs', ['--root', '.'], dSpec);
      expectContains(resSpec.stdout, 'state: spec=valid tokens=missing', 'spec-only state');
      expectContains(resSpec.stdout, 'next: token-math', 'spec-only next');

      // 2. tokens unaudited
      const dTok = join(baseDir, 'tokens-un');
      mkdirSync(dTok, { recursive: true });
      cpSync(join(seedDir, 'style-spec.json'), join(dTok, 'style-spec.json'));
      run('token-math', 'generate.mjs', ['--spec', 'style-spec.json', '--out', 'tokens'], dTok);
      const resTok = run('ask-kami', 'route.mjs', ['--root', '.'], dTok);
      expectContains(resTok.stdout, 'tokens=present audit=missing', 'tokens-un state');
      expectContains(resTok.stdout, 'next: token-audit', 'tokens-un next');

      // 3. audited no build
      const dAud = join(baseDir, 'audited');
      mkdirSync(dAud, { recursive: true });
      cpSync(join(seedDir, 'style-spec.json'), join(dAud, 'style-spec.json'));
      cpSync(join(seedDir, 'tokens'), join(dAud, 'tokens'), { recursive: true });
      const resAud = run('ask-kami', 'route.mjs', ['--root', '.'], dAud);
      expectContains(resAud.stdout, 'audit=pass build=missing', 'audited state');
      expectContains(resAud.stdout, 'next: token-build', 'audited next');

      // 4. built system
      const resBuilt = run('ask-kami', 'route.mjs', ['--root', '.'], seedDir);
      expectContains(resBuilt.stdout, 'build=present', 'built state');
      expectContains(resBuilt.stdout, 'next: improve-design-system', 'built next');
    },
  },
  {
    id: 'R3',
    title: 'route: JSON summary and invalid spec',
    requiresSeed: true,
    run: async () => {
      const dir = work('R3');
      cpSync(seedDir, dir, { recursive: true });

      const resJson = run('ask-kami', 'route.mjs', ['--root', '.', '--json'], dir);
      expectExit(resJson, 0, 'route json');
      const data = JSON.parse(resJson.stdout);
      if (data.state.spec.status !== 'valid')
        throw new Error(`state.spec: ${data.state.spec.status}`);
      if (data.nextActions[0]?.skill !== 'improve-design-system') {
        throw new Error(`nextAction: ${data.nextActions[0]?.skill}`);
      }
      if (typeof data.summary?.errors !== 'number' || typeof data.summary?.warnings !== 'number') {
        throw new Error('missing summary numeric fields');
      }

      // Invalid spec
      const badDir = join(dir, 'bad');
      mkdirSync(badDir, { recursive: true });
      const badSpec = readJson(join(dir, 'style-spec.json'));
      badSpec.palette.push({
        role: 'primary',
        name: 'red',
        anchor: { l: 0.5, c: 0.1, h: 20, alpha: 1 },
      });
      writeJson(join(badDir, 'style-spec.json'), badSpec);

      const resBad = run('ask-kami', 'route.mjs', ['--root', '.'], badDir);
      expectContains(resBad.stdout, 'spec=invalid', 'invalid spec state');
      const lines = resBad.stdout.split('\n');
      const styleLine = lines.find((l) => l.startsWith('next: token-style'));
      if (!styleLine) throw new Error('missing next: token-style line on invalid spec');
      if (styleLine.includes('generate.mjs') || styleLine.includes(' — ')) {
        throw new Error(`token-style line should not have command: "${styleLine}"`);
      }
    },
  },

  // --- Diagnose Scenarios ---
  {
    id: 'D1',
    title: 'diagnose: empty directory',
    run: async () => {
      const dir = work('D1');
      const res = run('improve-design-system', 'diagnose.mjs', ['--root', '.'], dir);
      expectExit(res, 0, 'diagnose empty');
      const json = JSON.parse(res.stdout);
      if (json.state.spec.status !== 'missing') {
        throw new Error(`expected spec missing, got ${json.state.spec.status}`);
      }
      if (!json.findings.some((f) => f.id === 'spec-missing' && f.severity === 'error')) {
        throw new Error('expected spec-missing error finding');
      }
      const skills = json.nextActions.map((a) => a.skill);
      if (!skills.includes('token-extract') || !skills.includes('token-style')) {
        throw new Error(`expected [token-extract, token-style], got ${skills}`);
      }
      const styleAction = json.nextActions.find((a) => a.skill === 'token-style');
      if (styleAction.command !== undefined) {
        throw new Error(`expected token-style command undefined, got "${styleAction.command}"`);
      }
      const extractAction = json.nextActions.find((a) => a.skill === 'token-extract');
      expectContains(
        extractAction.command,
        'extract.mjs --root . --out style-spec.json',
        'extract command',
      );
    },
  },
  {
    id: 'D2',
    title: 'diagnose: healthy built system',
    requiresSeed: true,
    run: async () => {
      const dir = work('D2');
      cpSync(seedDir, dir, { recursive: true });

      const res = run('improve-design-system', 'diagnose.mjs', ['--root', '.'], dir);
      expectExit(res, 0, 'diagnose healthy');
      const json = JSON.parse(res.stdout);
      const errors = json.findings.filter((f) => f.severity === 'error');
      if (errors.length > 0) {
        throw new Error(`unexpected error findings: ${errors.map((e) => e.id).join(', ')}`);
      }
      const specWarn = json.findings.find((f) => f.id === 'spec-warnings');
      if (!specWarn || !specWarn.evidence.some((e) => e.includes('clamped to sRGB'))) {
        throw new Error('expected spec-warnings with clamped to sRGB evidence');
      }
      if (!json.findings.some((f) => f.id === 'profile-coverage')) {
        throw new Error('expected profile-coverage info finding');
      }
      if (!json.findings.some((f) => f.id === 'visualizer-missing')) {
        throw new Error('expected visualizer-missing info finding');
      }
      if (json.nextActions[0]?.skill !== 'improve-design-system') {
        throw new Error(
          `expected nextAction improve-design-system, got ${json.nextActions[0]?.skill}`,
        );
      }
    },
  },
  {
    id: 'D3',
    title: 'diagnose: low contrast and tamper findings',
    run: async () => {
      const dir = work('D3');

      // 1. low contrast
      const spec = readJson(join(skillsRoot, 'token-style/assets/style-spec.example.json'));
      spec.overrides = { light: { 'semantic.color.text.tertiary': '{color.neutral.200}' } };
      writeJson(join(dir, 'low.json'), spec);

      run('token-math', 'generate.mjs', ['--spec', 'low.json', '--out', 'tokens'], dir);
      const resLow = run(
        'improve-design-system',
        'diagnose.mjs',
        ['--root', '.', '--spec', 'low.json', '--tokens', 'tokens'],
        dir,
      );
      expectExit(resLow, 0, 'diagnose low contrast');
      const jsonLow = JSON.parse(resLow.stdout);
      const auditFail = jsonLow.findings.find(
        (f) => f.id.startsWith('audit-fail-') && f.severity === 'error',
      );
      if (!auditFail || !auditFail.evidence.some((e) => e.includes('remedy:'))) {
        throw new Error('expected audit-fail error with remedy evidence');
      }
      if (!jsonLow.nextActions.some((a) => a.skill === 'token-audit')) {
        throw new Error('expected token-audit nextAction for contrast failure');
      }

      // 2. tamper
      const lightFile = join(dir, 'tokens/semantic/light.tokens.json');
      const lightData = readJson(lightFile);
      lightData.semantic.color.text.tertiary.$value = '{color.neutral.50}';
      writeJson(lightFile, lightData);

      const resTamper = run(
        'improve-design-system',
        'diagnose.mjs',
        ['--root', '.', '--spec', 'low.json', '--tokens', 'tokens'],
        dir,
      );
      expectExit(resTamper, 0, 'diagnose tamper');
      const jsonTamper = JSON.parse(resTamper.stdout);
      if (
        !jsonTamper.findings.some((f) => f.id === 'provenance-tampered' && f.severity === 'error')
      ) {
        throw new Error('expected provenance-tampered error finding');
      }
      if (!jsonTamper.nextActions.some((a) => a.skill === 'token-audit')) {
        throw new Error('expected token-audit nextAction for tampered tree');
      }
    },
  },
  {
    id: 'D4',
    title: 'diagnose: missing build and path overrides',
    requiresSeed: true,
    run: async () => {
      const dir = work('D4');
      cpSync(join(seedDir, 'style-spec.json'), join(dir, 'style-spec.json'));
      cpSync(join(seedDir, 'tokens'), join(dir, 'tokens'), { recursive: true });

      // Missing build
      const resNoBuild = run('improve-design-system', 'diagnose.mjs', ['--root', '.'], dir);
      expectExit(resNoBuild, 0, 'diagnose missing build');
      const jsonNoBuild = JSON.parse(resNoBuild.stdout);
      if (!jsonNoBuild.findings.some((f) => f.id === 'build-missing' && f.severity === 'warning')) {
        throw new Error('expected build-missing warning finding');
      }
      if (jsonNoBuild.nextActions[0]?.skill !== 'token-build') {
        throw new Error(
          `expected nextAction token-build, got ${jsonNoBuild.nextActions[0]?.skill}`,
        );
      }

      // Overrides
      const customSpec = resolve(join(dir, 'custom-spec.json'));
      const customTokens = resolve(join(dir, 'custom-tokens'));
      const customBuild = resolve(join(dir, 'custom-build'));
      cpSync(join(dir, 'style-spec.json'), customSpec);
      cpSync(join(dir, 'tokens'), customTokens, { recursive: true });
      mkdirSync(customBuild, { recursive: true });

      const resOverrides = run(
        'improve-design-system',
        'diagnose.mjs',
        ['--root', dir, '--spec', customSpec, '--tokens', customTokens, '--build', customBuild],
        dir,
      );
      expectExit(resOverrides, 0, 'diagnose overrides');
      const jsonOverrides = JSON.parse(resOverrides.stdout);
      if (resolve(jsonOverrides.state.paths.spec) !== customSpec) {
        throw new Error(`spec path: ${jsonOverrides.state.paths.spec} !== ${customSpec}`);
      }
      if (resolve(jsonOverrides.state.paths.tokens) !== customTokens) {
        throw new Error(`tokens path: ${jsonOverrides.state.paths.tokens} !== ${customTokens}`);
      }
      if (resolve(jsonOverrides.state.paths.build) !== customBuild) {
        throw new Error(`build path: ${jsonOverrides.state.paths.build} !== ${customBuild}`);
      }
    },
  },
];

async function main() {
  console.log(`Running smoke harness (${CASES.length} scenarios) against copied dist skills...\n`);
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const failureDetails = [];

  try {
    for (const testCase of CASES) {
      if (testCase.requiresSeed && !seedOk) {
        skipped++;
        console.log(`SKIP  ${testCase.id}  ${testCase.title}  (seed pipeline failed)`);
        continue;
      }
      try {
        await testCase.run();
        passed++;
        console.log(`PASS  ${testCase.id}  ${testCase.title}`);
      } catch (err) {
        failed++;
        console.log(`FAIL  ${testCase.id}  ${testCase.title}`);
        failureDetails.push({ id: testCase.id, title: testCase.title, error: err.message });
      }
    }
  } finally {
    try {
      rmSync(tempRoot, { recursive: true, force: true });
    } catch {
      // Temp directory cleanup failure on Windows is non-fatal
    }
  }

  console.log(`\n${CASES.length} cases: ${passed} passed, ${failed} failed, ${skipped} skipped`);

  if (failureDetails.length > 0) {
    console.log('\n--- Failure Details ---');
    for (const { id, title, error } of failureDetails) {
      console.log(`\n[${id}] ${title}:`);
      console.log(error);
    }
  }

  process.exitCode = failed > 0 || skipped > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error('Fatal harness error:', err);
  process.exit(1);
});
