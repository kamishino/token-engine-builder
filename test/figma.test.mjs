import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { EXIT } from '../src/shared/exit-codes.ts';
import { checkTokensProvenance, sha256Hex, TOKENS_MANIFEST_NAME } from '../src/shared/guard.ts';
import {
  dtcgTokensToFigma,
  figmaVariablesToDtcg,
  fromFigmaFile,
  loadTokenTrees,
  runFigma,
  toFigmaFile,
} from '../src/shared/figma.ts';

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
      emStep: {
        $value: { value: 2, unit: 'em' },
        $type: 'dimension',
      },
    },
    color: {
      brand: {
        $value: 'oklch(60% 0.15 250)',
        $type: 'color',
      },
      shortHex: {
        $value: '#fff',
        $type: 'color',
      },
    },
  };

  const { variables, losses } = dtcgTokensToFigma([tree]);
  assert.equal(variables.length, 6);
  assert.ok(losses.length > 0);
  assert.ok(losses.some((l) => l.kind === 'alias'));
  assert.ok(losses.some((l) => l.kind === 'precision'));
  assert.ok(losses.some((l) => l.kind === 'dimension'));

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
  const shortVar = variables.find((v) => v.name === 'color/shortHex');
  assert.ok(shortVar !== undefined);
  assert.deepEqual(shortVar.valuesByMode['1:0'], { r: 1, g: 1, b: 1, a: 1 });
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
    {
      id: 'VariableID:3',
      name: 'flags/active',
      key: 'flags_active',
      variableCollectionId: 'VariableCollectionId:1:1',
      resolvedType: 'BOOLEAN',
      description: 'Active flag',
      valuesByMode: { '1:0': true, '1:1': false },
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
  assert.ok(losses.some((l) => l.kind === 'mode'));
  assert.ok(losses.some((l) => l.kind === 'type'));
  assert.ok(losses.some((l) => l.kind === 'precision'));
});

test('loadTokenTrees reports unreadable files as typed losses', () => {
  const loaded = loadTokenTrees(['does-not-exist.tokens.json']);
  assert.equal(loaded.trees.length, 0);
  assert.equal(loaded.losses[0]?.kind, 'unreadable');
});

test('toFigmaFile and fromFigmaFile round-trip the REST envelope', () => {
  const variables = [
    {
      id: 'VariableID:1',
      name: 'color/primary',
      key: 'color_primary',
      variableCollectionId: 'VariableCollectionId:1:1',
      resolvedType: 'COLOR',
      description: 'Primary',
      valuesByMode: { '1:0': { r: 0.1, g: 0.5, b: 0.9, a: 1 } },
    },
  ];
  const file = toFigmaFile(variables);
  assert.equal(
    file.meta.variableCollections['VariableCollectionId:1:1']?.name,
    'Design Tokens (DTCG)',
  );
  assert.equal(file.meta.variableCollections['VariableCollectionId:1:1']?.defaultModeId, '1:0');
  const parsed = fromFigmaFile(file);
  assert.deepEqual(parsed.variables, variables);
  assert.deepEqual(parsed.losses, []);
});

test('fromFigmaFile reports a payload loss for malformed meta', () => {
  const parsed = fromFigmaFile({ meta: { variables: [] } });
  assert.equal(parsed.variables.length, 0);
  assert.equal(parsed.losses[0]?.kind, 'payload');
  assert.equal(parsed.losses[0]?.path, 'meta.variables');
});

test('dtcgTokensToFigma gives every variable a stable id and slash-free key', () => {
  const tree = {
    a: { b: { $value: '#112233', $type: 'color' } },
    c: { d: { $value: '{a.b}', $type: 'color' } },
  };
  const { variables } = dtcgTokensToFigma([tree]);
  assert.deepEqual(
    variables.map((variable) => variable.id),
    ['VariableID:1', 'VariableID:2'],
  );
  assert.deepEqual(
    variables.map((variable) => variable.key),
    ['a_b', 'c_d'],
  );
  assert.ok(variables.every((variable) => !variable.key.includes('/')));
});

test('runFigma from-figma import writes provenance and enforces --force on existing targets', () => {
  const dir = mkdtempSync(join(tmpdir(), 'figma-import-guard-'));
  try {
    const figmaJsonPath = join(dir, 'figma.json');
    const payload = toFigmaFile([
      {
        id: 'VariableID:1',
        name: 'color/primary',
        key: 'color_primary',
        variableCollectionId: 'VariableCollectionId:1:1',
        resolvedType: 'COLOR',
        description: 'Primary',
        valuesByMode: { '1:0': { r: 0.1, g: 0.5, b: 0.9, a: 1 } },
      },
    ]);
    const payloadBytes = JSON.stringify(payload, null, 2);
    writeFileSync(figmaJsonPath, payloadBytes, 'utf8');

    const outTokensDir = join(dir, 'tokens');
    assert.equal(runFigma(['--from-figma', figmaJsonPath, '--out', outTokensDir]), 0);

    const report = checkTokensProvenance(outTokensDir);
    assert.equal(report.status, 'clean');

    const manifest = JSON.parse(readFileSync(join(outTokensDir, TOKENS_MANIFEST_NAME), 'utf8'));
    assert.equal(manifest.inputHash, sha256Hex(payloadBytes));

    assert.equal(runFigma(['--from-figma', figmaJsonPath, '--out', outTokensDir]), EXIT.REFUSAL);

    writeFileSync(join(outTokensDir, 'primitive', 'figma-imported.tokens.json'), 'tampered', 'utf8');
    assert.equal(runFigma(['--from-figma', figmaJsonPath, '--out', outTokensDir]), EXIT.REFUSAL);

    assert.equal(runFigma(['--from-figma', figmaJsonPath, '--out', outTokensDir, '--force']), 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
