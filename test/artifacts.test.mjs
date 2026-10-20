import assert from 'node:assert/strict';
import test from 'node:test';
import { ARTIFACT_NAMES, artifactNames, artifactPaths, ARTIFACTS } from '../src/shared/compiler.ts';

test('artifact manifest is the single source for emitted and guarded names', () => {
  assert.deepEqual(artifactNames({}), ['tokens.css', 'theme.css', 'components.md', 'DESIGN.md']);
  assert.deepEqual(artifactNames({ visualizer: true }), [
    'tokens.css',
    'theme.css',
    'components.md',
    'DESIGN.md',
    'visualizer.html',
  ]);
  assert.deepEqual(ARTIFACT_NAMES, [
    'tokens.css',
    'theme.css',
    'components.md',
    'DESIGN.md',
    'visualizer.html',
  ]);
  assert.equal(ARTIFACTS.find((a) => a.name === 'visualizer.html')?.optional, true);
  assert.equal(artifactPaths('/out', {})[0], '/out/tokens.css');
  assert.equal(artifactPaths('/out/', {})[0], '/out/tokens.css');
});
