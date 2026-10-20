import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

test('loadTokenTree loads tokens and resolves aliases with cycle detection', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tokens-test-'));
  try {
    mkdirSync(join(dir, 'primitive'), { recursive: true });
    mkdirSync(join(dir, 'semantic'), { recursive: true });
    mkdirSync(join(dir, 'component'), { recursive: true });
    writeFileSync(
      join(dir, 'primitive', 'color.tokens.json'),
      JSON.stringify({
        color: { cerulean: { 500: { $value: 'oklch(60% 0.15 250)', $type: 'color' } } },
      }),
    );
    writeFileSync(
      join(dir, 'semantic', 'light.tokens.json'),
      JSON.stringify({
        semantic: {
          color: { action: { primary: { $value: '{color.cerulean.500}', $type: 'color' } } },
        },
      }),
    );
    writeFileSync(
      join(dir, 'component', 'button.tokens.json'),
      JSON.stringify({
        component: {
          button: { bg: { $value: '{semantic.color.action.primary}', $type: 'color' } },
        },
      }),
    );

    const tree = loadTokenTree(dir, { theme: 'light' });
    assert.equal(tree.files.length, 3);
    assert.ok(tree.flat.size >= 3);

    const unresolved = [];
    const resolved = tree.resolveColor('component.button.bg', unresolved);
    assert.ok(resolved !== undefined);
    assert.equal(resolved.h, 250);

    // Cycle detection:
    tree.flat.set('cycle.a', { value: '{cycle.b}', tier: 'semantic' });
    tree.flat.set('cycle.b', { value: '{cycle.a}', tier: 'semantic' });
    const cycleColor = tree.resolveColor('cycle.a', unresolved);
    assert.equal(cycleColor, undefined);
    assert.ok(unresolved.some((u) => u.includes('alias cycle')));

    // Raw value violations:
    tree.flat.set('bad.semantic', { value: '#ff0000', tier: 'semantic' });
    const violations = tree.checkRawValueViolations();
    assert.ok(violations.some((v) => v.includes('raw hex forbidden')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
