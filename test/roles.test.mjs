import assert from 'node:assert/strict';
import test from 'node:test';
import { AUDIT_PAIRS, SEMANTIC_ROLE_PATHS } from '../src/shared/roles.ts';

test('AUDIT_PAIRS contains exactly 42 canonical pairs', () => {
  assert.equal(AUDIT_PAIRS.length, 42);
});

test('AUDIT_PAIRS contains valid kinds and role paths', () => {
  const allowedKinds = new Set(['text', 'border', 'decorative']);
  for (const pair of AUDIT_PAIRS) {
    assert.ok(typeof pair.fg === 'string' && pair.fg.length > 0);
    assert.ok(typeof pair.bg === 'string' && pair.bg.length > 0);
    assert.ok(allowedKinds.has(pair.kind));
  }
});

test('SEMANTIC_ROLE_PATHS maps canonical semantic keys', () => {
  assert.equal(SEMANTIC_ROLE_PATHS.BG_CANVAS, 'semantic.color.bg.canvas');
  assert.equal(SEMANTIC_ROLE_PATHS.TEXT_PRIMARY, 'semantic.color.text.primary');
  assert.equal(SEMANTIC_ROLE_PATHS.ACTION_PRIMARY, 'semantic.color.action.primary');
  assert.equal(SEMANTIC_ROLE_PATHS.BORDER_DEFAULT, 'semantic.color.border.default');
});
