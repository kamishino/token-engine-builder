import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { GOLD_PAIRS } from '../scripts/sample-css.mjs';
import { loadThemeTokens, ResolvedDictionary } from '../src/shared/compiler.ts';
import { profileFileName, UI_PROFILE_IDS } from '../src/shared/profile-registry.ts';
import { SEMANTIC_ROLE_PATHS } from '../src/shared/roles.ts';
import { buildUiProfile, renderProfile } from '../src/shared/ui-profiles.ts';
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

test('buildUiProfile builds fluent, antd, mui, chakra, and shadcn profiles successfully', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ui-prof-all-'));
  try {
    const tokensDir = join(dir, 'tokens');
    const outDir = join(dir, 'out');
    runGenerate([
      '--spec',
      'src/skills/token-style/assets/style-spec.example.json',
      '--out',
      tokensDir,
    ]);

    for (const profile of ['fluent', 'antd', 'mui', 'chakra', 'shadcn']) {
      const file = await buildUiProfile(profile, tokensDir, outDir);
      assert.equal(typeof file, 'string');
      const content = readFileSync(file, 'utf8');
      assert.ok(content.length > 50);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('renderProfile returns content for all eight profiles without writing files', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'render-prof-test-'));
  try {
    const tokensDir = join(dir, 'tokens');
    runGenerate([
      '--spec',
      'src/skills/token-style/assets/style-spec.example.json',
      '--out',
      tokensDir,
    ]);
    const lightData = await loadThemeTokens(tokensDir, 'light');
    const darkData = await loadThemeTokens(tokensDir, 'dark');

    for (const profile of UI_PROFILE_IDS) {
      const { fileName, content } = renderProfile(profile, lightData, darkData);
      assert.equal(fileName, profileFileName(profile));
      assert.ok(content.length > 50);
      if (profile === 'radix') assert.ok(content.includes('.dark'));
      if (profile === 'fluent') assert.ok(content.includes('colorBrandBackground'));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('renderProfile renders a Chakra-only dictionary without MUI-only roles', () => {
  const paths = [
    SEMANTIC_ROLE_PATHS.BG_CANVAS,
    SEMANTIC_ROLE_PATHS.BG_SUBTLE,
    SEMANTIC_ROLE_PATHS.BG_SURFACE,
    SEMANTIC_ROLE_PATHS.BG_RAISED,
    SEMANTIC_ROLE_PATHS.TEXT_PRIMARY,
    SEMANTIC_ROLE_PATHS.TEXT_SECONDARY,
    SEMANTIC_ROLE_PATHS.TEXT_DISABLED,
    SEMANTIC_ROLE_PATHS.BORDER_DEFAULT,
    SEMANTIC_ROLE_PATHS.BORDER_SUBTLE,
    SEMANTIC_ROLE_PATHS.BORDER_FOCUS,
    SEMANTIC_ROLE_PATHS.ACTION_PRIMARY,
    SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_TEXT,
  ];
  const dict = new ResolvedDictionary(
    paths.map((path) => ({ name: path, path: path.split('.'), $value: '#ffffff' })),
  );
  const { fileName, content } = renderProfile('chakra', dict, dict);
  assert.equal(fileName, 'chakra-theme.json');
  assert.ok(content.includes('semanticTokens'));
});

test('renderProfile fails at the missing read', () => {
  const empty = new ResolvedDictionary([]);
  assert.throws(() => renderProfile('chakra', empty, empty), /missing required token/);
});

test('every profile id has a filename and a gold example', () => {
  for (const profile of UI_PROFILE_IDS) {
    const fileName = profileFileName(profile);
    assert.ok(fileName.length > 0);
    const extension = fileName.endsWith('.json') ? 'json' : 'css';
    assert.ok(
      existsSync(join('src/skills/token-build/examples', `${profile}.example.${extension}`)),
      `missing example for ${profile}`,
    );
  }
  assert.equal(GOLD_PAIRS.length, 4 + UI_PROFILE_IDS.length);
  assert.ok(GOLD_PAIRS.some(([built]) => built === `build/profiles/${profileFileName('radix')}`));
});
