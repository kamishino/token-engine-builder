/**
 * Anti-Tampering Guard: provenance manifests + safe output directories.
 *
 * Generated outputs (token trees, CSS) carry a `.token-engine-*-manifest.json`
 * with per-file SHA-256 hashes. Before overwriting, writers verify the tree
 * is still byte-identical to what the pipeline generated; user hand-edits
 * (changed/missing files) refuse the overwrite unless `--force` is passed.
 * Extra user files (`added`) never block — they survive generation.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, relative, resolve, sep } from 'node:path';
import type { StyleSpec } from './types.js';

export interface GuardManifest {
  version: 1;
  kind: 'tokens' | 'css';
  generator: 'token-engine-builder';
  inputHash: string | null;
  files: Record<string, string>;
}

export type TamperStatus = 'absent' | 'clean' | 'tampered' | 'unreadable';

export interface TamperReport {
  status: TamperStatus;
  changed: string[];
  missing: string[];
  added: string[];
}

export function sha256Hex(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}
export const TOKENS_MANIFEST_NAME = '.token-engine-tokens-manifest.json';
export const CSS_MANIFEST_NAME = '.token-engine-css-manifest.json';
export const AUDIT_STAMP_NAME = '.token-engine-audit.json';

function walkFiles(dir: string, visit: (path: string) => void): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(path, visit);
    else visit(path);
  }
}

/** Map every file under rootDir (slash-relative, sorted) to its SHA-256, skipping basenames in excludeNames. */
function collectHashes(rootDir: string, excludeNames: string[]): Record<string, string> {
  const files: Record<string, string> = {};
  if (!existsSync(rootDir)) return files;
  const paths: string[] = [];
  walkFiles(rootDir, (path) => {
    if (!excludeNames.includes(basename(path))) paths.push(path);
  });
  paths.sort();
  for (const path of paths) {
    files[relative(rootDir, path).replaceAll('\\', '/')] = sha256Hex(readFileSync(path));
  }
  return files;
}

function writeManifest(manifestPath: string, manifest: GuardManifest): void {
  const files: Record<string, string> = {};
  for (const key of Object.keys(manifest.files).sort()) {
    const hash = manifest.files[key];
    if (hash !== undefined) files[key] = hash;
  }
  writeFileSync(manifestPath, `${JSON.stringify({ ...manifest, files }, null, 2)}\n`, 'utf8');
}

