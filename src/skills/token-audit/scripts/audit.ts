/**
 * audit — WCAG 2.1 gatekeeper over a 3-tier token tree.
 * Exit 0 = pass, 1 = contrast failure / unresolved alias / raw value above Tier 1.
 *
 * Usage: node ./scripts/audit.mjs --tokens tokens [--theme light|dark|both] [--min-ratio 4.5] [--json]
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkContrast, dtcgToOklch } from '../../../shared/colors.js';
import { fromCwd, getArg, hasFlag } from '../../../shared/paths.js';
import type { AuditReport, DtcgColorValue, OklchColor } from '../../../shared/types.js';

const argv = process.argv.slice(2);

if (hasFlag(argv, '--help')) {
  console.log(
    'Usage: audit.mjs --tokens <dir> [--theme light|dark|both] [--min-ratio 4.5] [--json]',
  );
  process.exit(0);
}

const tokensDir = fromCwd(getArg(argv, '--tokens', 'tokens') as string);
const theme = getArg(argv, '--theme', 'both') as string;
const minRatio = Number(getArg(argv, '--min-ratio', '4.5'));
const asJson = hasFlag(argv, '--json');

if (!existsSync(tokensDir)) {
  console.error(`tokens dir not found: ${tokensDir}`);
  process.exit(1);
}

type Json = Record<string, unknown>;

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, 'utf8')) as Json;
}

function tokenFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tokenFiles(path);
    return entry.name.endsWith('.tokens.json') ? [path] : [];
  });
}

function deepMerge(target: Json, source: Json): Json {
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
      deepMerge(existing as Json, value as Json);
    } else {
      target[key] = value;
    }
  }
  return target;
}

/** Flatten a token tree to dotted paths → raw `$value`, recording the owning tier. */
function flatten(
  node: Json,
  prefix: string,
  tier: string,
  out: Map<string, { value: unknown; tier: string }>,
): void {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    if (value === null || typeof value !== 'object') continue;
    const path = prefix === '' ? key : `${prefix}.${key}`;
    const record = value as Json;
    if ('$value' in record) out.set(path, { value: record['$value'], tier });
    else flatten(record, path, tier, out);
  }
}

const ALIAS = /^\{([^}]+)\}$/;

function resolveColor(
  path: string,
  flat: Map<string, { value: unknown; tier: string }>,
  unresolved: string[],
  depth = 0,
): OklchColor | undefined {
  if (depth > 16) {
    unresolved.push(`${path} (alias cycle)`);
    return undefined;
  }
  const entry = flat.get(path);
  if (entry === undefined) {
    unresolved.push(path);
    return undefined;
  }
  const value = entry.value;
  if (typeof value === 'string') {
    const match = ALIAS.exec(value.trim());
    if (match?.[1] !== undefined) return resolveColor(match[1], flat, unresolved, depth + 1);
    return dtcgToOklch(value);
  }
  if (value !== null && typeof value === 'object' && 'colorSpace' in value) {
    return dtcgToOklch(value as DtcgColorValue);
  }
  return undefined;
}

const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['semantic.color.text.primary', 'semantic.color.bg.canvas'],
  ['semantic.color.text.secondary', 'semantic.color.bg.canvas'],
  ['semantic.color.text.primary', 'semantic.color.bg.surface'],
  ['semantic.color.action.primary-text', 'semantic.color.action.primary'],
  ['component.button.text', 'component.button.bg'],
  ['component.card.text', 'component.card.bg'],
  ['component.input.text', 'component.input.bg'],
];

function auditTheme(themeName: string): AuditReport {
  const files: Array<{ path: string; tier: string }> = [];
  for (const path of tokenFiles(join(tokensDir, 'primitive')))
    files.push({ path, tier: 'primitive' });
  const semanticFile = join(tokensDir, 'semantic', `${themeName}.tokens.json`);
  if (existsSync(semanticFile)) files.push({ path: semanticFile, tier: 'semantic' });
  for (const path of tokenFiles(join(tokensDir, 'component')))
    files.push({ path, tier: 'component' });

  const flat = new Map<string, { value: unknown; tier: string }>();
  const tree: Json = {};
  for (const file of files) {
    const json = readJson(file.path);
    deepMerge(tree, json);
    flatten(json, '', file.tier, flat);
  }

  const rawValueViolations: string[] = [];
  for (const [path, entry] of flat) {
    if (entry.tier === 'primitive') continue;
    if (typeof entry.value !== 'string' || !ALIAS.test(entry.value.trim())) {
      rawValueViolations.push(`${path} (${entry.tier}: raw value, alias required)`);
    }
    if (typeof entry.value === 'string' && entry.value.includes('#')) {
      rawValueViolations.push(`${path} (${entry.tier}: raw hex forbidden)`);
    }
  }

  const unresolvedAliases: string[] = [];
  const pairs = PAIRS.flatMap(([fg, bg]) => {
    const fgColor = resolveColor(fg, flat, unresolvedAliases);
    const bgColor = resolveColor(bg, flat, unresolvedAliases);
    if (fgColor === undefined || bgColor === undefined) return [];
    return [checkContrast(fg, fgColor, bg, bgColor, minRatio)];
  });

  // Every alias in the tree must resolve, not just audited pairs.
  for (const [path, entry] of flat) {
    if (typeof entry.value === 'string') {
      const match = ALIAS.exec(entry.value.trim());
      if (match?.[1] !== undefined && !flat.has(match[1]))
        unresolvedAliases.push(`${path} → ${match[1]}`);
    }
    void path;
  }

  const uniqueUnresolved = [...new Set(unresolvedAliases)];
  return {
    pairs,
    unresolvedAliases: uniqueUnresolved,
    rawValueViolations,
    pass:
      pairs.every((pair) => pair.pass) &&
      uniqueUnresolved.length === 0 &&
      rawValueViolations.length === 0,
  };
}

const themes = theme === 'both' ? ['light', 'dark'] : [theme];
const reports = new Map(themes.map((name) => [name, auditTheme(name)]));
const overallPass = [...reports.values()].every((report) => report.pass);

if (asJson) {
  console.log(
    JSON.stringify({ pass: overallPass, minRatio, themes: Object.fromEntries(reports) }, null, 2),
  );
} else {
  for (const [name, report] of reports) {
    console.log(`\n[${name}] min WCAG ratio ${minRatio}:1`);
    for (const pair of report.pairs) {
      console.log(
        `  ${pair.pass ? 'PASS' : 'FAIL'}  ${pair.ratio.toFixed(2)}:1  ${pair.foreground} on ${pair.background}`,
      );
    }
    for (const item of report.unresolvedAliases) console.log(`  FAIL  unresolved alias: ${item}`);
    for (const item of report.rawValueViolations) console.log(`  FAIL  ${item}`);
  }
  console.log(`\naudit ${overallPass ? 'PASS' : 'FAIL'}`);
}

process.exit(overallPass ? 0 : 1);
