import assert from 'node:assert/strict';
import test from 'node:test';
import {
  baselinePx,
  radiusScale,
  rhythmScale,
  spacingScale,
  typographyScale,
} from '../src/shared/scales.ts';

test('typographyScale generates modular steps matching base and ratio', () => {
  const ramp = typographyScale(16, 1.25);
  assert.deepEqual(ramp['base'].$value, { value: 16, unit: 'px' });
  assert.deepEqual(ramp['lg'].$value, { value: 20, unit: 'px' });
  assert.deepEqual(ramp['sm'].$value, { value: 12.8, unit: 'px' });
});

test('baselinePx calculates 4px-snapped grid lines', () => {
  assert.equal(baselinePx(16, 1.5), 24);
  assert.equal(baselinePx(14, 1.4), 20);
});

test('rhythmScale emits steps 1 through 6', () => {
  const rhythm = rhythmScale(24);
  for (let n = 1; n <= 6; n++) {
    assert.deepEqual(rhythm[String(n)].$value, { value: 24 * n, unit: 'px' });
  }
});

test('spacingScale respects comfortable vs compact multiplier', () => {
  const comfortable = spacingScale(4, 'comfortable');
  const compact = spacingScale(4, 'compact');
  assert.deepEqual(comfortable['4'].$value, { value: 16, unit: 'px' });
  assert.deepEqual(compact['4'].$value, { value: 14, unit: 'px' });
});

test('radiusScale emits standard radius steps', () => {
  const radius = radiusScale({ sm: 4, md: 8, lg: 12, full: 9999 });
  assert.deepEqual(radius['sm'].$value, { value: 4, unit: 'px' });
  assert.deepEqual(radius['md'].$value, { value: 8, unit: 'px' });
  assert.deepEqual(radius['lg'].$value, { value: 12, unit: 'px' });
  assert.deepEqual(radius['full'].$value, { value: 9999, unit: 'px' });
});
