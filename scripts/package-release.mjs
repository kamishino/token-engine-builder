#!/usr/bin/env node
/**
 * Package dist/ into versioned release artifacts under release/:
 * one zip per skill, one full bundle zip, plus SHA256SUMS.txt.
 *
 * Self-contained ZIP writer (STORE method + CRC32) — no external zip binary
 * and no new dependency. Publish with GitHub CLI once a remote exists:
 *   gh release create v<version> release/* --title "v<version>"
 *
 * Usage: node scripts/package-release.mjs [--skip-build]
 */
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { createHash, createPrivateKey, randomUUID, sign } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(rootDir, 'dist');
const releaseDir = join(rootDir, 'release');
const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
const version = pkg.version;

if (!process.argv.includes('--skip-build')) {
  execFileSync(process.execPath, [join(rootDir, 'scripts', 'build-all.mjs')], {
    cwd: rootDir,
    stdio: 'inherit',
  });
}
if (!existsSync(distDir)) {
  console.error('[package] dist/ missing — run npm run build first (or drop --skip-build)');
  process.exit(1);
}

function walk(dir, visit) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, visit);
    else visit(path);
  }
}

// CRC32 (IEEE) table for ZIP entries.
const CRC_TABLE = new Int32Array(256).map((_, i) => {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTimeDate(date) {
  const time =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((date.getSeconds() >> 1) & 0x1f);
  const day =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0xf) << 5) |
    (date.getDate() & 0x1f);
  return { time, day };
}

