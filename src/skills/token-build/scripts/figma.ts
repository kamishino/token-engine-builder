/**
 * figma — sync bridge between W3C DTCG design tokens and Figma Variables REST API format.
 *
 * Supports bidirectional translation:
 * - Export: W3C DTCG tokens directory → Figma Variables collection JSON (COLOR, FLOAT, STRING)
 * - Import: Figma Variables JSON → W3C DTCG 3-tier token directory
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { usageText } from '../../../shared/cli-flags.js';
import { dtcgColorValue, oklchToHex, parseToOklch } from '../../../shared/colors.js';
import {
  assertSafeOutDir,
  checkTokensProvenance,
  decideWrite,
  reportWriteRefusal,
  sha256Hex,
  writeTokensProvenance,
} from '../../../shared/guard.js';
import { fromCwd, getArg, hasFlag, isMainModule } from '../../../shared/paths.js';
import { findTokenFiles, walkTokenLeaves, type JsonObject } from '../../../shared/tokens.js';
import type { DtcgColorValue } from '../../../shared/types.js';

function hexToFigmaRgb(hex: string): {
  rgb: { r: number; g: number; b: number; a: number };
  rounded: boolean;
} {
  const clean = hex.replace('#', '');
  const expanded =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const rawR = Number.parseInt(expanded.slice(0, 2), 16) / 255;
  const rawG = Number.parseInt(expanded.slice(2, 4), 16) / 255;
  const rawB = Number.parseInt(expanded.slice(4, 6), 16) / 255;
  const a = expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1;
  const r = Number(rawR.toFixed(4));
  const g = Number(rawG.toFixed(4));
  const b = Number(rawB.toFixed(4));
  const rounded = r !== rawR || g !== rawG || b !== rawB;
  return { rgb: { r, g, b, a }, rounded };
}

function figmaRgbToHex(rgb: { r: number; g: number; b: number; a?: number }): string {
  const to255 = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  const hex = `#${to255(rgb.r)}${to255(rgb.g)}${to255(rgb.b)}`;
  if (rgb.a !== undefined && rgb.a < 1) {
    return `${hex}${to255(rgb.a)}`;
  }
  return hex;
}
function hasNumericValue(obj: unknown): obj is { value: number } {
  if (obj === null || typeof obj !== 'object' || !('value' in obj)) return false;
  return typeof obj.value === 'number';
}

export type FigmaLossKind =
  'alias' | 'unreadable' | 'precision' | 'dimension' | 'mode' | 'type' | 'payload';

export interface FigmaLoss {
  path: string;
  kind: FigmaLossKind;
  detail: string;
}

export function loadTokenTrees(files: string[]): {
  trees: JsonObject[];
  losses: FigmaLoss[];
} {
  const trees: JsonObject[] = [];
  const losses: FigmaLoss[] = [];
  for (const file of files) {
    try {
      trees.push(JSON.parse(readFileSync(file, 'utf8')) as JsonObject);
    } catch (error) {
      losses.push({
        path: file,
        kind: 'unreadable',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { trees, losses };
}

export interface FigmaVariable {
  id: string;
  name: string;
  key: string;
  variableCollectionId: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  description: string;
  valuesByMode: Record<string, unknown>;
}

export function dtcgTokensToFigma(
  trees: JsonObject[],
  options: { collectionId?: string; defaultModeId?: string } = {},
): { variables: FigmaVariable[]; losses: FigmaLoss[] } {
  const collectionId = options.collectionId ?? 'VariableCollectionId:1:1';
  const defaultModeId = options.defaultModeId ?? '1:0';
  const variables: FigmaVariable[] = [];
  const losses: FigmaLoss[] = [];
  const pushVariable = (
    path: string,
    resolvedType: FigmaVariable['resolvedType'],
    description: string,
    value: unknown,
  ): void => {
    variables.push({
      id: `VariableID:${variables.length + 1}`,
      name: path,
      key: path.replaceAll('/', '_'),
      variableCollectionId: collectionId,
      resolvedType,
      description,
      valuesByMode: { [defaultModeId]: value },
    });
  };
  const visitLeaf = (path: string, rec: JsonObject): void => {
    const val = rec['$value'];
    const type = (rec['$type'] as string) || '';
    const desc = (rec['$description'] as string) || '';

    if (typeof val === 'string' && val.startsWith('{')) {
      losses.push({ path, kind: 'alias', detail: `exported as literal STRING: ${val}` });
      pushVariable(path, 'STRING', `Alias to ${val}`, val);
      return;
    }

    if (type === 'color' || (typeof val === 'object' && val && 'colorSpace' in val)) {
      let hex = '#000000';
      if (typeof val === 'object' && val && 'hex' in val) {
        hex = String((val as DtcgColorValue).hex);
      } else if (typeof val === 'string') {
        hex = oklchToHex(parseToOklch(val));
      }
      const { rgb, rounded } = hexToFigmaRgb(hex);
      if (rounded) {
        losses.push({ path, kind: 'precision', detail: 'RGBA rounded to 4 decimal places' });
      }
      pushVariable(path, 'COLOR', desc, rgb);
    } else if (type === 'dimension' || typeof val === 'number' || hasNumericValue(val)) {
      let num = typeof val === 'number' ? val : 0;
      if (hasNumericValue(val)) {
        const vObj = val as { value: number; unit?: string };
        if (vObj.unit !== undefined && vObj.unit !== 'px' && vObj.unit !== 'rem') {
          losses.push({
            path,
            kind: 'dimension',
            detail: `unsupported dimension unit "${vObj.unit}" exported as 0`,
          });
          num = 0;
        } else {
          num = vObj.value;
        }
      } else if (typeof val === 'string') {
        if (val.endsWith('rem')) num = Math.round(Number.parseFloat(val) * 16);
        else if (val.endsWith('px')) num = Number.parseFloat(val);
        else {
          losses.push({
            path,
            kind: 'dimension',
            detail: `unparsed dimension "${val}" exported as 0`,
          });
          num = 0;
        }
      }
      pushVariable(path, 'FLOAT', desc, num);
    } else {
      pushVariable(path, 'STRING', desc, String(val));
    }
  };

  for (const tree of trees) {
    walkTokenLeaves(tree, '/', visitLeaf);
  }

  return {
    variables,
    losses,
  };
}

export function figmaVariablesToDtcg(variables: FigmaVariable[]): {
  tokensTree: JsonObject;
  losses: FigmaLoss[];
} {
  const rootObj: JsonObject = {};
  const losses: FigmaLoss[] = [];
  for (const v of variables) {
    const modeKeys = Object.keys(v.valuesByMode);
    if (modeKeys.length > 1) {
      losses.push({
        path: v.name,
        kind: 'mode',
        detail: `variable has ${modeKeys.length} modes, imported first mode only`,
      });
    }
    const parts = v.name.split('/');
    let cur = rootObj;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i] as string;
      cur[p] = cur[p] ?? {};
      cur = cur[p] as JsonObject;
    }
    const lastKey = parts[parts.length - 1] as string;
    const firstModeVal = Object.values(v.valuesByMode)[0];

    if (v.resolvedType === 'COLOR' && firstModeVal && typeof firstModeVal === 'object') {
      const hex = figmaRgbToHex(firstModeVal as { r: number; g: number; b: number; a?: number });
      const oklch = parseToOklch(hex);
      losses.push({ path: v.name, kind: 'precision', detail: 'imported as 8-bit RGBA' });
      cur[lastKey] = {
        $value: dtcgColorValue(oklch),
        $type: 'color',
        ...(v.description ? { $description: v.description } : {}),
      };
    } else if (v.resolvedType === 'FLOAT' && typeof firstModeVal === 'number') {
      cur[lastKey] = {
        $value: `${firstModeVal}px`,
        $type: 'dimension',
        ...(v.description ? { $description: v.description } : {}),
      };
    } else {
      if (firstModeVal === undefined) {
        losses.push({ path: v.name, kind: 'mode', detail: 'no value in first mode; skipped' });
        continue;
      }
      if (v.resolvedType !== 'STRING') {
        losses.push({
          path: v.name,
          kind: 'type',
          detail: `variable type ${v.resolvedType} imported as $type "other"`,
        });
      }
      cur[lastKey] = {
        $value: String(firstModeVal),
        $type: v.resolvedType === 'STRING' ? 'string' : 'other',
        ...(v.description ? { $description: v.description } : {}),
      };
    }
  }
  return { tokensTree: rootObj, losses };
}

export interface FigmaCollection {
  id: string;
  name: string;
  modes: Array<{ modeId: string; name: string }>;
  defaultModeId: string;
}

export interface FigmaFile {
  status: 200;
  error: false;
  meta: {
    variableCollections: Record<string, FigmaCollection>;
    variables: Record<string, FigmaVariable>;
  };
}

/** Build the Figma Variables REST file envelope from converted variables. */
export function toFigmaFile(
  variables: FigmaVariable[],
  options: {
    collectionId?: string;
    defaultModeId?: string;
    collectionName?: string;
    modeName?: string;
  } = {},
): FigmaFile {
  const collectionId = options.collectionId ?? 'VariableCollectionId:1:1';
  const defaultModeId = options.defaultModeId ?? '1:0';
  return {
    status: 200,
    error: false,
    meta: {
      variableCollections: {
        [collectionId]: {
          id: collectionId,
          name: options.collectionName ?? 'Design Tokens (DTCG)',
          modes: [{ modeId: defaultModeId, name: options.modeName ?? 'Value' }],
          defaultModeId,
        },
      },
      variables: Object.fromEntries(variables.map((variable) => [variable.id, variable])),
    },
  };
}

