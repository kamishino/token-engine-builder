import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test from 'node:test';
import {
  createScanState,
  findSourceFiles,
  nameScore,
  parseDesignFrontmatter,
  rankCandidates,
  scanFile,
  scanRenderedTarget,
  scanTextColors,
} from '../src/skills/token-extract/scripts/extract.ts';

test('scanFile reads Tailwind v3 and v4 palettes into roles', () => {
  const state = createScanState();
  scanFile(
    "module.exports = { theme: { colors: { primary: '#112233', accent: { 500: '#abcdef' } } } };",
    'tailwind.config.js',
    state,
  );
  assert.ok(state.tailwindColors.has('primary'));
  assert.ok(state.tailwindColors.has('accent'));
  assert.equal(state.candidates.size, 2);

  const v4 = createScanState();
  scanFile('@theme { --color-brand: #123456; --color-secondary: #654321; }', 'styles.css', v4);
  assert.ok(v4.tailwindColors.has('primary'));
  assert.ok(v4.tailwindColors.has('secondary'));
});

test('parseDesignFrontmatter reads the machine-readable contract', () => {
  const parsed = parseDesignFrontmatter(
    '---\nprimary: "#112233"\nfontSans: "Inter"\nrounded:\n  md: "8px"\ncomponents: [button, card]\n---\n# prose',
    'DESIGN.md',
  );
  assert.equal(parsed.primary, '#112233');
  assert.equal(parsed.fontSans, 'Inter');
  assert.deepEqual(parsed.components, ['button', 'card']);
});

test('scanTextColors captures named and bare colors plus typography', () => {
  const state = createScanState();
  scanTextColors('--brand: #112233; background: #ffffff; font-family: Inter;', 'styles.css', state);
  assert.ok(state.candidates.size >= 2);
  assert.equal(state.fontFamily, 'Inter');
});

test('nameScore ranks brand names above surface names', () => {
  assert.ok(nameScore('brand') > nameScore('background'));
});

test('rankCandidates weights occurrence count over raw score', () => {
  const low = {
    color: { l: 0.5, c: 0.1, h: 10, alpha: 1 },
    score: 3,
    count: 1,
    name: 'a',
    source: 'a.css',
  };
  const high = {
    color: { l: 0.6, c: 0.1, h: 20, alpha: 1 },
    score: 2,
    count: 2,
    name: 'b',
    source: 'b.css',
  };
  assert.deepEqual(
    rankCandidates([low, high]).map((candidate) => candidate.name),
    ['b', 'a'],
  );
});

test('findSourceFiles skips build dirs and non-source extensions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'extract-walk-'));
  try {
    mkdirSync(join(dir, 'src'), { recursive: true });
    mkdirSync(join(dir, 'node_modules'), { recursive: true });
    writeFileSync(join(dir, 'src', 'a.css'), '', 'utf8');
    writeFileSync(join(dir, 'src', 'b.png'), '', 'utf8');
    writeFileSync(join(dir, 'node_modules', 'c.css'), '', 'utf8');
    assert.deepEqual(
      findSourceFiles(dir).map((path) => relative(dir, path).replaceAll('\\', '/')),
      ['src/a.css'],
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('scanRenderedTarget records an injected capture', async () => {
  const state = createScanState();
  const result = await scanRenderedTarget({ url: 'https://example.test' }, state, async () => ({
    colors: [['rgb(1, 2, 3)', 4]],
    fonts: [['"Inter", sans-serif', 3]],
    radii: [['12', 2]],
  }));
  assert.deepEqual(result, { ok: true });
  assert.equal(state.fontFamily, 'Inter, sans-serif');
  assert.equal(state.radiusCounts.get(12), 2);
  assert.equal(state.candidates.size, 1);
});

test('scanRenderedTarget falls back to text scanning when capture fails', async () => {
  const state = createScanState();
  const result = await scanRenderedTarget(
    { html: '<div style="color:#112233">x</div>', sourceName: 'page.html' },
    state,
    async () => {
      throw new Error('no browser');
    },
  );
  assert.deepEqual(result, { ok: true });
  assert.equal(state.candidates.size, 1);
});

test('scanRenderedTarget reports failure when capture fails without html', async () => {
  const result = await scanRenderedTarget(
    { url: 'https://example.test' },
    createScanState(),
    async () => {
      throw new Error('no browser');
    },
  );
  assert.deepEqual(result, { ok: false, error: 'no browser' });
});
