import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AUDIT_PAIRS,
  FEEDBACK_ROLES,
  feedbackBgPath,
  feedbackTextPath,
  paletteRoleExtensions,
  paletteRoleOf,
  SEMANTIC_COLOR_ROLES,
  SEMANTIC_ROLE_PATHS,
  TOKEN_ENGINE_EXTENSION,
} from '../src/shared/roles.ts';

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

test('FEEDBACK_ROLES and feedback path generators produce canonical paths', () => {
  assert.deepEqual(FEEDBACK_ROLES, ['success', 'warning', 'danger', 'info', 'help']);
  assert.equal(feedbackBgPath('danger'), 'semantic.color.feedback.danger.bg');
  assert.equal(feedbackTextPath('danger'), 'semantic.color.feedback.danger.text');
  assert.equal(SEMANTIC_ROLE_PATHS.TEXT_INVERSE, 'semantic.color.text.inverse');
});

test('SEMANTIC_COLOR_ROLES covers every semantic path exactly once', () => {
  const paths = SEMANTIC_COLOR_ROLES.map((role) => role.path).sort();
  assert.equal(paths.length, 17);
  assert.equal(new Set(paths).size, paths.length);
  for (const role of SEMANTIC_COLOR_ROLES) {
    assert.equal(role.path, `semantic.color.${role.keys.join('.')}`);
  }
  assert.deepEqual(paths, Object.values(SEMANTIC_ROLE_PATHS).sort());
});

test('paletteRoleOf reads the structured role marker', () => {
  const anchor = { $extensions: { [TOKEN_ENGINE_EXTENSION]: { role: 'primary' } } };
  assert.equal(paletteRoleOf(anchor), 'primary');
  assert.equal(paletteRoleOf({}), undefined);
  assert.equal(
    paletteRoleOf({ $extensions: { [TOKEN_ENGINE_EXTENSION]: { role: 7 } } }),
    undefined,
  );
  assert.equal(paletteRoleOf({ $extensions: { [TOKEN_ENGINE_EXTENSION]: null } }), undefined);
  assert.deepEqual(paletteRoleExtensions('secondary'), {
    [TOKEN_ENGINE_EXTENSION]: { role: 'secondary' },
  });
});
