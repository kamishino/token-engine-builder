import assert from 'node:assert/strict';
import test from 'node:test';
import { oklchToHex, parseToOklch } from '../src/shared/colors.ts';
import { buildVisualizerModel } from '../src/shared/compiler.ts';
import { renderVisualizerHtml } from '../src/shared/visualizer.ts';
test('buildVisualizerModel constructs ramps and cssVars from dictionary', () => {
  const model = buildVisualizerModel(
    {
      allTokens: [
        { name: 'primary-500', path: ['color', 'brand', '500'], $value: 'oklch(60% 0.15 250)' },
        { name: 'danger-500', path: ['color', 'feedback', 'danger', '500'], $value: 'oklch(52% 0.22 25)' },
        {
          name: 'action-primary',
          path: ['semantic', 'color', 'action', 'primary'],
          $value: 'oklch(60% 0.15 250)',
          original: { $value: '{color.brand.500}' },
        },
        { name: 'canvas', path: ['semantic', 'color', 'bg', 'canvas'], $value: '#ffffff' },
        { name: 'surface', path: ['semantic', 'color', 'bg', 'surface'], $value: '#f8f9fa' },
        { name: 'text', path: ['semantic', 'color', 'text', 'primary'], $value: '#111827' },
        { name: 'font-sans', path: ['font-family', 'sans'], $value: 'Inter, sans-serif' },
        { name: 'size-base', path: ['font-size', 'base'], $value: '1rem' },
        { name: 'lh-base', path: ['line-height', 'base'], $value: '1.5' },
        { name: 'weight-bold', path: ['font-weight', 'bold'], $value: '700' },
      ],
    },
    { label: 'light', guide: { name: 'Model Test Brand' } },
  );

  assert.equal(model.name, 'Model Test Brand');
  assert.equal(model.label, 'light');
  assert.equal(model.ramps.length, 2);
  const brandRamp = model.ramps.find((r) => r.group === 'brand');
  const dangerRamp = model.ramps.find((r) => r.group === 'feedback-danger');
  assert.ok(brandRamp, 'brand ramp exists');
  assert.ok(dangerRamp, 'feedback-danger ramp exists');
  assert.equal(dangerRamp.steps[0].step, '500');

  assert.equal(brandRamp.steps[0].step, '500');
  assert.equal(brandRamp.steps[0].hex, oklchToHex(parseToOklch('oklch(60% 0.15 250)')));
  assert.deepEqual(brandRamp.steps[0].semantics, ['semantic.color.action.primary']);

  const actionGroup = model.semantics.find((g) => g.group === 'action');
  assert.ok(actionGroup, 'action group exists in semantics');
  const actionPrimary = actionGroup.roles.find((r) => r.path === 'semantic.color.action.primary');
  assert.ok(actionPrimary, 'action.primary role exists');
  assert.equal(actionPrimary.source, 'color.brand.500');

  assert.equal(model.typography.fontFamily, 'Inter, sans-serif');
  const baseStep = model.typography.steps.find((s) => s.step === 'base');
  assert.ok(baseStep, 'base typography step exists');
  assert.equal(baseStep.fontSize, '1rem');
  assert.equal(baseStep.lineHeight, '1.5');
  const boldWeight = model.typography.weights.find((w) => w.name === 'bold');
  assert.ok(boldWeight, 'bold weight exists');
  assert.equal(boldWeight.value, '700');
  assert.equal(model.cssVars.bg, '#ffffff');
  assert.equal(model.cssVars.surface, '#f8f9fa');
  assert.equal(model.cssVars.text, '#111827');
  // Optional fallback
  assert.equal(model.cssVars.border, '#e5e7eb');
});

test('renderVisualizerHtml embeds the model values in the document', () => {
  const populatedHtml = renderVisualizerHtml({
    name: 'Render Test',
    label: 'light',
    ramps: [
      {
        group: 'brand',
        steps: [
          {
            step: '500',
            value: 'oklch(60% 0.15 250deg)',
            hex: '#2563eb',
            semantics: ['semantic.color.action.primary'],
          },
        ],
      },
    ],
    semantics: [
      {
        group: 'action',
        roles: [
          {
            path: 'semantic.color.action.primary',
            value: 'oklch(60% 0.15 250deg)',
            hex: '#2563eb',
            source: 'color.brand.500',
          },
        ],
      },
    ],
    typography: {
      fontFamily: 'Inter, sans-serif',
      steps: [{ step: 'base', fontSize: '1rem', lineHeight: '1.5' }],
      weights: [{ name: 'bold', value: '700' }],
    },
    cssVars: {
      bg: '#ffffff',
      surface: '#f8f9fa',
      text: '#111827',
      textMuted: '#6b7280',
      primary: '#2563eb',
      primaryText: '#ffffff',
      border: '#e5e7eb',
      radius: '8px',
      font: 'Inter, sans-serif',
    },
  });
  assert.ok(populatedHtml.startsWith('<!DOCTYPE html>'));
  assert.ok(populatedHtml.includes('<h2>1. Color Ramps</h2>'));
  assert.ok(populatedHtml.includes('<h2>2. Semantic Colors</h2>'));
  assert.ok(populatedHtml.includes('<h2>3. Typography</h2>'));
  assert.ok(populatedHtml.includes('<h2>4. Component Specimens</h2>'));
  assert.ok(populatedHtml.includes('#2563eb'));
  assert.ok(populatedHtml.includes('action.primary'));
  assert.ok(populatedHtml.includes('font-size:1rem'));
  assert.ok(populatedHtml.includes('oklch(60% 0.15 250deg)'));
  assert.ok(populatedHtml.includes('--primary: #2563eb;'));

  const emptyHtml = renderVisualizerHtml({
    name: 'Empty Test',
    label: 'dark',
    ramps: [],
    semantics: [],
    typography: { fontFamily: 'sans-serif', steps: [], weights: [] },
    cssVars: {
      bg: '#000000',
      surface: '#111111',
      text: '#ffffff',
      textMuted: '#888888',
      primary: '#3b82f6',
      primaryText: '#ffffff',
      border: '#333333',
      radius: '4px',
      font: 'sans-serif',
    },
  });
  assert.ok(emptyHtml.includes('No color ramp tokens in this theme.'));
  assert.ok(emptyHtml.includes('No semantic color tokens in this theme.'));
  assert.ok(emptyHtml.includes('No typography tokens in this theme.'));
});
