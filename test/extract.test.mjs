import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runExtract } from '../src/skills/token-extract/scripts/extract.ts';

test('runExtract extracts palette with primary, secondary, and accent roles from CSS', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'extract-test-'));
  try {
    const cssPath = join(dir, 'styles.css');
    writeFileSync(
      cssPath,
      `
      :root {
        --color-primary: #2563eb;
        --color-secondary: #0d9488;
        --color-accent: #f59e0b;
        --radius: 8px;
        font-family: Inter, sans-serif;
      }
    `,
      'utf8',
    );

    const outSpecPath = join(dir, 'style-spec.json');
    const exitCode = await runExtract(['--root', dir, '--out', outSpecPath, '--force']);

    assert.equal(exitCode, 0);
    const spec = JSON.parse(readFileSync(outSpecPath, 'utf8'));
    assert.equal(spec.palette.length, 3);
    assert.equal(spec.palette[0].role, 'primary');
    assert.equal(spec.palette[1].role, 'secondary');
    assert.equal(spec.palette[2].role, 'accent');
    assert.equal(spec.harmony, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runExtract returns 1 on project with no color signals without terminating process', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'extract-empty-'));
  try {
    const outSpecPath = join(dir, 'style-spec.json');
    const exitCode = await runExtract(['--root', dir, '--out', outSpecPath, '--force']);
    assert.equal(exitCode, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runExtract emits harmony analogous when secondary and accent are synthesized', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'extract-single-'));
  try {
    const cssPath = join(dir, 'styles.css');
    writeFileSync(
      cssPath,
      `
      :root {
        --color-primary: #2563eb;
        font-family: Inter, sans-serif;
      }
    `,
      'utf8',
    );

    const outSpecPath = join(dir, 'style-spec.json');
    const exitCode = await runExtract(['--root', dir, '--out', outSpecPath, '--force']);

    assert.equal(exitCode, 0);
    const spec = JSON.parse(readFileSync(outSpecPath, 'utf8'));
    assert.equal(spec.palette.length, 3);
    assert.equal(spec.harmony, 'analogous');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
