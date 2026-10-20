/**
 * audit — WCAG 2.1 gatekeeper over a 3-tier token tree.
 * Exit 0 = pass, 1 = contrast failure / unresolved alias / raw value above Tier 1.
 *
 * Usage: node ./scripts/audit.mjs --tokens tokens [--theme light|dark|both] [--min-ratio 4.5] [--json]
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { checkContrast } from '../../../shared/colors.js';
import {
  checkTokensProvenance,
  removeAuditStamp,
  writeAuditStamp,
  type TamperReport,
} from '../../../shared/guard.js';
import { fromCwd, getArg, hasFlag, isMainModule } from '../../../shared/paths.js';
import { AUDIT_PAIRS } from '../../../shared/roles.js';
import { loadStyleSpec } from '../../../shared/spec.js';
import { loadTokenTree } from '../../../shared/tokens.js';
import type { AuditReport } from '../../../shared/types.js';

export function runAudit(argv = process.argv.slice(2)): number {
  if (hasFlag(argv, '--help')) {
    console.log(
      'Usage: audit.mjs --tokens <dir> [--theme light|dark|both] [--min-ratio 4.5] [--min-apca 60] [--spec <style-spec.json>] [--json]',
    );
    return 0;
  }

  const tokensDir = fromCwd(getArg(argv, '--tokens', 'tokens') as string);
  const theme = getArg(argv, '--theme', 'both') as string;
  const specArg = getArg(argv, '--spec');
  let minRatio = Number(getArg(argv, '--min-ratio', '4.5'));
  if (!argv.includes('--min-ratio') && specArg !== undefined) {
    try {
      const spec = loadStyleSpec(fromCwd(specArg)).spec;
      if (typeof spec.targets?.minWcagRatio === 'number') minRatio = spec.targets.minWcagRatio;
    } catch {
      console.error(`style-spec not readable: ${specArg}`);
      return 1;
    }
  }
  const minApca = Number(getArg(argv, '--min-apca', '60'));
  const asJson = hasFlag(argv, '--json');

  if (!existsSync(tokensDir)) {
    console.error(`tokens dir not found: ${tokensDir}`);
    return 1;
  }

  /** Non-text (border/UI) floors: WCAG 3.0 + APCA Lc 30. Text uses the CLI flags. */
  const BORDER_MIN_RATIO = 3;
  const BORDER_MIN_APCA = 30;

  const BORDER_KEYS = new Set(
    AUDIT_PAIRS.filter((pair) => pair.kind === 'border').map((pair) => `${pair.fg}|${pair.bg}`),
  );
  const DECORATIVE_KEYS = new Set(
    AUDIT_PAIRS.filter((pair) => pair.kind === 'decorative').map((pair) => `${pair.fg}|${pair.bg}`),
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
    const pairs = AUDIT_PAIRS.flatMap(({ fg, bg, kind }) => {
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
  const provenance: TamperReport = checkTokensProvenance(tokensDir);
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
  if (overallPass) {
    writeAuditStamp(tokensDir, { minRatio, minApca });
  } else {
    removeAuditStamp(tokensDir);
  }

  return overallPass ? 0 : 1;
}

if (isMainModule(import.meta.url, 'audit.mjs', 'audit.ts')) {
  process.exit(runAudit());
}
