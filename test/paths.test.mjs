import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { resolveSkillPathPlaceholders } from '../src/shared/paths.ts';

test('resolves <skill-root> and co-located sibling roots', () => {
  const dir = mkdtempSync(join(tmpdir(), 'paths-'));
  try {
    const skillA = join(dir, 'skill-a');
    const skillB = join(dir, 'skill-b');
    mkdirSync(join(skillA, 'scripts'), { recursive: true });
    mkdirSync(join(skillB, 'scripts'), { recursive: true });
    const meta = pathToFileURL(join(skillA, 'scripts', 'tool.mjs')).href;

    assert.equal(
      resolveSkillPathPlaceholders('node <skill-root>/scripts/tool.mjs', meta),
      `node ${skillA}/scripts/tool.mjs`,
    );
    assert.equal(
      resolveSkillPathPlaceholders('node <skill-b-root>/scripts/other.mjs', meta),
      `node ${skillB}/scripts/other.mjs`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('leaves a missing sibling placeholder intact', () => {
  const dir = mkdtempSync(join(tmpdir(), 'paths-'));
  try {
    const skillA = join(dir, 'skill-a');
    mkdirSync(join(skillA, 'scripts'), { recursive: true });
    const meta = pathToFileURL(join(skillA, 'scripts', 'tool.mjs')).href;

    assert.equal(
      resolveSkillPathPlaceholders('node <missing-root>/scripts/tool.mjs', meta),
      'node <missing-root>/scripts/tool.mjs',
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('retains placeholder when sibling points to a development worktree', () => {
  const dir = mkdtempSync(join(tmpdir(), 'token-engine-builder-'));
  try {
    const distDir = join(dir, 'token-engine-builder', 'dist');
    const skillA = join(distDir, 'token-math');
    const skillB = join(distDir, 'token-audit');
    mkdirSync(join(skillA, 'scripts'), { recursive: true });
    mkdirSync(join(skillB, 'scripts'), { recursive: true });
    const meta = pathToFileURL(join(skillA, 'scripts', 'generate.mjs')).href;

    assert.equal(
      resolveSkillPathPlaceholders('node <token-audit-root>/scripts/audit.mjs', meta),
      'node <token-audit-root>/scripts/audit.mjs',
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolves sibling via AGENT_SKILLS_DIR when present', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-skills-'));
  const prevEnv = process.env.AGENT_SKILLS_DIR;
  try {
    const skillB = join(dir, 'token-audit');
    mkdirSync(join(skillB, 'scripts'), { recursive: true });
    process.env.AGENT_SKILLS_DIR = dir;
    const meta = pathToFileURL(join(tmpdir(), 'other', 'scripts', 'tool.mjs')).href;

    assert.equal(
      resolveSkillPathPlaceholders('node <token-audit-root>/scripts/audit.mjs', meta),
      `node ${skillB}/scripts/audit.mjs`,
    );
  } finally {
    if (prevEnv === undefined) delete process.env.AGENT_SKILLS_DIR;
    else process.env.AGENT_SKILLS_DIR = prevEnv;
    rmSync(dir, { recursive: true, force: true });
  }
});
