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
    typography: { fontFamily: 'Inter, sans-serif', baseSizePx: 16, ratio: 1.25 },
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

test('validateStyleSpec rejects invalid custom theme mode and invalid density', () => {
  const invalidTheme = validateStyleSpec({
    name: 'test',
    palette: [
      { role: 'primary', name: 'p', anchor: { l: 0.5, c: 0.1, h: 200 } },
      { role: 'secondary', name: 's', anchor: { l: 0.6, c: 0.1, h: 150 } },
      { role: 'accent', name: 'a', anchor: { l: 0.7, c: 0.1, h: 100 } },
    ],
    typography: { fontFamily: 'Inter, sans-serif', baseSizePx: 16, ratio: 1.2 },
    themes: {
      sepia: { mode: 'invalid-mode' },
    },
  });
  assert.equal(invalidTheme.valid, false);
  assert.ok(invalidTheme.errors.some((e) => e.includes('mode must be "light" or "dark"')));

  const invalidDensity = validateStyleSpec({
    name: 'test',
    palette: [
      { role: 'primary', name: 'p', anchor: { l: 0.5, c: 0.1, h: 200 } },
      { role: 'secondary', name: 's', anchor: { l: 0.6, c: 0.1, h: 150 } },
      { role: 'accent', name: 'a', anchor: { l: 0.7, c: 0.1, h: 100 } },
    ],
    typography: { fontFamily: 'Inter, sans-serif', baseSizePx: 16, ratio: 1.2 },
    density: 'ultra-wide',
  });
  assert.equal(invalidDensity.valid, false);
  assert.ok(
    invalidDensity.errors.some((e) => e.includes('density must be "comfortable" or "compact"')),
  );
});

test('validateStyleSpec rejects an invalid palette role', () => {
  const result = validateStyleSpec({
    name: 'test',
    palette: [
      { role: 'brand', name: 'p', anchor: { l: 0.5, c: 0.1, h: 200 } },
      { role: 'secondary', name: 's', anchor: { l: 0.6, c: 0.1, h: 150 } },
      { role: 'accent', name: 'a', anchor: { l: 0.7, c: 0.1, h: 100 } },
    ],
    typography: { fontFamily: 'Inter, sans-serif', baseSizePx: 16, ratio: 1.2 },
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('role must be')));
});

test('validateStyleSpec requires typography.fontFamily', () => {
  const result = validateStyleSpec({
    name: 'test',
    palette: [
      { role: 'primary', name: 'p', anchor: { l: 0.5, c: 0.1, h: 200 } },
      { role: 'secondary', name: 's', anchor: { l: 0.6, c: 0.1, h: 150 } },
      { role: 'accent', name: 'a', anchor: { l: 0.7, c: 0.1, h: 100 } },
    ],
    typography: { baseSizePx: 16, ratio: 1.2 },
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('fontFamily')));
});

test('validateStyleSpec warns on non-catalog palette names and passes catalog names', () => {
  const withNonCatalog = validateStyleSpec({
    name: 'test-brand',
    palette: [
      { role: 'primary', name: 'cerulean', anchor: { l: 0.6, c: 0.15, h: 250 } },
      { role: 'secondary', name: 'teal', anchor: { l: 0.6, c: 0.1275, h: 285 } },
      { role: 'accent', name: 'sky', anchor: { l: 0.6, c: 0.1275, h: 215 } },
    ],
    typography: { fontFamily: 'Inter, sans-serif', baseSizePx: 16, ratio: 1.25 },
  });
  assert.equal(withNonCatalog.valid, true);
  assert.ok(
    withNonCatalog.warnings.some((w) =>
      w.includes('palette "teal" is not a vendored catalog color name'),
    ),
  );

  const withCatalog = validateStyleSpec({
    name: 'test-brand',
    palette: [
      { role: 'primary', name: 'cerulean', anchor: { l: 0.6, c: 0.15, h: 250 } },
      { role: 'secondary', name: 'deep-amethyst', anchor: { l: 0.6, c: 0.1275, h: 285 } },
      { role: 'accent', name: 'sky', anchor: { l: 0.6, c: 0.1275, h: 215 } },
    ],
    typography: { fontFamily: 'Inter, sans-serif', baseSizePx: 16, ratio: 1.25 },
  });
  assert.equal(withCatalog.valid, true);
  assert.ok(!withCatalog.warnings.some((w) => w.includes('is not a vendored catalog color name')));
});
