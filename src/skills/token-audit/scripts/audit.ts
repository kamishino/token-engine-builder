/**
 * audit — WCAG 2.1 gatekeeper over a 3-tier token tree.
 * Exit 0 = pass, 1 = contrast failure / unresolved alias / raw value above Tier 1.
 *
 * Usage: node ./scripts/audit.mjs --tokens tokens [--theme light|dark|both] [--min-ratio 4.5] [--json]
 */
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkContrast, dtcgToOklch } from '../../../shared/colors.js';
import {
  checkTampered,
  collectHashes,
  sha256Hex,
  type TamperReport,
} from '../../../shared/guard.js';
import { fromCwd, getArg, hasFlag } from '../../../shared/paths.js';
import type { AuditReport, DtcgColorValue, OklchColor } from '../../../shared/types.js';

const argv = process.argv.slice(2);

if (hasFlag(argv, '--help')) {
  console.log(
    'Usage: audit.mjs --tokens <dir> [--theme light|dark|both] [--min-ratio 4.5] [--min-apca 60] [--spec <style-spec.json>] [--json]',
  );
  process.exit(0);
}

const tokensDir = fromCwd(getArg(argv, '--tokens', 'tokens') as string);
const theme = getArg(argv, '--theme', 'both') as string;
const specArg = getArg(argv, '--spec');
let minRatio = Number(getArg(argv, '--min-ratio', '4.5'));
if (!argv.includes('--min-ratio') && specArg !== undefined) {
  try {
    const spec = JSON.parse(readFileSync(fromCwd(specArg), 'utf8')) as {
      targets?: { minWcagRatio?: number };
    };
    if (typeof spec.targets?.minWcagRatio === 'number') minRatio = spec.targets.minWcagRatio;
  } catch {
    console.error(`style-spec not readable: ${specArg}`);
    process.exit(1);
  }
}
const minApca = Number(getArg(argv, '--min-apca', '60'));
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

/** Non-text (border/UI) floors: WCAG 3.0 + APCA Lc 30. Text uses the CLI flags. */
const BORDER_MIN_RATIO = 3;
const BORDER_MIN_APCA = 30;

interface AuditPair {
  fg: string;
  bg: string;
  kind: 'text' | 'border' | 'decorative';
}

const text = (fg: string, bg: string): AuditPair => ({ fg, bg, kind: 'text' });
const border = (fg: string, bg: string): AuditPair => ({ fg, bg, kind: 'border' });
/** Decorative hairlines: measured and printed, never gated (WCAG 1.4.11 covers meaningful boundaries only). */
const decorative = (fg: string, bg: string): AuditPair => ({ fg, bg, kind: 'decorative' });

const PAIRS: readonly AuditPair[] = [
  // Semantic text on surfaces
  text('semantic.color.text.primary', 'semantic.color.bg.canvas'),
  text('semantic.color.text.primary', 'semantic.color.bg.surface'),
  text('semantic.color.text.primary', 'semantic.color.bg.raised'),
  text('semantic.color.text.secondary', 'semantic.color.bg.canvas'),
  text('semantic.color.text.secondary', 'semantic.color.bg.surface'),
  text('semantic.color.text.tertiary', 'semantic.color.bg.canvas'),
  text('semantic.color.text.link', 'semantic.color.bg.canvas'),
  // Action (rest + hover)
  text('semantic.color.action.primary-text', 'semantic.color.action.primary'),
  text('semantic.color.action.primary-text', 'semantic.color.action.primary-hover'),
  // Feedback text on feedback bg
  ...(['success', 'warning', 'danger', 'info', 'help'] as const).map((role) =>
    text(`semantic.color.feedback.${role}.text`, `semantic.color.feedback.${role}.bg`),
  ),
  // Borders: meaningful boundaries gated; decorative hairlines measured only
  border('semantic.color.border.strong', 'semantic.color.bg.canvas'),
  border('semantic.color.border.focus', 'semantic.color.bg.canvas'),
  decorative('semantic.color.border.default', 'semantic.color.bg.canvas'),
  decorative('semantic.color.border.default', 'semantic.color.bg.surface'),
  decorative('semantic.color.border.subtle', 'semantic.color.bg.canvas'),
  // Components
  text('component.button.text', 'component.button.bg'),
  text('component.button.text', 'component.button.bg-hover'),
  text('component.card.text', 'component.card.bg'),
  text('component.card.text', 'component.card.bg-hover'),
  text('component.input.text', 'component.input.bg'),
  border('component.card.border', 'component.card.bg'),
  border('component.input.border', 'component.input.bg'),
  border('component.input.focus-border', 'component.input.bg'),
  border('component.input.error-border', 'component.input.bg'),
];

