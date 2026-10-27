import assert from 'node:assert/strict';
import test from 'node:test';
import { COMMAND_KEYS, COMMANDS, usageText } from '../src/shared/cli-flags.ts';

test('every subcommand is declared in COMMANDS', () => {
  assert.equal(COMMAND_KEYS.length, 10);
  for (const key of COMMAND_KEYS) {
    assert.ok(COMMANDS[key].flags.length > 0, `${key} declares no flags`);
  }
});

test('usageText renders required, optional, and boolean flags', () => {
  assert.equal(
    usageText('generate'),
    'Usage: token-engine generate [--spec <tokens.config.json>] [--out <tokens-dir>] [--force] [--dry-run]',
  );
  assert.equal(
    usageText('extract'),
    'Usage: token-engine extract [--root <dir>] [--url <url>] [--html <file.html>] [--out <tokens.config.json>] [--audit-baseline] [--out-baseline <path>] [--force] [--dry-run]',
  );
  assert.equal(
    usageText('audit'),
    'Usage: token-engine audit [--tokens <dir>] [--theme light|dark|both] [--min-ratio 4.5] [--min-apca 60] [--spec <tokens.config.json>] [--baseline <pre-audit-baseline.json>] [--json]',
  );
  assert.ok(usageText('figma').includes('--from-figma'));
});
