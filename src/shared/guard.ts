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
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, relative, resolve, sep } from 'node:path';

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

function walkFiles(dir: string, visit: (path: string) => void): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(path, visit);
    else visit(path);
  }
}

/** Map every file under rootDir (slash-relative, sorted) to its SHA-256, skipping basenames in excludeNames. */
export function collectHashes(rootDir: string, excludeNames: string[]): Record<string, string> {
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

export function writeManifest(manifestPath: string, manifest: GuardManifest): void {
  const files: Record<string, string> = {};
  for (const key of Object.keys(manifest.files).sort()) {
    const hash = manifest.files[key];
    if (hash !== undefined) files[key] = hash;
  }
  writeFileSync(manifestPath, `${JSON.stringify({ ...manifest, files }, null, 2)}\n`, 'utf8');
}

export function readManifest(manifestPath: string): GuardManifest | null {
  try {
    const parsed = JSON.parse(readFileSync(manifestPath, 'utf8')) as GuardManifest;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function checkTampered(
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
