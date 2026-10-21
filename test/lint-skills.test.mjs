import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runLint } from '../scripts/lint-skills.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

test('runLint on repo root returns zero failures', () => {
  const failures = runLint({ root: repoRoot });
  assert.deepEqual(failures, []);
});

test('runLint reports missing frontmatter in SKILL.md', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-test-'));
  try {
    const skillDir = join(dir, 'src', 'skills', 'demo');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), '# No frontmatter', 'utf8');

    const failures = runLint({ root: dir });
    assert.ok(failures.some((f) => f.includes('demo: missing frontmatter block')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runLint reports version drift between plugin.json and package.json', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-version-'));
  try {
    const claudeDir = join(dir, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, 'plugin.json'), '{"version":"0.9.0"}', 'utf8');
    writeFileSync(join(dir, 'package.json'), '{"version":"1.0.0"}', 'utf8');

    const failures = runLint({ root: dir });
    assert.ok(failures.some((f) => f.includes('plugin.json: version "0.9.0" drifted')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runLint reports a <...-root> command without the literal-execution guard', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-guard-'));
  try {
    const skillDir = join(dir, 'src', 'skills', 'demo');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      `---\nname: demo\ndescription: 'Demo'\nlicense: MIT\ncompatibility: Node.js >=22.12\nallowed-tools: 'Bash Read'\n---\n\nnode <skill-root>/scripts/tool.mjs\n`,
      'utf8',
    );

    const failures = runLint({ root: dir });
    assert.ok(failures.some((f) => f.includes('literal-execution guard')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
