import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dtcgTokensToFigma,
  figmaVariablesToDtcg,
} from '../src/skills/token-build/scripts/figma.ts';

test('dtcgTokensToFigma exports dimension objects to FLOAT and returns loss reports', () => {
  const tree = {
    alias: {
      action: {
        $value: '{color.primary}',
        $type: 'color',
      },
    },
    spacing: {
      lg: {
        $value: { value: 24, unit: 'px' },
        $type: 'dimension',
        $description: 'Large spacing',
      },
      remStep: {
        $value: '1.5rem',
        $type: 'dimension',
      },
    },
    color: {
      brand: {
        $value: 'oklch(60% 0.15 250)',
        $type: 'color',
      },
    },
  };

  const { variables, losses } = dtcgTokensToFigma(tree);
  assert.equal(variables.length, 4);
  assert.ok(losses.length > 0);
  assert.ok(losses.some((l) => l.includes('alias')));

  const dimVar = variables.find((v) => v.name === 'spacing/lg');
  assert.ok(dimVar !== undefined);
  assert.equal(dimVar.resolvedType, 'FLOAT');
  assert.equal(dimVar.valuesByMode['1:0'], 24);

  const remVar = variables.find((v) => v.name === 'spacing/remStep');
  assert.ok(remVar !== undefined);
  assert.equal(remVar.resolvedType, 'FLOAT');
  assert.equal(remVar.valuesByMode['1:0'], 24);

  const colorVar = variables.find((v) => v.name === 'color/brand');
  assert.ok(colorVar !== undefined);
  assert.equal(colorVar.resolvedType, 'COLOR');
});

test('figmaVariablesToDtcg reconstructs DTCG tokens from Figma variables', () => {
  const figmaVars = [
    {
      id: 'VariableID:1',
      name: 'radius/md',
      key: 'radius_md',
      variableCollectionId: 'VariableCollectionId:1:1',
      resolvedType: 'FLOAT',
      description: 'Medium radius',
      valuesByMode: { '1:0': 8 },
    },
    {
      id: 'VariableID:2',
      name: 'color/primary',
      key: 'color_primary',
      variableCollectionId: 'VariableCollectionId:1:1',
      resolvedType: 'COLOR',
      description: 'Primary brand color',
      valuesByMode: { '1:0': { r: 0.1, g: 0.5, b: 0.9, a: 1 } },
    },
  ];

  const { tokensTree: tokens, losses } = figmaVariablesToDtcg(figmaVars);
  assert.equal(Array.isArray(losses), true);
  assert.ok(tokens.radius && typeof tokens.radius === 'object');
  assert.deepEqual(tokens.radius.md, {
    $value: '8px',
    $type: 'dimension',
    $description: 'Medium radius',
  });
  assert.ok(tokens.color && typeof tokens.color === 'object');
  assert.equal(tokens.color.primary.$type, 'color');
});
