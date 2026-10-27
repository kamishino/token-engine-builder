import assert from 'node:assert/strict';
import test from 'node:test';
import { composeStyleSpec } from '../src/shared/extract.ts';

test('composeStyleSpec builds a three-role palette from evidence', () => {
  const composed = composeStyleSpec({
    candidates: [
      {
        color: { l: 0.55, c: 0.2, h: 262, alpha: 1 },
        score: 10,
        count: 2,
        name: 'primary',
        source: 'a.css',
      },
    ],
    tailwindColors: new Map([
      ['primary', { role: 'primary', color: { l: 0.55, c: 0.2, h: 262, alpha: 1 } }],
      ['secondary', { role: 'secondary', color: { l: 0.6, c: 0.1, h: 185, alpha: 1 } }],
      ['accent', { role: 'accent', color: { l: 0.77, c: 0.16, h: 70, alpha: 1 } }],
    ]),
    radiusCounts: new Map([[8, 3]]),
    fontFamily: 'Inter',
    projectName: 'demo',
  });
  assert.ok(composed !== null);
  assert.equal(composed.spec.palette.length, 3);
  assert.equal(composed.spec.palette[0].role, 'primary');
  assert.equal(composed.spec.name, 'demo');
  assert.equal(composed.spec.radius.md, 8);
  assert.equal(composed.spec.harmony, undefined);
});

test('composeStyleSpec returns null when there is no color evidence', () => {
  assert.equal(
    composeStyleSpec({
      candidates: [],
      tailwindColors: new Map(),
      radiusCounts: new Map(),
      projectName: 'x',
    }),
    null,
  );
});
