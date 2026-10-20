import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dtcgToOklch } from './colors.js';
import type { DtcgColorValue, OklchColor } from './types.js';

export type JsonObject = Record<string, unknown>;

export interface FlattenedToken {
  value: unknown;
  tier: 'primitive' | 'semantic' | 'component' | string;
}

export interface LoadedTokenTree {
  merged: JsonObject;
  flat: Map<string, FlattenedToken>;
  files: Array<{ path: string; tier: string }>;
  resolveColor(path: string, unresolved?: string[], depth?: number): OklchColor | undefined;
  resolveAlias(path: string, unresolved?: string[], depth?: number): unknown;
  checkRawValueViolations(): string[];
  checkUnresolvedAliases(): string[];
}

const ALIAS = /^\{([^}]+)\}$/;

/** Expand one source entry: literal file, or a `**` / `*` glob ending in `.tokens.json`. */
export function expandSource(pattern: string): string[] {
  const normalized = pattern.replaceAll('\\', '/');
  const recursive = normalized.indexOf('/**/');
  if (recursive !== -1) {
    const base = normalized.slice(0, recursive);
    const suffix = normalized.slice(recursive + 5).replace('*', '');
    if (!existsSync(base)) return [];
    const found: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.name.endsWith(suffix)) found.push(path);
      }
    };
    walk(base);
    return found.sort();
  }
  if (normalized.includes('*')) {
    const slash = normalized.lastIndexOf('/');
    const dir = slash === -1 ? '.' : normalized.slice(0, slash);
    const suffix = normalized.slice(slash + 1).replace('*', '');
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((name) => name.endsWith(suffix))
      .sort()
      .map((name) => join(dir, name));
  }
  return existsSync(normalized) ? [normalized] : [];
}

/** Recursively discover all `.tokens.json` files in a directory. */
export function findTokenFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return findTokenFiles(path);
    return entry.name.endsWith('.tokens.json') ? [path] : [];
  });
}

/** Deep merge two JSON objects in place without mutation to source. */
export function deepMerge(target: JsonObject, source: JsonObject): JsonObject {
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key];
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existing !== null &&
      typeof existing === 'object' &&
      !Array.isArray(existing)
    ) {
      deepMerge(existing as JsonObject, value as JsonObject);
    } else {
      target[key] = value;
    }
  }
  return target;
}

/** Load + deep-merge every source file matching patterns into one DTCG token tree. */
export function loadTokenSources(sources: string[]): JsonObject {
  const merged: JsonObject = {};
  for (const pattern of sources) {
    for (const file of expandSource(pattern)) {
      deepMerge(merged, JSON.parse(readFileSync(file, 'utf8')) as JsonObject);
    }
  }
  if (Object.keys(merged).length === 0) {
    throw new Error(`no token files matched sources: ${sources.join(', ')}`);
  }
  return merged;
}

/** Flatten a token tree to dotted paths → raw `$value`, recording the owning tier. */
export function flattenTokens(
  node: JsonObject,
  prefix = '',
  tier = 'unknown',
  out: Map<string, FlattenedToken> = new Map(),
): Map<string, FlattenedToken> {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    if (value === null || typeof value !== 'object') continue;
    const path = prefix === '' ? key : `${prefix}.${key}`;
    const record = value as JsonObject;
    if ('$value' in record) {
      out.set(path, { value: record['$value'], tier });
    } else {
      flattenTokens(record, path, tier, out);
    }
  }
  return out;
}

/**
 * Load a full 3-tier token tree (primitive, semantic, component), merge,
 * flatten with tier tags, and provide alias and color resolution.
 */
export function loadTokenTree(tokensDir: string, options?: { theme?: string }): LoadedTokenTree {
  const files: Array<{ path: string; tier: string }> = [];

  for (const path of findTokenFiles(join(tokensDir, 'primitive'))) {
    files.push({ path, tier: 'primitive' });
  }

  const semanticDir = join(tokensDir, 'semantic');
  if (options?.theme !== undefined) {
    const semanticFile = join(semanticDir, `${options.theme}.tokens.json`);
    if (existsSync(semanticFile)) {
      files.push({ path: semanticFile, tier: 'semantic' });
    } else {
      throw new Error(`semantic theme file not found: ${semanticFile}`);
    }
  } else if (existsSync(semanticDir)) {
    for (const path of findTokenFiles(semanticDir)) {
      files.push({ path, tier: 'semantic' });
    }
  }

  for (const path of findTokenFiles(join(tokensDir, 'component'))) {
    files.push({ path, tier: 'component' });
  }

  const flat = new Map<string, FlattenedToken>();
  const merged: JsonObject = {};
  for (const file of files) {
    const json = JSON.parse(readFileSync(file.path, 'utf8')) as JsonObject;
    deepMerge(merged, json);
    flattenTokens(json, '', file.tier, flat);
  }

  const resolveAlias = (path: string, unresolved: string[] = [], depth = 0): unknown => {
    if (depth > 16) {
      unresolved.push(`${path} (alias cycle)`);
      return undefined;
    }
    const entry = flat.get(path);
    if (entry === undefined) {
      unresolved.push(path);
      return undefined;
    }
    const val = entry.value;
    if (typeof val === 'string') {
      const match = ALIAS.exec(val.trim());
      if (match?.[1] !== undefined) return resolveAlias(match[1], unresolved, depth + 1);
      return val;
    }
    return val;
  };

  const resolveColor = (
    path: string,
    unresolved: string[] = [],
    depth = 0,
  ): OklchColor | undefined => {
    if (depth > 16) {
      unresolved.push(`${path} (alias cycle)`);
      return undefined;
    }
    const entry = flat.get(path);
    if (entry === undefined) {
      unresolved.push(path);
      return undefined;
    }
    const val = entry.value;
    if (typeof val === 'string') {
      const match = ALIAS.exec(val.trim());
      if (match?.[1] !== undefined) return resolveColor(match[1], unresolved, depth + 1);
      return dtcgToOklch(val);
    }
    if (val !== null && typeof val === 'object' && 'colorSpace' in val) {
      return dtcgToOklch(val as DtcgColorValue);
    }
    return undefined;
  };

  const checkRawValueViolations = (): string[] => {
    const violations: string[] = [];
    for (const [path, entry] of flat) {
      if (entry.tier === 'primitive') continue;
      if (typeof entry.value !== 'string' || !ALIAS.test(entry.value.trim())) {
        violations.push(`${path} (${entry.tier}: raw value, alias required)`);
      }
      if (typeof entry.value === 'string' && entry.value.includes('#')) {
        violations.push(`${path} (${entry.tier}: raw hex forbidden)`);
      }
    }
    return violations;
  };

  const checkUnresolvedAliases = (): string[] => {
    const unresolved: string[] = [];
    for (const [path, entry] of flat) {
      if (typeof entry.value === 'string') {
        const match = ALIAS.exec(entry.value.trim());
        if (match?.[1] !== undefined && !flat.has(match[1])) {
          unresolved.push(`${path} → ${match[1]}`);
        }
      }
    }
    return unresolved;
  };

  return {
    merged,
    flat,
    files,
    resolveColor,
    resolveAlias,
    checkRawValueViolations,
    checkUnresolvedAliases,
  };
}