/** Read variables out of a Figma file envelope; malformed `meta.variables` is a typed loss. */
export function fromFigmaFile(payload: unknown): {
  variables: FigmaVariable[];
  losses: FigmaLoss[];
} {
  const meta = (payload as { meta?: { variables?: unknown } } | null)?.meta;
  const record = meta?.variables;
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    return {
      variables: [],
      losses: [{ path: 'meta.variables', kind: 'payload', detail: 'missing or not an object' }],
    };
  }
  return { variables: Object.values(record as Record<string, FigmaVariable>), losses: [] };
}

// -------------------------------------------------------------
// 1. EXPORT: DTCG tokens -> Figma Variables JSON
// -------------------------------------------------------------
export function runFigma(argv = process.argv.slice(2)): number {
  if (hasFlag(argv, '--help')) {
    console.log(usageText('token-build/scripts/figma.mjs'));
    return 0;
  }

  const force = hasFlag(argv, '--force');

  const toFigmaArg = getArg(argv, '--to-figma');
  const fromFigmaArg = getArg(argv, '--from-figma');
  const outArg = getArg(argv, '--out', toFigmaArg ? 'figma-variables.json' : 'tokens');

  if (!toFigmaArg && !fromFigmaArg) {
    console.error('specify either --to-figma <tokens-dir> or --from-figma <figma-variables.json>');
    return 1;
  }

  if (toFigmaArg) {
    const tokensDir = fromCwd(toFigmaArg);
    if (!existsSync(tokensDir)) {
      console.error(`tokens directory not found: ${tokensDir}`);
      return 1;
    }

    const files = findTokenFiles(tokensDir);
    const collectionId = 'VariableCollectionId:1:1';
    const defaultModeId = '1:0';
    const loaded = loadTokenTrees(files);
    const { variables, losses } = dtcgTokensToFigma(loaded.trees, {
      collectionId,
      defaultModeId,
    });
    for (const loss of [...loaded.losses, ...losses]) {
      console.log(`[figma] note: [${loss.kind}] ${loss.path}: ${loss.detail}`);
    }
    const figmaPayload = toFigmaFile(variables, { collectionId, defaultModeId });

    const outFile = fromCwd(outArg);
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, `${JSON.stringify(figmaPayload, null, 2)}\n`, 'utf8');
    console.log(`exported ${variables.length} Figma variables → ${outArg}`);
    return 0;
  }

  if (fromFigmaArg) {
    const figmaPath = fromCwd(fromFigmaArg);
    if (!existsSync(figmaPath)) {
      console.error(`figma variables file not found: ${figmaPath}`);
      return 1;
    }

    const { variables: vars, losses: payloadLosses } = fromFigmaFile(
      JSON.parse(readFileSync(figmaPath, 'utf8')),
    );
    for (const loss of payloadLosses) {
      console.log(`[figma] note: [${loss.kind}] ${loss.path}: ${loss.detail}`);
    }

    if (vars.length === 0) {
      console.error('no variables found in figma payload');
      return 1;
    }

    const outTokensDir = fromCwd(outArg);
    const safeError = assertSafeOutDir(outTokensDir, process.cwd());
    if (safeError !== null) {
      console.error(safeError);
      return 1;
    }

    const { tokensTree: rootObj, losses } = figmaVariablesToDtcg(vars);
    for (const loss of losses) {
      console.log(`[figma] note: [${loss.kind}] ${loss.path}: ${loss.detail}`);
    }

    const outPrimitive = join(outTokensDir, 'primitive');
    const target = join(outPrimitive, 'figma-imported.tokens.json');
    const tamper = existsSync(outTokensDir) ? checkTokensProvenance(outTokensDir) : null;
    const decision = decideWrite({ paths: [target], tamper, force });
    if (decision.kind === 'refuse') {
      console.error(reportWriteRefusal(decision, outTokensDir, 'tokens'));
      return 1;
    }
    if (decision.replaces && force && tamper?.status !== 'absent') {
      console.log('adopting existing tree: provenance manifest rewritten over the whole directory');
    }

    mkdirSync(outPrimitive, { recursive: true });
    writeFileSync(target, `${JSON.stringify(rootObj, null, 2)}\n`, 'utf8');
    writeTokensProvenance(outTokensDir, sha256Hex(readFileSync(figmaPath)));
    console.log(
      `imported ${vars.length} Figma variables → ${join(outArg, 'primitive/figma-imported.tokens.json')}`,
    );
    return 0;
  }

  return 0;
}

if (isMainModule(import.meta.url, 'figma.mjs', 'figma.ts')) {
  process.exit(runFigma());
}
