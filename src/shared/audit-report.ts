import { checkContrast } from './colors.js';
import {
  checkSpecBinding,
  checkTokensProvenance,
  type SpecBinding,
  type TamperReport,
} from './guard.js';
import { AUDIT_PAIRS } from './roles.js';
import { loadTokenTree, semanticThemes, type LoadedTokenTree } from './tokens.js';
import type { AuditReport, ContrastKind, OklchColor, RemedySuggestion } from './types.js';

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

const ALIAS_VALUE = /^\{([^}]+)\}$/;
const ROLE_ALIAS = /^\{color\.(.+)\.(\d+)\}$/;

function escapeRegExp(s: string): string {
  return s.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Component → semantic hop(s); returns the semantic path an override can target. */
function semanticOverridePath(tree: LoadedTokenTree, path: string): string | undefined {
  if (path.startsWith('semantic.')) return path;
  let current = path;
  for (let depth = 0; depth < 16; depth++) {
    const raw = tree.flat.get(current)?.value;
    if (typeof raw !== 'string') return undefined;
    const match = ALIAS_VALUE.exec(raw.trim());
    if (match?.[1] === undefined) return undefined;
    const target = match[1];
    if (target.startsWith('semantic.')) return target;
    if (target.startsWith('color.')) return undefined;
    current = target;
  }
  return undefined;
}

function nearestPassingAlias(
  tree: LoadedTokenTree,
  semanticPath: string,
  otherPath: string,
  otherColor: OklchColor,
  floors: AuditFloors,
  kind: ContrastKind,
  roleIsFg: boolean,
): { alias: string; ratio: number; apcaLc: number } | undefined {
  const currentVal = tree.flat.get(semanticPath)?.value;
  if (typeof currentVal !== 'string') return undefined;
  const match = ROLE_ALIAS.exec(currentVal.trim());
  if (match?.[1] === undefined || match[2] === undefined) return undefined;
  const family = match[1];
  const currentStep = Number(match[2]);

  const candidatePattern = new RegExp(`^color\\.${escapeRegExp(family)}\\.(\\d+)$`);
  const candidates: Array<{ path: string; step: number }> = [];
  for (const key of tree.flat.keys()) {
    const m = candidatePattern.exec(key);
    if (m?.[1] !== undefined) {
      const step = Number(m[1]);
      if (step !== currentStep) {
        candidates.push({ path: key, step });
      }
    }
  }

  candidates.sort((a, b) => {
    const distDiff = Math.abs(a.step - currentStep) - Math.abs(b.step - currentStep);
    return distDiff !== 0 ? distDiff : a.step - b.step;
  });

  for (const cand of candidates) {
    const color = tree.resolveColor(cand.path);
    if (color === undefined) continue;
    const res = roleIsFg
      ? checkContrast(semanticPath, color, otherPath, otherColor, floors.ratio, floors.apca, kind)
      : checkContrast(otherPath, otherColor, semanticPath, color, floors.ratio, floors.apca, kind);
    if (res.pass) {
      return { alias: `{${cand.path}}`, ratio: res.ratio, apcaLc: res.apcaLc };
    }
  }
  return undefined;
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
  for (const pair of pairs) {
    if (pair.pass || pair.kind === 'decorative') continue;
    const floor = floors[pair.kind];
    const fgPath = semanticOverridePath(tree, pair.foreground);
    const bgPath = semanticOverridePath(tree, pair.background);
    const fgColor = tree.resolveColor(pair.foreground, []);
    const bgColor = tree.resolveColor(pair.background, []);

    let suggestion: RemedySuggestion | undefined;
    if (fgPath !== undefined && bgColor !== undefined) {
      const candidate = nearestPassingAlias(
        tree,
        fgPath,
        pair.background,
        bgColor,
        floor,
        pair.kind,
        true,
      );
      if (candidate !== undefined) {
        suggestion = {
          path: fgPath,
          alias: candidate.alias,
          ratio: candidate.ratio,
          apcaLc: candidate.apcaLc,
          side: 'foreground',
        };
      }
    }
    if (suggestion === undefined && bgPath !== undefined && fgColor !== undefined) {
      const candidate = nearestPassingAlias(
        tree,
        bgPath,
        pair.foreground,
        fgColor,
        floor,
        pair.kind,
        false,
      );
      if (candidate !== undefined) {
        suggestion = {
          path: bgPath,
          alias: candidate.alias,
          ratio: candidate.ratio,
          apcaLc: candidate.apcaLc,
          side: 'background',
        };
      }
    }
    if (suggestion !== undefined) {
      pair.suggestion = suggestion;
    }
  }
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

export interface RawColorPair {
  id: string;
  selector: string;
  file: string;
  fgHex: string;
  bgHex: string;
  wcagRatio: number;
  apcaLc: number;
  passWcag: boolean;
  passApca: boolean;
  roleTag: string;
}

export interface PreAuditBaseline {
  timestamp: string;
  pairs: RawColorPair[];
  summary: {
    total: number;
    passWcag: number;
    failWcag: number;
    passApca: number;
    failApca: number;
    avgRatio: number;
  };
}

export interface DeltaScorecardRow {
  roleOrSelector: string;
  baselineRatio: number;
  baselinePass: boolean;
  tokensRatio: number;
  tokensPass: boolean;
  deltaRatio: number;
  status: 'Fixed by Token Math' | 'Maintained' | 'Action Required';
}

export interface DeltaScorecard {
  rows: DeltaScorecardRow[];
  fixedCount: number;
  totalCompared: number;
}

export function computeDeltaScorecard(
  baseline: PreAuditBaseline,
  report: AuditReport,
): DeltaScorecard {
  const rows: DeltaScorecardRow[] = [];
  let fixedCount = 0;

  for (const bp of baseline.pairs) {
    const match = report.pairs.find((p) => {
      const fg = p.foreground.toLowerCase();
      if (bp.roleTag === 'button') return fg.includes('button');
      if (bp.roleTag === 'card') return fg.includes('card');
      if (bp.roleTag === 'input') return fg.includes('input');
      if (bp.roleTag === 'dialog') return fg.includes('dialog');
      if (bp.roleTag === 'table') return fg.includes('table');
      if (bp.roleTag === 'alert') return fg.includes('alert');
      if (bp.roleTag === 'text.secondary') return fg.includes('text.secondary');
      return fg.includes('text.primary');
    });

    if (match) {
      const deltaRatio = Number((match.ratio - bp.wcagRatio).toFixed(2));
      const status: DeltaScorecardRow['status'] =
        !bp.passWcag && match.pass
          ? 'Fixed by Token Math'
          : match.pass
            ? 'Maintained'
            : 'Action Required';
      if (status === 'Fixed by Token Math') fixedCount++;
      rows.push({
        roleOrSelector: bp.selector || bp.roleTag,
        baselineRatio: bp.wcagRatio,
        baselinePass: bp.passWcag,
        tokensRatio: match.ratio,
        tokensPass: match.pass,
        deltaRatio,
        status,
      });
    }
  }

  return { rows, fixedCount, totalCompared: rows.length };
}

export function renderDeltaScorecardTable(scorecard: DeltaScorecard): string {
  const lines: string[] = [
    '',
    '================================================================================',
    '                    DUAL-AUDIT DELTA SCORECARD (Before vs After)                ',
    '================================================================================',
    '  Role / Selector         Pre-Audit        Post-Audit       Status',
    '--------------------------------------------------------------------------------',
  ];
  for (const r of scorecard.rows) {
    const pre = `${r.baselineRatio.toFixed(2)}:1 (${r.baselinePass ? 'PASS' : 'FAIL'})`.padEnd(16);
    const post = `${r.tokensRatio.toFixed(2)}:1 (${r.tokensPass ? 'PASS' : 'FAIL'})`.padEnd(16);
    const delta = r.deltaRatio >= 0 ? `+${r.deltaRatio.toFixed(2)}` : `${r.deltaRatio.toFixed(2)}`;
    const sel = r.roleOrSelector.slice(0, 22).padEnd(24);
    lines.push(`  ${sel} ${pre} ${post} ${r.status} (${delta})`);
  }
  lines.push('================================================================================');
  lines.push(
    `  Summary: ${scorecard.fixedCount} of ${scorecard.totalCompared} production contrast flaw(s) fixed by token math.`,
  );
  lines.push('');
  return lines.join('\n');
}
