import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';
import { deepMerge, flattenTokens, loadTokenTree } from '../src/shared/tokens.ts';

test('deepMerge merges objects without mutating source', () => {
  const target = { a: { b: 1 }, c: 2 };
  const source = { a: { d: 3 }, e: 4 };
  const merged = deepMerge(target, source);
  assert.deepEqual(merged, { a: { b: 1, d: 3 }, c: 2, e: 4 });
  assert.deepEqual(source, { a: { d: 3 }, e: 4 });
});

test('flattenTokens tags owning tier and dotted path', () => {
  const tree = { color: { brand: { $value: '{color.neutral.500}' } } };
  const flat = flattenTokens(tree, '', 'semantic');
  assert.equal(flat.has('color.brand'), true);
  assert.deepEqual(flat.get('color.brand'), { value: '{color.neutral.500}', tier: 'semantic' });
});

test('loadTokenTree loads template tokens and resolves aliases with cycle detection', () => {
  const tokensDir = resolve('src/skills/token-math/templates/tokens');
  const tree = loadTokenTree(tokensDir, { theme: 'light' });
  assert.ok(tree.files.length > 0);
  assert.ok(tree.flat.size > 0);

  // Cycle detection:
  const unresolved = [];
  tree.flat.set('cycle.a', { value: '{cycle.b}', tier: 'semantic' });
  tree.flat.set('cycle.b', { value: '{cycle.a}', tier: 'semantic' });
  const cycleColor = tree.resolveColor('cycle.a', unresolved);
  assert.equal(cycleColor, undefined);
  assert.ok(unresolved.some((u) => u.includes('alias cycle')));

  // Raw value violations:
  tree.flat.set('bad.semantic', { value: '#ff0000', tier: 'semantic' });
  const violations = tree.checkRawValueViolations();
  assert.ok(violations.some((v) => v.includes('raw hex forbidden')));
});