const BORDER_KEYS = new Set(
  PAIRS.filter((pair) => pair.kind === 'border').map((pair) => `${pair.fg}|${pair.bg}`),
);
const DECORATIVE_KEYS = new Set(
  PAIRS.filter((pair) => pair.kind === 'decorative').map((pair) => `${pair.fg}|${pair.bg}`),
);

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
  const pairs = PAIRS.flatMap(({ fg, bg, kind }) => {
    const fgColor = resolveColor(fg, flat, unresolvedAliases);
    const bgColor = resolveColor(bg, flat, unresolvedAliases);
    if (fgColor === undefined || bgColor === undefined) return [];
    return [
      checkContrast(
        fg,
        fgColor,
        bg,
        bgColor,
        kind === 'border' ? BORDER_MIN_RATIO : kind === 'decorative' ? 1 : minRatio,
        kind === 'border' ? BORDER_MIN_APCA : kind === 'decorative' ? 0 : minApca,
      ),
    ];
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

const semanticDir = join(tokensDir, 'semantic');
const discoveredThemes = existsSync(semanticDir)
  ? readdirSync(semanticDir)
      .filter((file) => file.endsWith('.tokens.json'))
      .map((file) => file.replace(/\.tokens\.json$/, ''))
      .sort()
  : [];
const themes = theme === 'both' ? discoveredThemes : [theme];
const reports = new Map(themes.map((name) => [name, auditTheme(name)]));
const MANIFEST_NAME = '.token-engine-tokens-manifest.json';
const provenance: TamperReport = checkTampered(join(tokensDir, MANIFEST_NAME), tokensDir, [
  MANIFEST_NAME,
]);
const provenanceFails = provenance.status === 'tampered' || provenance.status === 'unreadable';
const overallPass = [...reports.values()].every((report) => report.pass) && !provenanceFails;

if (asJson) {
  console.log(
    JSON.stringify(
      { pass: overallPass, minRatio, minApca, provenance, themes: Object.fromEntries(reports) },
      null,
      2,
    ),
  );
} else {
  for (const [name, report] of reports) {
    console.log(`\n[${name}] min WCAG ratio ${minRatio}:1`);
    for (const pair of report.pairs) {
      console.log(
        `  ${pair.pass ? 'PASS' : 'FAIL'}  ${pair.ratio.toFixed(2)}:1  Lc ${pair.apcaLc.toFixed(1)}  ${pair.foreground} on ${pair.background}${BORDER_KEYS.has(`${pair.foreground}|${pair.background}`) ? ' (border)' : DECORATIVE_KEYS.has(`${pair.foreground}|${pair.background}`) ? ' (border, decorative)' : ''}`,
      );
    }
    for (const item of report.unresolvedAliases) console.log(`  FAIL  unresolved alias: ${item}`);
    for (const item of report.rawValueViolations) console.log(`  FAIL  ${item}`);
  }
  if (provenanceFails) {
    const parts = [
      ...provenance.changed.map((path) => `changed: ${path}`),
      ...provenance.missing.map((path) => `missing: ${path}`),
    ];
    console.log(`  FAIL  provenance: ${parts.join('; ') || provenance.status}`);
  } else if (provenance.status === 'absent') {
    console.log('  note: no provenance manifest (tree predates the guard)');
  }
  console.log(`\naudit ${overallPass ? 'PASS' : 'FAIL'}`);
}

// Audit stamp: token-build verifies this hash before building (verified gate).
const STAMP_NAME = '.token-engine-audit.json';
const stampPath = join(tokensDir, STAMP_NAME);
if (overallPass) {
  const hashes = collectHashes(tokensDir, [STAMP_NAME, '.token-engine-tokens-manifest.json']);
  const treeHash = sha256Hex(
    Object.entries(hashes)
      .map(([path, hash]) => `${path}:${hash}`)
      .join('\n'),
  );
  writeFileSync(
    stampPath,
    `${JSON.stringify({ version: 1, pass: true, at: Date.now(), treeHash, minRatio, minApca }, null, 2)}\n`,
    'utf8',
  );
} else {
  rmSync(stampPath, { force: true });
}

process.exit(overallPass ? 0 : 1);
