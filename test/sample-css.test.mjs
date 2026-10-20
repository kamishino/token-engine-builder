import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { diffGold } from '../scripts/sample-css.mjs';

test('diffGold reports empty array when files match exactly', () => {
  const root = mkdtempSync(join(tmpdir(), 'diff-gold-root-'));
  const workDir = mkdtempSync(join(tmpdir(), 'diff-gold-work-'));
  try {
    mkdirSync(join(root, 'src'), { recursive: true });
    mkdirSync(join(workDir, 'build'), { recursive: true });
    writeFileSync(join(root, 'src/gold.css'), ':root { --color: red; }\n', 'utf8');
    writeFileSync(join(workDir, 'build/tokens.css'), ':root { --color: red; }\n', 'utf8');

    const drifted = diffGold({
      root,
      workDir,
      pairs: [['build/tokens.css', 'src/gold.css']],
    });
    assert.deepEqual(drifted, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(workDir, { recursive: true, force: true });
  }
});

test('diffGold normalizes CRLF and LF differences without false drift', () => {
  const root = mkdtempSync(join(tmpdir(), 'diff-gold-root-'));
  const workDir = mkdtempSync(join(tmpdir(), 'diff-gold-work-'));
  try {
    mkdirSync(join(root, 'src'), { recursive: true });
    mkdirSync(join(workDir, 'build'), { recursive: true });
    writeFileSync(join(root, 'src/gold.css'), ':root {\r\n  --color: red;\r\n}\r\n', 'utf8');
    writeFileSync(join(workDir, 'build/tokens.css'), ':root {\n  --color: red;\n}\n', 'utf8');

    const drifted = diffGold({
      root,
      workDir,
      pairs: [['build/tokens.css', 'src/gold.css']],
    });
    assert.deepEqual(drifted, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(workDir, { recursive: true, force: true });
  }
});

test('diffGold detects and reports content drift', () => {
  const root = mkdtempSync(join(tmpdir(), 'diff-gold-root-'));
  const workDir = mkdtempSync(join(tmpdir(), 'diff-gold-work-'));
  try {
    mkdirSync(join(root, 'src'), { recursive: true });
    mkdirSync(join(workDir, 'build'), { recursive: true });
    writeFileSync(join(root, 'src/gold.css'), ':root { --color: red; }\n', 'utf8');
    writeFileSync(join(workDir, 'build/tokens.css'), ':root { --color: blue; }\n', 'utf8');

    const drifted = diffGold({
      root,
      workDir,
      pairs: [['build/tokens.css', 'src/gold.css']],
    });
    assert.equal(drifted.length, 1);
    assert.match(drifted[0], /build\/tokens\.css drifted from src\/gold\.css/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(workDir, { recursive: true, force: true });
  }
});
