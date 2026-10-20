#!/usr/bin/env node
/**
 * Package dist/ into versioned release artifacts under release/:
 * one zip per skill, one full bundle zip, plus SHA256SUMS.txt.
 *
 * Self-contained ZIP writer (STORE method + CRC32) — no external zip binary
 * and no new dependency. Publish with GitHub CLI once a remote exists:
 *   gh release create v<version> release/* --title "v<version>"
 *
 * Usage: node scripts/package-release.mjs [--skip-build] [--dry-run]
 */
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { createHash, createPrivateKey, randomUUID, sign } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listSkills } from './build-engine.mjs';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(rootDir, 'dist');

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
export function crc32(buf) {
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
export function writeZip(entries, outPath) {
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

function entriesFor(skill, dist = distDir) {
  const dir = join(dist, skill);
  const entries = [];
  walk(dir, (path) =>
    entries.push({ path, arc: `${skill}/${relative(dir, path).replaceAll('\\', '/')}` }),
  );
  return entries.sort((a, b) => a.arc.localeCompare(b.arc));
}
export const SKILL_BUCKETS = {
  creation: ['token-style', 'token-extract', 'token-math'],
  governance: ['token-audit', 'token-build'],
};

export const SBOM_ROOTS = Object.freeze(['colorjs.io', 'style-dictionary']);

export function sbomComponents(lock, roots = SBOM_ROOTS) {
  const packages = lock?.packages ?? {};
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
  for (const root of roots) {
    collectDeps(root);
  }

  return Array.from(seen)
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
}

export function planRelease(root, version, { keyPresent = false } = {}) {
  const distDir = join(root, 'dist');
  const skillsDir = join(root, 'src', 'skills');
  const skills = existsSync(distDir)
    ? listSkills(distDir)
    : existsSync(skillsDir)
      ? listSkills(skillsDir)
      : [];

  if (skills.length === 0) {
    throw new Error(`no skills found under ${root}`);
  }

  const artifacts = [];
  for (const s of skills) {
    artifacts.push({ kind: 'skill', name: `token-engine-${s}-v${version}.zip`, skill: s });
  }
  artifacts.push({ kind: 'bundle', name: `token-engine-builder-v${version}.zip` });
  for (const bucket of Object.keys(SKILL_BUCKETS)) {
    artifacts.push({ kind: 'bucket', name: `token-engine-${bucket}-v${version}.zip`, bucket });
  }
  if (existsSync(join(root, 'package-lock.json'))) {
    artifacts.push({ kind: 'sbom', name: `token-engine-builder-v${version}.cyclonedx.json` });
  }
  artifacts.push({ kind: 'checksums', name: 'SHA256SUMS.txt' });
  if (keyPresent) {
    artifacts.push({ kind: 'signature', name: 'SHA256SUMS.txt.minisig' });
  }
  return {
    version,
    skills,
    artifacts,
    hasKey: keyPresent,
  };
}

export function planArtifacts(root, version, options) {
  return planRelease(root, version, options).artifacts;
}

export function runPackage(argv = process.argv.slice(2), { root = rootDir } = {}) {
  const dryRun = argv.includes('--dry-run');
  const skipBuild = argv.includes('--skip-build');
  const currentDistDir = join(root, 'dist');
  const currentReleaseDir = join(root, 'release');
  const currentPkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const currentVersion = currentPkg.version;

  // Preflight validation
  const keyFile = join(root, '.release-key.json');
  let keyData = null;
  if (existsSync(keyFile)) {
    try {
      keyData = JSON.parse(readFileSync(keyFile, 'utf8'));
      if (!keyData.keyId || !keyData.privateKey) throw new Error('missing keyId or privateKey');
    } catch (err) {
      console.error(
        `[package] invalid release key: ${err instanceof Error ? err.message : String(err)}`,
      );
      return 1;
    }
  }

  const lockPath = join(root, 'package-lock.json');
  let lock = null;
  if (existsSync(lockPath)) {
    try {
      lock = JSON.parse(readFileSync(lockPath, 'utf8'));
    } catch (err) {
      console.error(
        `[package] invalid package-lock.json: ${err instanceof Error ? err.message : String(err)}`,
      );
      return 1;
    }
  }

  if (dryRun) {
    const plan = planRelease(root, currentVersion, { keyPresent: Boolean(keyData) });
    console.log(
      `[package] dry-run: would package ${plan.skills.length} skill(s) (v${currentVersion}) → release/`,
    );
    for (const a of plan.artifacts) console.log(`  ${a.name}`);
    return 0;
  }

  if (!skipBuild) {
    execFileSync(process.execPath, [join(root, 'scripts', 'build-all.mjs')], {
      cwd: root,
      stdio: 'inherit',
    });
  }
  if (!existsSync(currentDistDir)) {
    console.error('[package] dist/ missing — run npm run build first (or drop --skip-build)');
    return 1;
  }

  const plan = planRelease(root, currentVersion, { keyPresent: Boolean(keyData) });
  const skills = plan.skills;
  const stageDir = join(root, 'release.tmp');
  rmSync(stageDir, { recursive: true, force: true });
  mkdirSync(stageDir, { recursive: true });

  const artifacts = [];
  const bundleEntries = [];
  for (const skill of skills) {
    const entries = entriesFor(skill, currentDistDir);
    bundleEntries.push(...entries);
    const out = join(stageDir, `token-engine-${skill}-v${currentVersion}.zip`);
    writeZip(entries, out);
    artifacts.push(out);
    console.log(`[package] ${skill} → release/${basename(out)}`);
  }
  const claudePlugin = join(root, '.claude', 'plugin.json');
  if (existsSync(claudePlugin)) {
    bundleEntries.push({ path: claudePlugin, arc: '.claude/plugin.json' });
  }
  const bundle = join(stageDir, `token-engine-builder-v${currentVersion}.zip`);
  writeZip(bundleEntries, bundle);
  artifacts.push(bundle);
  console.log(`[package] bundle → release/${basename(bundle)}`);

  // L5 Skill Grouping: functional bucket bundles
  for (const [bucketName, bucketSkills] of Object.entries(SKILL_BUCKETS)) {
    const bucketEntries = [];
    for (const s of bucketSkills) {
      if (!skills.includes(s)) {
        console.error(`[package] bucket:${bucketName} missing required skill: ${s}`);
        return 1;
      }
      bucketEntries.push(...entriesFor(s, currentDistDir));
    }
    if (existsSync(claudePlugin)) {
      bucketEntries.push({ path: claudePlugin, arc: '.claude/plugin.json' });
    }
    const bucketZip = join(stageDir, `token-engine-${bucketName}-v${currentVersion}.zip`);
    writeZip(bucketEntries, bucketZip);
    artifacts.push(bucketZip);
    console.log(`[package] bucket:${bucketName} → release/${basename(bucketZip)}`);
  }

  if (lock !== null) {
    const components = sbomComponents(lock, SBOM_ROOTS);
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
            version: currentVersion,
          },
        ],
        component: {
          type: 'application',
          name: currentPkg.name,
          version: currentPkg.version,
          licenses: [{ license: { id: currentPkg.license ?? 'MIT' } }],
        },
      },
      components,
    };

    const sbomPath = join(stageDir, `token-engine-builder-v${currentVersion}.cyclonedx.json`);
    writeFileSync(sbomPath, `${JSON.stringify(sbom, null, 2)}\n`, 'utf8');
    artifacts.push(sbomPath);
    console.log(`[package] SBOM → release/${basename(sbomPath)} (${components.length} components)`);
  }

  const sums = artifacts
    .map(
      (path) =>
        `${createHash('sha256').update(readFileSync(path)).digest('hex')}  ${basename(path)}`,
    )
    .join('\n');
  const sumsFile = join(stageDir, 'SHA256SUMS.txt');
  writeFileSync(sumsFile, `${sums}\n`, 'utf8');
  console.log(
    `[package] SHA256SUMS.txt written (${artifacts.length} artifacts, v${currentVersion})`,
  );

  if (keyData !== null) {
    const keyId = Buffer.from(keyData.keyId, 'hex');
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

    const sigFile = join(stageDir, 'SHA256SUMS.txt.minisig');
    writeFileSync(sigFile, sigContent, 'utf8');
    console.log(`[package] SHA256SUMS.txt.minisig written (Ed25519 signature)`);
  }

  // Atomic swap
  rmSync(currentReleaseDir, { recursive: true, force: true });
  renameSync(stageDir, currentReleaseDir);

  for (const item of plan.artifacts) {
    const target = join(currentReleaseDir, item.name);
    if (!existsSync(target)) {
      throw new Error(`[package] missing planned release artifact: ${item.name}`);
    }
  }
  console.log(
    `[package] publish: gh release create v${currentVersion} release/* --title "v${currentVersion}"`,
  );
  return 0;
}

const isMain =
  process.argv[1] !== undefined &&
  (resolve(process.argv[1]) === fileURLToPath(import.meta.url) ||
    process.argv[1].endsWith('package-release.mjs'));

if (isMain) {
  const code = runPackage();
  if (code !== 0) process.exit(code);
}
