import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { GOLD_PAIRS } from '../scripts/sample-css.mjs';
import { oklchToHex, parseToOklch } from '../src/shared/colors.ts';
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

const roleAnchor = (role) => ({ $extensions: { 'token-engine': { role } } });

function renderDict(entries) {
  return new ResolvedDictionary(
    entries.map(([path, value, extra]) => ({
      name: path,
      path: path.split('.'),
      $value: value,
      ...extra,
    })),
  );
}

test('renderProfile resolves MUI secondary from the role marker, not the description', () => {
  const semantic = [
    ['semantic.color.action.primary', '#000001'],
    ['semantic.color.action.primary-hover', '#000002'],
    ['semantic.color.action.primary-text', '#ffffff'],
    ['semantic.color.feedback.danger.text', '#aa0000'],
    ['semantic.color.feedback.warning.text', '#aa8800'],
    ['semantic.color.feedback.success.text', '#00aa00'],
    ['semantic.color.feedback.info.text', '#0000aa'],
    ['semantic.color.text.primary', '#111111'],
    ['semantic.color.text.secondary', '#222222'],
    ['semantic.color.text.disabled', '#333333'],
    ['semantic.color.bg.canvas', '#ffffff'],
    ['semantic.color.bg.surface', '#f8f9fa'],
    ['semantic.color.border.default', '#dddddd'],
    ['font-family.sans', 'Inter'],
    ['font-size.base', '1rem'],
    ['radius.md', '0.5rem'],
  ];
  const dict = renderDict([
    ...semantic,
    ['color.alpha.500', '#112233', roleAnchor('primary')],
    ['color.beta.500', '#445566', roleAnchor('secondary')],
  ]);
  const { content } = renderProfile('mui', dict, dict);
  const parsed = JSON.parse(content);
  assert.equal(parsed.light.palette.secondary.main, oklchToHex(parseToOklch('#445566')));
  assert.notEqual(parsed.light.palette.secondary.main, oklchToHex(parseToOklch('#000002')));
});

test('renderProfile resolves the radix primary ramp from the role marker', () => {
  const dict = renderDict([
    ['color.alpha.300', '#99aabb', roleAnchor('primary')],
    ['color.alpha.500', '#556677'],
    ['color.alpha.700', '#112233'],
    ['color.neutral.300', '#dddddd'],
    ['color.neutral.500', '#888888'],
    ['color.neutral.700', '#333333'],
    ['semantic.color.action.primary-text', '#ffffff'],
  ]);
  const { content } = renderProfile('radix', dict, dict);
  assert.ok(content.includes(':root {'));
  assert.ok(content.includes('.dark {'));
  assert.ok(content.includes('--accent-1:'));
  assert.ok(content.includes('--gray-1:'));
});
