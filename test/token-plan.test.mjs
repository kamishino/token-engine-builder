import assert from 'node:assert/strict';
import test from 'node:test';
import { loadStyleSpec } from '../src/shared/spec.ts';
import { planTokenFiles } from '../src/shared/token-plan.ts';

const EXAMPLE = 'src/skills/design-tokens/assets/style-spec.example.json';

test('planTokenFiles covers primitives and every semantic theme in write order', () => {
  const spec = loadStyleSpec(EXAMPLE).spec;
  const files = planTokenFiles(spec);
  assert.deepEqual(
    files.map((file) => file.segments.join('/')),
    [
      'primitive/color.tokens.json',
      'semantic/light.tokens.json',
      'semantic/dark.tokens.json',
      'semantic/high-contrast.tokens.json',
      'primitive/typography.tokens.json',
      'primitive/spacing.tokens.json',
      'primitive/radius.tokens.json',
    ],
  );
  const color = files[0].data;
  assert.equal(color.color.cerulean['500'].$type, 'color');
  assert.equal(color.color.neutral['500'].$type, 'color');
  assert.ok(color.color.feedback.success);
  assert.equal(color.color.cerulean['500'].$extensions['token-engine'].role, 'primary');
  assert.equal(color.color.amethyst['500'].$extensions['token-engine'].role, 'secondary');
  assert.equal(color.color.sky['500'].$extensions['token-engine'].role, 'accent');
  assert.equal(color.color.cerulean['700'].$extensions, undefined);
  assert.equal(color.color.neutral['500'].$extensions, undefined);
  assert.equal(color.color.feedback.success['500'].$extensions, undefined);
  const typography = files[4].data;
  assert.equal(typography['font-family'].sans.$value, spec.typography.fontFamily);
  assert.ok(typography['font-size'].base);
  const spacing = files[5].data;
  assert.ok(spacing.spacing['1']);
  const radius = files[6].data;
  assert.ok(radius.radius.md);
});
