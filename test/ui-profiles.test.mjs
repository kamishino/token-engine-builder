import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildUiProfile, profileFileName, UI_PROFILE_IDS } from '../src/shared/ui-profiles.ts';
import { runGenerate } from '../src/skills/token-math/scripts/generate.ts';

test('UI_PROFILE_IDS lists all 8 supported UI profiles', () => {
  assert.equal(UI_PROFILE_IDS.length, 8);
  assert.deepEqual(UI_PROFILE_IDS, [
    'shadcn',
    'bootstrap',
    'primevue',
    'antd',
    'mui',
    'chakra',
    'radix',
    'fluent',
  ]);
});

test('profileFileName maps JSON vs CSS destinations accurately', () => {
  assert.equal(profileFileName('antd'), 'antd-theme.json');
  assert.equal(profileFileName('mui'), 'mui-theme.json');
  assert.equal(profileFileName('chakra'), 'chakra-theme.json');
  assert.equal(profileFileName('fluent'), 'fluent-theme.json');
  assert.equal(profileFileName('radix'), 'radix-theme.css');
  assert.equal(profileFileName('shadcn'), 'shadcn.css');
  assert.equal(profileFileName('bootstrap'), 'bootstrap.css');
  assert.equal(profileFileName('primevue'), 'primevue.css');
});

test('buildUiProfile emits distinct polarized radix blocks for root and dark', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ui-prof-test-'));
  try {
    const tokensDir = join(dir, 'tokens');
    const outDir = join(dir, 'out');
    runGenerate([
      '--spec',
      'src/skills/token-style/assets/style-spec.example.json',
      '--out',
      tokensDir,
    ]);

    await buildUiProfile('radix', tokensDir, outDir);
    const css = readFileSync(join(outDir, 'radix-theme.css'), 'utf8');
    assert.ok(css.includes(':root'));
    assert.ok(css.includes('.dark'));
    const rootBlock = css.slice(css.indexOf(':root'), css.indexOf('.dark'));
    const darkBlock = css.slice(css.indexOf('.dark'));
    assert.notEqual(rootBlock, darkBlock);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
