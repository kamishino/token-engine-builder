import assert from 'node:assert/strict';
import test from 'node:test';
import { buildVisualizerModel } from '../src/shared/compiler.ts';

test('buildVisualizerModel constructs ramps and cssVars from dictionary', () => {
  const model = buildVisualizerModel(
    {
      allTokens: [
        { name: 'primary-500', path: ['color', 'brand', '500'], $value: 'oklch(60% 0.15 250)' },
        { name: 'canvas', path: ['semantic', 'color', 'bg', 'canvas'], $value: '#ffffff' },
        { name: 'surface', path: ['semantic', 'color', 'bg', 'surface'], $value: '#f8f9fa' },
        { name: 'text', path: ['semantic', 'color', 'text', 'primary'], $value: '#111827' },
      ],
    },
    { label: 'light', guide: { name: 'Model Test Brand' } },
  );

  assert.equal(model.name, 'Model Test Brand');
  assert.equal(model.label, 'light');
  assert.equal(model.ramps.length, 1);
  assert.equal(model.ramps[0].group, 'brand');
  assert.equal(model.ramps[0].steps.length, 1);
  assert.equal(model.ramps[0].steps[0].step, '500');
  assert.equal(model.cssVars.bg, '#ffffff');
  assert.equal(model.cssVars.surface, '#f8f9fa');
  assert.equal(model.cssVars.text, '#111827');
  // Optional fallback
  assert.equal(model.cssVars.border, '#e5e7eb');
});
