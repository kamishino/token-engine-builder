import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { checkContrast } from './colors.js';
import { checkTokensProvenance, type TamperReport } from './guard.js';
import { AUDIT_PAIRS } from './roles.js';
import { loadTokenTree, type LoadedTokenTree } from './tokens.js';
import type { AuditReport, ContrastKind } from './types.js';

export interface AuditFloors {
  ratio: number;
  apca: number;
}

export function floorTable(minRatio: number, minApca: number): Record<ContrastKind, AuditFloors> {
  return {
    text: { ratio: minRatio, apca: minApca },
    border: { ratio: 3, apca: 30 },
    decorative: { ratio: 1, apca: 0 },
  };
}

export function discoverSemanticThemes(tokensDir: string): string[] {
  const semanticDir = join(tokensDir, 'semantic');
  if (!existsSync(semanticDir)) return [];
  return readdirSync(semanticDir)
    .filter((file) => file.endsWith('.tokens.json'))
    .map((file) => file.replace(/\.tokens\.json$/, ''))
    .sort();
}

export function evaluateTheme(
  tree: LoadedTokenTree,
  floors: Record<ContrastKind, AuditFloors> = floorTable(4.5, 60),
): AuditReport {
  const rawValueViolations = tree.checkRawValueViolations();
  const unresolvedAliases: string[] = [];
  const pairs = AUDIT_PAIRS.flatMap(({ fg, bg, kind }) => {
    const fgColor = tree.resolveColor(fg, unresolvedAliases);
    const bgColor = tree.resolveColor(bg, unresolvedAliases);
    if (fgColor === undefined || bgColor === undefined) return [];
    const floor = floors[kind];
    return [checkContrast(fg, fgColor, bg, bgColor, floor.ratio, floor.apca, kind)];
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

export interface AuditResult {
  pass: boolean;
  minRatio: number;
  minApca: number;
  provenance: TamperReport;
  themes: Record<string, AuditReport>;
}

export function auditTokens(
  tokensDir: string,
  options: { theme?: string; minRatio?: number; minApca?: number } = {},
): AuditResult {
  const minRatio = options.minRatio ?? 4.5;
  const minApca = options.minApca ?? 60;
  const floors = floorTable(minRatio, minApca);
  const discovered = discoverSemanticThemes(tokensDir);
  const themes =
    options.theme === undefined || options.theme === 'both' ? discovered : [options.theme];
  const reports = new Map<string, AuditReport>();

  for (const themeName of themes) {
    const semanticFile = join(tokensDir, 'semantic', `${themeName}.tokens.json`);
    if (!existsSync(semanticFile)) {
      reports.set(themeName, {
        pairs: [],
        unresolvedAliases: [`missing semantic theme: ${themeName} (${semanticFile})`],
        rawValueViolations: [],
        pass: false,
      });
      continue;
    }
    let tree: LoadedTokenTree;
    try {
      tree = loadTokenTree(tokensDir, { theme: themeName });
    } catch (error) {
      reports.set(themeName, {
        pairs: [],
        unresolvedAliases: [
          `unreadable token tree for ${themeName}: ${error instanceof Error ? error.message : String(error)}`,
        ],
        rawValueViolations: [],
        pass: false,
      });
      continue;
    }
    reports.set(themeName, evaluateTheme(tree, floors));
  }

  const provenance = checkTokensProvenance(tokensDir);
  const provenanceFails = provenance.status === 'tampered' || provenance.status === 'unreadable';
  const noThemes = themes.length === 0;
  const pass =
    !noThemes && [...reports.values()].every((report) => report.pass) && !provenanceFails;
  return { pass, minRatio, minApca, provenance, themes: Object.fromEntries(reports) };
}
