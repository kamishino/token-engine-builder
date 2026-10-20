/**
 * audit — WCAG 2.1 gatekeeper over a 3-tier token tree.
 * Exit 0 = pass, 1 = contrast failure / unresolved alias / raw value above Tier 1.
 *
 * Usage: node ./scripts/audit.mjs --tokens tokens [--theme light|dark|both] [--min-ratio 4.5] [--json]
 */
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkContrast } from '../../../shared/colors.js';
import {
  checkTampered,
  collectHashes,
  sha256Hex,
  type TamperReport,
} from '../../../shared/guard.js';
import { fromCwd, getArg, hasFlag } from '../../../shared/paths.js';
import { loadTokenTree } from '../../../shared/tokens.js';
import type { AuditReport } from '../../../shared/types.js';

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
  // Components — Core 3
  text('component.button.text', 'component.button.bg'),
  text('component.button.text', 'component.button.bg-hover'),
  text('component.card.text', 'component.card.bg'),
  text('component.card.text', 'component.card.bg-hover'),
  text('component.input.text', 'component.input.bg'),
  border('component.card.border', 'component.card.bg'),
  border('component.input.border', 'component.input.bg'),
  border('component.input.focus-border', 'component.input.bg'),
  border('component.input.error-border', 'component.input.bg'),
  // Components — Extended 6 (C1)
  text('component.badge.text', 'component.badge.bg'),
  text('component.alert.text', 'component.alert.bg'),
  text('component.dialog.text', 'component.dialog.bg'),
  text('component.avatar.text', 'component.avatar.bg'),
  text('component.tooltip.text', 'component.tooltip.bg'),
  text('component.table.header-text', 'component.table.header-bg'),
  text('component.table.row-text', 'component.table.row-bg'),
  text('component.table.row-text', 'component.table.row-hover-bg'),
  border('component.alert.icon', 'component.alert.bg'),
  border('component.dialog.border', 'component.dialog.bg'),
  decorative('component.badge.border', 'component.badge.bg'),
  decorative('component.alert.border', 'component.alert.bg'),
  decorative('component.avatar.border', 'component.avatar.bg'),
  decorative('component.table.border', 'component.table.row-bg'),
];
const BORDER_KEYS = new Set(
  PAIRS.filter((pair) => pair.kind === 'border').map((pair) => `${pair.fg}|${pair.bg}`),
);
const DECORATIVE_KEYS = new Set(
  PAIRS.filter((pair) => pair.kind === 'decorative').map((pair) => `${pair.fg}|${pair.bg}`),
);

function auditTheme(themeName: string): AuditReport {
  let tree;
  try {
    tree = loadTokenTree(tokensDir, { theme: themeName });
  } catch {
    return {
      pairs: [],
      unresolvedAliases: [`missing semantic theme: ${themeName}`],
      rawValueViolations: [],
      pass: false,
    };
  }

  const rawValueViolations = tree.checkRawValueViolations();
  const unresolvedAliases: string[] = [];
  const pairs = PAIRS.flatMap(({ fg, bg, kind }) => {
    const fgColor = tree.resolveColor(fg, unresolvedAliases);
    const bgColor = tree.resolveColor(bg, unresolvedAliases);
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

  unresolvedAliases.push(...tree.checkUnresolvedAliases());
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
