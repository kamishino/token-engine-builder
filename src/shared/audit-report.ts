import { checkContrast } from './colors.js';
import {
  checkSpecBinding,
  checkTokensProvenance,
  type SpecBinding,
  type TamperReport,
} from './guard.js';
import { AUDIT_PAIRS } from './roles.js';
import { loadTokenTree, semanticThemes, type LoadedTokenTree } from './tokens.js';
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
  specBinding?: SpecBinding;
  themes: Record<string, AuditReport>;
}

export function auditTokens(
  tokensDir: string,
  options: {
    theme?: string;
    minRatio?: number;
    minApca?: number;
    specHash?: string | undefined;
  } = {},
): AuditResult {
  const minRatio = options.minRatio ?? 4.5;
  const minApca = options.minApca ?? 60;
  const floors = floorTable(minRatio, minApca);
  const discovered = semanticThemes(tokensDir);
  const themes =
    options.theme === undefined || options.theme === 'both' ? discovered : [options.theme];
  const reports = new Map<string, AuditReport>();

  for (const themeName of themes) {
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
  const specBinding =
    options.specHash === undefined ? undefined : checkSpecBinding(tokensDir, options.specHash);
  const noThemes = themes.length === 0;
  const pass =
    !noThemes &&
    [...reports.values()].every((report) => report.pass) &&
    !provenanceFails &&
    (specBinding === undefined || specBinding === 'match');
  return {
    pass,
    minRatio,
    minApca,
    provenance,
    ...(specBinding === undefined ? {} : { specBinding }),
    themes: Object.fromEntries(reports),
  };
}