function readManifest(manifestPath: string): GuardManifest | null {
  try {
    const parsed = JSON.parse(readFileSync(manifestPath, 'utf8')) as GuardManifest;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function checkTampered(
  manifestPath: string,
  rootDir: string,
  excludeNames: string[],
): TamperReport {
  if (!existsSync(manifestPath)) return { status: 'absent', changed: [], missing: [], added: [] };
  const manifest = readManifest(manifestPath);
  if (manifest === null) return { status: 'unreadable', changed: [], missing: [], added: [] };
  const current = collectHashes(rootDir, [...excludeNames, basename(manifestPath)]);
  const changed: string[] = [];
  const missing: string[] = [];
  const added: string[] = [];
  for (const [path, hash] of Object.entries(manifest.files)) {
    const actual = current[path];
    if (actual === undefined) missing.push(path);
    else if (actual !== hash) changed.push(path);
  }
  for (const path of Object.keys(current)) {
    if (!(path in manifest.files)) added.push(path);
  }
  return {
    status: changed.length > 0 || missing.length > 0 ? 'tampered' : 'clean',
    changed,
    missing,
    added,
  };
}

/**
 * Refuse output directories that would scatter generated files somewhere
 * destructive: the cwd itself, an ancestor of cwd, or the home directory.
 * Returns an error message, or null when safe. Absolute paths elsewhere are
 * allowed (portability) — callers echo the resolved target before writing.
 */
export function assertSafeOutDir(outDir: string, cwd: string): string | null {
  const out = resolve(outDir);
  const root = resolve(cwd);
  if (out === root) return `refusing to write into the working directory itself: ${out}`;
  if (root.startsWith(out + sep))
    return `refusing to write into an ancestor of the working directory: ${out}`;
  if (out === resolve(homedir())) return `refusing to write into the home directory: ${out}`;
  return null;
}

/** Compute the aggregate tree hash for a tokens directory (excluding stamp & manifest). */
export function computeTreeHash(tokensDir: string): string {
  const hashes = collectHashes(tokensDir, [AUDIT_STAMP_NAME, TOKENS_MANIFEST_NAME]);
  return sha256Hex(
    Object.entries(hashes)
      .map(([path, hash]) => `${path}:${hash}`)
      .join('\n'),
  );
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`);
  return `{${entries.join(',')}}`;
}

/** Key-order- and whitespace-insensitive hash of a normalized spec. */
export function specInputHash(spec: StyleSpec): string {
  return sha256Hex(canonicalJson(spec));
}

export type SpecBinding = 'match' | 'mismatch' | 'absent' | 'unreadable';

/** Compare a spec hash against the tokens manifest's recorded inputHash. */
export function checkSpecBinding(tokensDir: string, specHash: string): SpecBinding {
  const manifestPath = join(tokensDir, TOKENS_MANIFEST_NAME);
  if (!existsSync(manifestPath)) return 'absent';
  const manifest = readManifest(manifestPath);
  if (manifest === null) return 'unreadable';
  if (typeof manifest.inputHash !== 'string' || manifest.inputHash === '') return 'absent';
  return manifest.inputHash === specHash ? 'match' : 'mismatch';
}

/** Check if the audit stamp exists, is fresh, stale, or failing for tokensDir. */
export function checkAuditStamp(
  tokensDir: string,
): 'pass' | 'stale' | 'fail' | 'missing' | 'unreadable' {
  const stampPath = join(tokensDir, AUDIT_STAMP_NAME);
  if (!existsSync(stampPath)) return 'missing';
  let stamp: { pass?: unknown; treeHash?: unknown };
  try {
    stamp = JSON.parse(readFileSync(stampPath, 'utf8')) as { pass?: unknown; treeHash?: unknown };
  } catch {
    return 'unreadable';
  }
  if (stamp.pass !== true || typeof stamp.treeHash !== 'string') return 'fail';
  return computeTreeHash(tokensDir) === stamp.treeHash ? 'pass' : 'stale';
}

/** Record a passing audit stamp with the current tree hash. */
export function writeAuditStamp(
  tokensDir: string,
  data: { minRatio: number; minApca: number },
): void {
  const treeHash = computeTreeHash(tokensDir);
  const stampPath = join(tokensDir, AUDIT_STAMP_NAME);
  writeFileSync(
    stampPath,
    `${JSON.stringify({ version: 1, pass: true, at: Date.now(), treeHash, ...data }, null, 2)}\n`,
    'utf8',
  );
}

/** Remove the audit stamp when an audit fails. */
export function removeAuditStamp(tokensDir: string): void {
  rmSync(join(tokensDir, AUDIT_STAMP_NAME), { force: true });
}

/** Verify provenance of a generated tokens directory. */
export function checkTokensProvenance(tokensDir: string): TamperReport {
  return checkTampered(join(tokensDir, TOKENS_MANIFEST_NAME), tokensDir, [
    TOKENS_MANIFEST_NAME,
    AUDIT_STAMP_NAME,
  ]);
}

/** Write provenance manifest for a generated tokens directory. */
export function writeTokensProvenance(tokensDir: string, inputHash: string | null): void {
  const hashes = collectHashes(tokensDir, [TOKENS_MANIFEST_NAME, AUDIT_STAMP_NAME]);
  writeManifest(join(tokensDir, TOKENS_MANIFEST_NAME), {
    version: 1,
    kind: 'tokens',
    generator: 'token-engine-builder',
    inputHash,
    files: hashes,
  });
}

/** Verify provenance of a generated CSS directory. */
export function checkCssProvenance(cssDir: string): TamperReport {
  return checkTampered(join(cssDir, CSS_MANIFEST_NAME), cssDir, [CSS_MANIFEST_NAME]);
}

/** Write provenance manifest for a generated CSS directory. */
export function writeCssProvenance(
  cssDir: string,
  inputHash: string | null,
  files: Record<string, string>,
): void {
  writeManifest(join(cssDir, CSS_MANIFEST_NAME), {
    version: 1,
    kind: 'css',
    generator: 'token-engine-builder',
    inputHash,
    files,
  });
}

export interface PublishReport {
  missing: string[];
}

export function publishCssOutputs(
  cssDir: string,
  tokensDir: string,
  artifacts: Record<string, string>,
): PublishReport {
  const missing = Object.values(artifacts).filter((path) => !existsSync(path));
  if (missing.length > 0) return { missing };
  const files = Object.fromEntries(
    Object.entries(artifacts).map(([name, path]) => [name, sha256Hex(readFileSync(path))]),
  );
  writeCssProvenance(cssDir, computeTreeHash(tokensDir), files);
  return { missing: [] };
}

export interface WriteIntent {
  /** Paths this run writes; any existing path means the destination is replaced. */
  paths: string[];
  /** Destination provenance, or null when the destination keeps no manifest. */
  tamper: TamperReport | null;
  force: boolean;
}

export type WriteDecision =
  | { kind: 'write'; replaces: boolean; dirty: boolean }
  | {
      kind: 'refuse';
      replaces: true;
      reason: 'tampered' | 'exists';
      changed: string[];
      missing: string[];
    };

/**
 * One overwrite policy for every generator: never replace existing outputs
 * without `force`, and name the hand-edited files when provenance is dirty.
 */
export function decideWrite(intent: WriteIntent): WriteDecision {
  if (!intent.paths.some((path) => existsSync(path))) {
    return { kind: 'write', replaces: false, dirty: false };
  }
  const tamper = intent.tamper;
  const dirty = tamper !== null && (tamper.status === 'tampered' || tamper.status === 'unreadable');
  if (!intent.force) {
    if (dirty && tamper !== null) {
      return {
        kind: 'refuse',
        replaces: true,
        reason: 'tampered',
        changed: tamper.changed,
        missing: tamper.missing,
      };
    }
    return { kind: 'refuse', replaces: true, reason: 'exists', changed: [], missing: [] };
  }
  return { kind: 'write', replaces: true, dirty };
}
