import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRamp,
  checkContrast,
  clampToSrgb,
  formatOklch,
  parseToOklch,
} from '../src/shared/colors.ts';

test('buildRamp lands anchor exactly at step 500 for all step sets', () => {
  const anchor = { l: 0.6, c: 0.15, h: 250 };
  for (const steps of [5, 9, 11]) {
    const ramp = buildRamp(anchor, steps);
    assert.deepEqual(ramp[500], { ...anchor, alpha: 1 });
  }
});

test('clampToSrgb preserves hue and lightness while reducing chroma in gamut', () => {
  const outOfGamut = { l: 0.8, c: 0.35, h: 140 };
  const clamped = clampToSrgb(outOfGamut);
  assert.equal(clamped.l, outOfGamut.l);
  assert.equal(clamped.h, outOfGamut.h);
  assert.ok(clamped.c < outOfGamut.c);
  assert.ok(clamped.c > 0);
});

test('checkContrast accurately calculates WCAG 2.1 ratio and APCA Lc', () => {
  const black = { l: 0, c: 0, h: 0 };
  const white = { l: 1, c: 0, h: 0 };
  const result = checkContrast('white', white, 'black', black, 4.5, 60, 'text');
  assert.equal(result.pass, true);
  assert.equal(result.kind, 'text');
  assert.ok(result.ratio >= 21);
  assert.ok(result.apcaLc >= 100);
  assert.equal(checkContrast('white', white, 'black', black, 4.5, 60, 'border').kind, 'border');
});

test('formatOklch and parseToOklch round-trip cleanly', () => {
  const color = { l: 0.65, c: 0.12, h: 210 };
  const formatted = formatOklch(color);
  assert.equal(formatted, 'oklch(65% 0.12 210deg)');
  const parsed = parseToOklch(formatted);
  assert.equal(parsed.l, 0.65);
  assert.equal(parsed.c, 0.12);
  assert.equal(parsed.h, 210);
});
