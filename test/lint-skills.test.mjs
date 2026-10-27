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

function makeValidSkill(skillDir, name = 'demo') {
  mkdirSync(join(skillDir, 'agents'), { recursive: true });
  writeFileSync(
    join(skillDir, 'agents', 'openai.yaml'),
    'interface:\n  display_name: Demo\n',
    'utf8',
  );
  writeFileSync(
    join(skillDir, 'SKILL.md'),
    `---
name: ${name}
description: 'Valid Demo'
license: MIT
compatibility: ">=node-22.12"
allowed-tools: "Bash Read"
---

# Demo

## Architecture: Seams and Decoupling

Interface and implementation.

## Process

### 1. First Step
Do something.
- **Done when**: Completed.

## Pre-Yield Checklist

- [ ] Check something.
`,
    'utf8',
  );
}

test('runLint reports disallowed frontmatter key', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-key-'));
  try {
    const skillDir = join(dir, 'src', 'skills', 'demo');
    makeValidSkill(skillDir);
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      `---\nname: demo\ndescription: 'Demo'\nlicense: MIT\ncompatibility: ">=node-22.12"\nallowed-tools: "Bash Read"\ndeprecated: "Use something else"\n---\n\n## Architecture: Seams and Decoupling\n\n## Process\n\n### 1. Step\n- **Done when**: done.\n\n## Pre-Yield Checklist\n- [ ] done\n`,
      'utf8',
    );
    const failures = runLint({ root: dir });
    assert.ok(failures.some((f) => f.includes('frontmatter key "deprecated" is not in the allowed keys')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runLint reports invalid license or compatibility format', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-lic-'));
  try {
    const skillDir = join(dir, 'src', 'skills', 'demo');
    makeValidSkill(skillDir);
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      `---\nname: demo\ndescription: 'Demo'\nlicense: Apache-2.0\ncompatibility: Node.js >=22.12\nallowed-tools: "Bash Read"\n---\n\n## Architecture: Seams and Decoupling\n\n## Process\n\n### 1. Step\n- **Done when**: done.\n\n## Pre-Yield Checklist\n- [ ] done\n`,
      'utf8',
    );
    const failures = runLint({ root: dir });
    assert.ok(failures.some((f) => f.includes('license must be "MIT"')));
    assert.ok(failures.some((f) => f.includes('compatibility must be ">=node-22.12"')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runLint reports invalid H2 headings order or missing heading', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-h2-'));
  try {
    const skillDir = join(dir, 'src', 'skills', 'demo');
    makeValidSkill(skillDir);
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      `---\nname: demo\ndescription: 'Demo'\nlicense: MIT\ncompatibility: ">=node-22.12"\nallowed-tools: "Bash Read"\n---\n\n## Process\n\n### 1. Step\n- **Done when**: done.\n\n## Pre-Yield Checklist\n- [ ] done\n`,
      'utf8',
    );
    const failures = runLint({ root: dir });
    assert.ok(failures.some((f) => f.includes('H2 headings must be exactly in order')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runLint reports unnumbered process step or missing Done when', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-h3-'));
  try {
    const skillDir = join(dir, 'src', 'skills', 'demo');
    makeValidSkill(skillDir);
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      `---\nname: demo\ndescription: 'Demo'\nlicense: MIT\ncompatibility: ">=node-22.12"\nallowed-tools: "Bash Read"\n---\n\n## Architecture: Seams and Decoupling\n\n## Process\n\n### Unnumbered Step\nNo exit criteria.\n\n## Pre-Yield Checklist\n- [ ] done\n`,
      'utf8',
    );
    const failures = runLint({ root: dir });
    assert.ok(failures.some((f) => f.includes('must match /^### \\d+\\. /')));
    assert.ok(failures.some((f) => f.includes('must contain "**Done when**:"')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runLint reports missing checkboxes in Pre-Yield Checklist', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-chk-'));
  try {
    const skillDir = join(dir, 'src', 'skills', 'demo');
    makeValidSkill(skillDir);
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      `---\nname: demo\ndescription: 'Demo'\nlicense: MIT\ncompatibility: ">=node-22.12"\nallowed-tools: "Bash Read"\n---\n\n## Architecture: Seams and Decoupling\n\n## Process\n\n### 1. Step\n- **Done when**: done.\n\n## Pre-Yield Checklist\nNothing checked.\n`,
      'utf8',
    );
    const failures = runLint({ root: dir });
    assert.ok(failures.some((f) => f.includes('Pre-Yield Checklist must contain at least one "- [ ]" item')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runLint reports broken relative link target', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-link-'));
  try {
    const skillDir = join(dir, 'src', 'skills', 'demo');
    makeValidSkill(skillDir);
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      `---\nname: demo\ndescription: 'Demo'\nlicense: MIT\ncompatibility: ">=node-22.12"\nallowed-tools: "Bash Read"\n---\n\n## Architecture: Seams and Decoupling\nSee [broken](references/nonexistent.md).\n\n## Process\n\n### 1. Step\n- **Done when**: done.\n\n## Pre-Yield Checklist\n- [ ] done\n`,
      'utf8',
    );
    const failures = runLint({ root: dir });
    assert.ok(failures.some((f) => f.includes('relative link target "references/nonexistent.md" does not exist on disk')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runLint reports missing agents/openai.yaml and forbidden README.md', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-files-'));
  try {
    const skillDir = join(dir, 'src', 'skills', 'demo');
    makeValidSkill(skillDir);
    rmSync(join(skillDir, 'agents', 'openai.yaml'));
    writeFileSync(join(skillDir, 'README.md'), '# Readme', 'utf8');
    const failures = runLint({ root: dir });
    assert.ok(failures.some((f) => f.includes('agents/openai.yaml is missing')));
    assert.ok(failures.some((f) => f.includes('README.md in skill directory is forbidden')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runLint reports plugin.json skills mismatch', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-plugin-'));
  try {
    const skillDir = join(dir, 'src', 'skills', 'demo');
    makeValidSkill(skillDir);
    const claudeDir = join(dir, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(
      join(claudeDir, 'plugin.json'),
      '{"version":"1.0.0","skills":[{"name":"other"}]}',
      'utf8',
    );
    writeFileSync(join(dir, 'package.json'), '{"version":"1.0.0"}', 'utf8');
    const failures = runLint({ root: dir });
    assert.ok(failures.some((f) => f.includes('does not match src/skills')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
