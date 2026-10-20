import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  crc32,
  planArtifacts,
  planRelease,
  runPackage,
  SBOM_ROOTS,
  sbomComponents,
  SKILL_BUCKETS,
  writeZip,
} from '../scripts/package-release.mjs';

test('crc32 matches standard IEEE 802.3 test vector', () => {
  const buf = Buffer.from('123456789', 'utf8');
  assert.equal(crc32(buf), 0xcbf43926);
});

test('writeZip creates valid zip archive with local file headers', () => {
  const dir = mkdtempSync(join(tmpdir(), 'release-test-'));
  try {
    const fileA = join(dir, 'a.txt');
    writeFileSync(fileA, 'hello world', 'utf8');

    const outZip = join(dir, 'test.zip');
    writeZip([{ path: fileA, arc: 'files/a.txt' }], outZip);

    const zipBytes = readFileSync(outZip);
    assert.ok(zipBytes.length > 30);
    // Standard ZIP signature PK\x03\x04
    assert.equal(zipBytes[0], 0x50);
    assert.equal(zipBytes[1], 0x4b);
    assert.equal(zipBytes[2], 0x03);
    assert.equal(zipBytes[3], 0x04);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runPackage with --dry-run completes cleanly without touching disk', () => {
  const code = runPackage(['--dry-run', '--skip-build']);
  assert.equal(code, 0);
});

test('runPackage packages all buckets, bundle, SBOM, and checksums into isolated root', () => {
  const dir = mkdtempSync(join(tmpdir(), 'release-root-test-'));
  try {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'test-pkg', version: '2.0.0', license: 'MIT' }),
      'utf8',
    );
    writeFileSync(
      join(dir, 'package-lock.json'),
      JSON.stringify({ name: 'test-pkg', version: '2.0.0', packages: {} }),
      'utf8',
    );
    mkdirSync(join(dir, '.claude'), { recursive: true });
    writeFileSync(join(dir, '.claude', 'plugin.json'), '{"name":"test"}', 'utf8');

    const skills = ['token-style', 'token-extract', 'token-math', 'token-audit', 'token-build'];
    for (const s of skills) {
      const sDir = join(dir, 'dist', s);
      mkdirSync(sDir, { recursive: true });
      writeFileSync(join(sDir, 'SKILL.md'), `# ${s}`, 'utf8');
    }

    const code = runPackage(['--skip-build'], { root: dir });
    assert.equal(code, 0);

    assert.ok(existsSync(join(dir, 'release', 'token-engine-builder-v2.0.0.zip')));
    assert.ok(existsSync(join(dir, 'release', 'token-engine-creation-v2.0.0.zip')));
    assert.ok(existsSync(join(dir, 'release', 'token-engine-governance-v2.0.0.zip')));
    assert.ok(existsSync(join(dir, 'release', 'token-engine-builder-v2.0.0.cyclonedx.json')));
    assert.ok(existsSync(join(dir, 'release', 'SHA256SUMS.txt')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('planRelease returns complete release plan and respects keyPresent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'release-plan-test-'));
  try {
    writeFileSync(join(dir, 'package-lock.json'), '{}', 'utf8');
    const skills = ['token-style', 'token-extract', 'token-math', 'token-audit', 'token-build'];
    for (const s of skills) {
      mkdirSync(join(dir, 'src', 'skills', s), { recursive: true });
    }
    assert.ok(SKILL_BUCKETS.creation.includes('token-style'));
    assert.ok(SKILL_BUCKETS.governance.includes('token-audit'));
    const planWithoutKey = planRelease(dir, '1.5.0', { keyPresent: false });
    assert.equal(planWithoutKey.skills.length, 5);
    assert.equal(planWithoutKey.artifacts.length, 10);
    assert.ok(planWithoutKey.artifacts.some((a) => a.kind === 'sbom' && a.name.includes('1.5.0')));
    assert.ok(!planWithoutKey.artifacts.some((a) => a.kind === 'signature'));
    assert.equal(planArtifacts(dir, '1.5.0', { keyPresent: false }).length, 10);

    const planWithKey = planRelease(dir, '1.5.0', { keyPresent: true });
    assert.equal(planWithKey.artifacts.length, 11);
    assert.ok(
      planWithKey.artifacts.some((a) => a.kind === 'signature' && a.name.endsWith('.minisig')),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('planRelease throws on root with no skills', () => {
  const dir = mkdtempSync(join(tmpdir(), 'release-empty-test-'));
  try {
    assert.throws(() => planRelease(dir, '1.5.0'), /no skills found under/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('sbomComponents extracts sorted roots and transitives from lockfile', () => {
  const mockLock = {
    packages: {
      'node_modules/colorjs.io': { version: '0.7.1', license: 'MIT' },
      'node_modules/style-dictionary': {
        version: '5.7.0',
        license: 'Apache-2.0',
        dependencies: { '@types/node': '^22.0.0' },
      },
      'node_modules/@types/node': { version: '22.0.0', license: 'MIT' },
      'node_modules/eslint': { version: '10.0.0' },
    },
  };
  const components = sbomComponents(mockLock, SBOM_ROOTS);
  assert.equal(components.length, 3);
  assert.equal(components[0].name, '@types/node');
  assert.equal(components[0].purl, 'pkg:npm/@types%2Fnode@22.0.0');
  assert.equal(components[1].name, 'colorjs.io');
  assert.equal(components[2].name, 'style-dictionary');
});
