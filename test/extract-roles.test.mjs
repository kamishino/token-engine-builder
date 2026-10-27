import assert from 'node:assert/strict';
import test from 'node:test';
import { roleForColorName } from '../src/shared/extract.ts';

test('roleForColorName classifies both Tailwind naming schemes', () => {
  assert.equal(roleForColorName('primary'), 'primary');
  assert.equal(roleForColorName('brand'), 'primary');
  assert.equal(roleForColorName('primary-500'), 'primary');
  assert.equal(roleForColorName('secondary'), 'secondary');
  assert.equal(roleForColorName('accent'), 'accent');
  assert.equal(roleForColorName('accent-500'), 'accent');
  assert.equal(roleForColorName('--color-secondary'), 'secondary');
  assert.equal(roleForColorName('color-accent'), 'accent');
  assert.equal(roleForColorName('surface'), undefined);
});