/** entries: [{ path, arc }] — arc is the slash-separated name inside the zip. */
function writeZip(entries, outPath) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const { path, arc } of entries) {
    const data = readFileSync(path);
    const nameBytes = Buffer.from(arc, 'utf8');
    const { time, day } = dosTimeDate(statSync(path).mtime);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    local.writeUInt16LE(0, 8); // STORE method
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    chunks.push(local, nameBytes, data);
    const head = Buffer.alloc(46);
    head.writeUInt32LE(0x02014b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(20, 6);
    head.writeUInt16LE(0x0800, 8);
    head.writeUInt16LE(0, 10);
    head.writeUInt16LE(time, 12);
    head.writeUInt16LE(day, 14);
    head.writeUInt32LE(crc, 16);
    head.writeUInt32LE(data.length, 20);
    head.writeUInt32LE(data.length, 24);
    head.writeUInt16LE(nameBytes.length, 28);
    const executable = path.endsWith('.mjs') && arc.includes('/scripts/');
    head.writeUInt32LE(((executable ? 0o100755 : 0o100644) << 16) >>> 0, 38);
    head.writeUInt32LE(offset, 42);
    central.push(head, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }
  const centralSize = central.reduce((sum, buf) => sum + buf.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  writeFileSync(outPath, Buffer.concat([...chunks, ...central, end]));
}

function entriesFor(skill) {
  const dir = join(distDir, skill);
  const entries = [];
  walk(dir, (path) =>
    entries.push({ path, arc: `${skill}/${relative(dir, path).replaceAll('\\', '/')}` }),
  );
  return entries.sort((a, b) => a.arc.localeCompare(b.arc));
}

rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(releaseDir, { recursive: true });

const skills = readdirSync(distDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const artifacts = [];
const bundleEntries = [];
for (const skill of skills) {
  const entries = entriesFor(skill);
  bundleEntries.push(...entries);
  const out = join(releaseDir, `token-engine-${skill}-v${version}.zip`);
  writeZip(entries, out);
  artifacts.push(out);
  console.log(`[package] ${skill} → release/${basename(out)}`);
}
const claudePlugin = join(rootDir, '.claude', 'plugin.json');
if (existsSync(claudePlugin)) {
  bundleEntries.push({ path: claudePlugin, arc: '.claude/plugin.json' });
}
const bundle = join(releaseDir, `token-engine-builder-v${version}.zip`);
writeZip(bundleEntries, bundle);
artifacts.push(bundle);
console.log(`[package] bundle → release/${basename(bundle)}`);

// L5 Skill Grouping: functional bucket bundles
const BUCKETS = {
  creation: ['token-style', 'token-extract', 'token-math'],
  governance: ['token-audit', 'token-build'],
};
for (const [bucketName, bucketSkills] of Object.entries(BUCKETS)) {
  const bucketEntries = [];
  for (const s of bucketSkills) {
    if (skills.includes(s)) bucketEntries.push(...entriesFor(s));
  }
  if (existsSync(claudePlugin)) {
    bucketEntries.push({ path: claudePlugin, arc: '.claude/plugin.json' });
  }
  const bucketZip = join(releaseDir, `token-engine-${bucketName}-v${version}.zip`);
  writeZip(bucketEntries, bucketZip);
  artifacts.push(bucketZip);
  console.log(`[package] bucket:${bucketName} → release/${basename(bucketZip)}`);
}

// CycloneDX 1.5 JSON SBOM covering inlined packages in shipped bundles
const lockPath = join(rootDir, 'package-lock.json');
if (existsSync(lockPath)) {
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  const packages = lock.packages ?? {};
  const seen = new Set();
  function collectDeps(depName) {
    const key = `node_modules/${depName}`;
    if (seen.has(key) || !packages[key]) return;
    seen.add(key);
    const info = packages[key];
    for (const d of Object.keys(info.dependencies ?? {})) {
      collectDeps(d);
    }
  }
  collectDeps('colorjs.io');
  collectDeps('style-dictionary');

  const components = Array.from(seen)
    .sort()
    .map((k) => {
      const name = k.replace(/^node_modules\//, '');
      const info = packages[k];
      const encodedName = name.startsWith('@') ? name.replace('/', '%2F') : name;
      return {
        type: 'library',
        name,
        version: info.version,
        ...(info.license ? { licenses: [{ license: { id: info.license } }] } : {}),
        purl: `pkg:npm/${encodedName}@${info.version}`,
      };
    });

  const sbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [
        {
          vendor: 'token-engine-builder',
          name: 'package-release',
          version,
        },
      ],
      component: {
        type: 'application',
        name: pkg.name,
        version: pkg.version,
        licenses: [{ license: { id: pkg.license ?? 'MIT' } }],
      },
    },
    components,
  };

  const sbomPath = join(releaseDir, `token-engine-builder-v${version}.cyclonedx.json`);
  writeFileSync(sbomPath, `${JSON.stringify(sbom, null, 2)}\n`, 'utf8');
  artifacts.push(sbomPath);
  console.log(`[package] SBOM → release/${basename(sbomPath)} (${components.length} components)`);
}

const sums = artifacts
  .map(
    (path) => `${createHash('sha256').update(readFileSync(path)).digest('hex')}  ${basename(path)}`,
  )
  .join('\n');
const sumsFile = join(releaseDir, 'SHA256SUMS.txt');
writeFileSync(sumsFile, `${sums}\n`, 'utf8');
console.log(`[package] SHA256SUMS.txt written (${artifacts.length} artifacts, v${version})`);

// Cryptographic Minisign signature over SHA256SUMS.txt
const keyFile = join(rootDir, '.release-key.json');
if (existsSync(keyFile)) {
  const keyData = JSON.parse(readFileSync(keyFile, 'utf8'));
  const keyId = Buffer.from(keyData.keyId, 'hex');
  // Convert raw 32-byte Ed25519 private key into PKCS#8 DER for node:crypto
  const pkcs8Prefix = Buffer.from('302e020100300506032b657004220420', 'hex');
  const pkcs8Der = Buffer.concat([pkcs8Prefix, Buffer.from(keyData.privateKey, 'hex')]);
  const privKeyObj = createPrivateKey({ key: pkcs8Der, format: 'der', type: 'pkcs8' });

  const sumsBuf = readFileSync(sumsFile);
  const rawSig = sign(null, sumsBuf, privKeyObj);

  const sigBuf = Buffer.concat([Buffer.from('Ed'), keyId, rawSig]);
  const sigContent =
    `untrusted comment: signature from token-engine-builder secret key\n` +
    `${sigBuf.toString('base64')}\n` +
    `trusted comment: timestamp:${Math.floor(Date.now() / 1000)}\tfile:SHA256SUMS.txt\n` +
    `${Buffer.concat([rawSig]).toString('base64')}\n`;

  const sigFile = join(releaseDir, 'SHA256SUMS.txt.minisig');
  writeFileSync(sigFile, sigContent, 'utf8');
  console.log(`[package] SHA256SUMS.txt.minisig written (Ed25519 signature)`);
}

console.log(`[package] publish: gh release create v${version} release/* --title "v${version}"`);
