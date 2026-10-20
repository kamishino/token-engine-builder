import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { discoverScriptEntries } from '../scripts/build-engine.mjs';
import { SCRIPT_KEYS, SCRIPTS, usageText } from '../src/shared/cli-flags.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

test('every shipped script entry is declared in SCRIPTS', () => {
  const { scriptEntries } = discoverScriptEntries(join(repoRoot, 'src', 'skills'));
  const shipped = scriptEntries.map(({ skill, script }) => `${skill}/scripts/${script}.mjs`).sort();
  assert.deepEqual([...SCRIPT_KEYS].sort(), shipped);
  for (const key of SCRIPT_KEYS) {
    assert.ok(SCRIPTS[key].flags.length > 0, `${key} declares no flags`);
  }
});

test('usageText renders required, optional, and boolean flags', () => {
  assert.equal(
    usageText('token-math/scripts/generate.mjs'),
    'Usage: generate.mjs --spec <style-spec.json> --out <tokens-dir> [--force] [--dry-run]',
  );
  assert.equal(
    usageText('token-extract/scripts/extract.mjs'),
    'Usage: extract.mjs [--root <dir>] [--url <url>] [--html <file.html>] [--out <style-spec.json>] [--force] [--dry-run]',
  );
  assert.equal(
    usageText('token-audit/scripts/audit.mjs'),
    'Usage: audit.mjs --tokens <dir> [--theme light|dark|both] [--min-ratio 4.5] [--min-apca 60] [--spec <style-spec.json>] [--json]',
  );
  assert.ok(usageText('token-build/scripts/figma.mjs').includes('--from-figma'));
});
