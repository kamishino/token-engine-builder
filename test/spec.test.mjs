import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeStyleSpec, validateStyleSpec } from '../src/shared/spec.ts';

test('validateStyleSpec fails closed on missing palette or wrong arity', () => {
  const invalid1 = validateStyleSpec({});
  assert.equal(invalid1.valid, false);

  const invalid2 = validateStyleSpec({
    name: 'test',
    palette: [{ role: 'primary', name: 'blue', anchor: { l: 0.5, c: 0.1, h: 240 } }],
    typography: { baseSizePx: 16, ratio: 1.2 },
  });
  assert.equal(invalid2.valid, false);
  assert.ok(invalid2.errors.some((e) => e.includes('palette must contain 3–5 colors')));
});

test('validateStyleSpec validates valid style-spec and warns on out-of-gamut anchor', () => {
  const valid = validateStyleSpec({
    name: 'test-brand',
    palette: [
      { role: 'primary', name: 'primary-blue', anchor: { l: 0.6, c: 0.15, h: 250 } },
      { role: 'secondary', name: 'secondary-teal', anchor: { l: 0.7, c: 0.12, h: 180 } },
      { role: 'accent', name: 'accent-orange', anchor: { l: 0.65, c: 0.35, h: 40 } },
    ],
    typography: { baseSizePx: 16, ratio: 1.25 },
  });
  assert.equal(valid.valid, true);
  assert.ok(valid.warnings.some((w) => w.includes('clamped to sRGB')));
});

test('normalizeStyleSpec populates default design token decisions', () => {
  const raw = {
    name: 'minimal',
    palette: [
      { role: 'primary', name: 'p', anchor: { l: 0.5, c: 0.1, h: 200 } },
      { role: 'secondary', name: 's', anchor: { l: 0.6, c: 0.1, h: 150 } },
      { role: 'accent', name: 'a', anchor: { l: 0.7, c: 0.1, h: 100 } },
    ],
    typography: { baseSizePx: 16, ratio: 1.2 },
  };
  const normalized = normalizeStyleSpec(raw);
  assert.equal(normalized.density, 'comfortable');
  assert.equal(normalized.spacingBasePx, 4);
  assert.equal(normalized.rampSteps, 11);
  assert.equal(normalized.typography.baseLineHeight, 1.5);
  assert.equal(normalized.targets.minWcagRatio, 4.5);
});
