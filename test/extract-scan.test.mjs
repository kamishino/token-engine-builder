import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createScanState,
  nameScore,
  parseDesignFrontmatter,
  scanFile,
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
