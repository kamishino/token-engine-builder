import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { loadStyleSpec } from '../src/shared/spec.ts';
import { planThemes } from '../src/shared/theme-plan.ts';

const EXAMPLE = 'src/skills/token-style/assets/style-spec.example.json';
const base = JSON.parse(readFileSync(EXAMPLE, 'utf8'));

test('planThemes emits generated themes with stable aliases', () => {
  const spec = loadStyleSpec(base).spec;
  const planned = planThemes(spec);
  assert.deepEqual(
    planned.map((entry) => entry.theme),
    ['light', 'dark', 'high-contrast'],
  );
  const primaryName = spec.palette.find((entry) => entry.role === 'primary').name;
  const light = planned.find((entry) => entry.theme === 'light').data;
  const dark = planned.find((entry) => entry.theme === 'dark').data;
  assert.equal(light.semantic.color.action.primary.$value, `{color.${primaryName}.800}`);
  assert.equal(dark.semantic.color.action.primary.$value, `{color.${primaryName}.100}`);
});

test('planThemes applies custom theme steps without touching the registry', () => {
  const spec = loadStyleSpec({
    ...base,
    themes: {
      midnight: { mode: 'dark', surfaceSteps: { canvas: 100 }, actionStep: 50 },
    },
  }).spec;
  const planned = planThemes(spec);
  const midnight = planned.find((entry) => entry.theme === 'midnight').data;
  assert.equal(midnight.semantic.color.bg.canvas.$value, '{color.neutral.100}');
  assert.equal(midnight.semantic.color.action.primary.$value, '{color.cerulean.50}');
});

test('planThemes applies durable overrides in memory', () => {
  const spec = loadStyleSpec({
    ...base,
    overrides: {
      light: { 'semantic.color.bg.canvas': '{color.neutral.100}' },
    },
  }).spec;
  const light = planThemes(spec).find((entry) => entry.theme === 'light').data;
  assert.deepEqual(light.semantic.color.bg.canvas, {
    $value: '{color.neutral.100}',
    $type: 'color',
  });
});

test('planThemes throws when an override targets an unknown path', () => {
  const spec = loadStyleSpec({
    ...base,
    overrides: {
      light: { 'semantic.color.bg.canvasss': '{color.neutral.100}' },
    },
  }).spec;
  assert.throws(() => planThemes(spec), /matches no generated semantic token/);
});
