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
import { hasFlag, isMainModule } from '../src/shared/paths.ts';
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
  routing: ['ask-kami', 'improve-design-system'],
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

/** Build the CycloneDX 1.5 envelope for the release. */
export function buildSbom({ name, version, license, components, serialNumber, timestamp }) {
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber,
    version: 1,
    metadata: {
      timestamp,
      tools: [{ vendor: 'token-engine-builder', name: 'package-release', version }],
      component: {
        type: 'application',
        name,
        version,
        licenses: [{ license: { id: license ?? 'MIT' } }],
      },
    },
    components,
  };
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
  const dryRun = hasFlag(argv, '--dry-run');
  const skipBuild = hasFlag(argv, '--skip-build');
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
    execFileSync(
      process.execPath,
      ['--experimental-strip-types', join(root, 'scripts', 'build-all.mjs')],
      {
        cwd: root,
        stdio: 'inherit',
      },
    );
  }
  if (!existsSync(currentDistDir)) {
    console.error('[package] dist/ missing — run npm run build first (or drop --skip-build)');
    return 1;
  }

  const plan = planRelease(root, currentVersion, { keyPresent: Boolean(keyData) });
  const stageDir = join(root, 'release.tmp');
  rmSync(stageDir, { recursive: true, force: true });
  mkdirSync(stageDir, { recursive: true });

  const artifacts = [];
  const skillEntries = new Map();
  const claudePlugin = join(root, '.claude', 'plugin.json');
  const pluginEntry = existsSync(claudePlugin)
    ? { path: claudePlugin, arc: '.claude/plugin.json' }
    : null;
  let sumsFile;

  for (const item of plan.artifacts) {
    const out = join(stageDir, item.name);
    if (item.kind === 'skill') {
      const entries = entriesFor(item.skill, currentDistDir);
      skillEntries.set(item.skill, entries);
      writeZip(entries, out);
      artifacts.push(out);
      console.log(`[package] ${item.skill} → release/${item.name}`);
    } else if (item.kind === 'bundle') {
      const entries = plan.skills.flatMap((skill) => skillEntries.get(skill) ?? []);
      if (pluginEntry !== null) entries.push(pluginEntry);
      writeZip(entries, out);
      artifacts.push(out);
      console.log(`[package] bundle → release/${item.name}`);
    } else if (item.kind === 'bucket') {
      const bucketSkills = SKILL_BUCKETS[item.bucket];
      const entries = [];
      for (const skill of bucketSkills) {
        const skillEntryList = skillEntries.get(skill);
        if (skillEntryList === undefined) {
          console.error(`[package] bucket:${item.bucket} missing required skill: ${skill}`);
          return 1;
        }
        entries.push(...skillEntryList);
      }
      if (pluginEntry !== null) entries.push(pluginEntry);
      writeZip(entries, out);
      artifacts.push(out);
      console.log(`[package] bucket:${item.bucket} → release/${item.name}`);
    } else if (item.kind === 'sbom') {
      const components = sbomComponents(lock, SBOM_ROOTS);
      const sbom = buildSbom({
        name: currentPkg.name,
        version: currentPkg.version,
        license: currentPkg.license,
        components,
        serialNumber: `urn:uuid:${randomUUID()}`,
        timestamp: new Date().toISOString(),
      });
      writeFileSync(out, `${JSON.stringify(sbom, null, 2)}\n`, 'utf8');
      artifacts.push(out);
      console.log(`[package] SBOM → release/${item.name} (${components.length} components)`);
    } else if (item.kind === 'checksums') {
      const sums = artifacts
        .map(
          (path) =>
            `${createHash('sha256').update(readFileSync(path)).digest('hex')}  ${basename(path)}`,
        )
        .join('\n');
      writeFileSync(out, `${sums}\n`, 'utf8');
      sumsFile = out;
      artifacts.push(out);
      console.log(
        `[package] ${item.name} written (${artifacts.length} artifacts, v${currentVersion})`,
      );
    } else if (item.kind === 'signature') {
      if (keyData === null || sumsFile === undefined) {
        console.error('[package] signature planned without a release key or checksums');
        return 1;
      }
      const keyId = Buffer.from(keyData.keyId, 'hex');
      const pkcs8Prefix = Buffer.from('302e020100300506032b657004220420', 'hex');
      const pkcs8Der = Buffer.concat([pkcs8Prefix, Buffer.from(keyData.privateKey, 'hex')]);
      const privKeyObj = createPrivateKey({ key: pkcs8Der, format: 'der', type: 'pkcs8' });
      const rawSig = sign(null, readFileSync(sumsFile), privKeyObj);
      const sigBuf = Buffer.concat([Buffer.from('Ed'), keyId, rawSig]);
      const sigContent =
        `untrusted comment: signature from token-engine-builder secret key\n` +
        `${sigBuf.toString('base64')}\n` +
        `trusted comment: timestamp:${Math.floor(Date.now() / 1000)}\tfile:SHA256SUMS.txt\n` +
        `${rawSig.toString('base64')}\n`;
      writeFileSync(out, sigContent, 'utf8');
      artifacts.push(out);
      console.log(`[package] ${item.name} written (Ed25519 signature)`);
    }
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

if (isMainModule(import.meta.url, 'package-release.mjs')) {
  const code = runPackage();
  if (code !== 0) process.exit(code);
}
