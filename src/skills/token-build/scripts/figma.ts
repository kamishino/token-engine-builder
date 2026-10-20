/**
 * figma — sync bridge between W3C DTCG design tokens and Figma Variables REST API format.
 *
 * Supports bidirectional translation:
 * - Export: W3C DTCG tokens directory → Figma Variables collection JSON (COLOR, FLOAT, STRING)
 * - Import: Figma Variables JSON → W3C DTCG 3-tier token directory
 *
 * Usage:
 *   node ./scripts/figma.mjs --to-figma <tokens-dir> --out figma-variables.json
 *   node ./scripts/figma.mjs --from-figma <figma-variables.json> --out tokens
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dtcgColorValue, oklchToHex, parseToOklch } from '../../../shared/colors.js';
import { fromCwd, getArg, hasFlag } from '../../../shared/paths.js';
import { findTokenFiles } from '../../../shared/tokens.js';
import type { DtcgColorValue } from '../../../shared/types.js';

type JsonObject = Record<string, unknown>;

function hexToFigmaRgb(hex: string): { r: number; g: number; b: number; a: number } {
  const clean = hex.replace('#', '');
  const r = Number.parseInt(clean.slice(0, 2), 16) / 255;
  const g = Number.parseInt(clean.slice(2, 4), 16) / 255;
  const b = Number.parseInt(clean.slice(4, 6), 16) / 255;
  const a = clean.length === 8 ? Number.parseInt(clean.slice(6, 8), 16) / 255 : 1;
  return { r: Number(r.toFixed(4)), g: Number(g.toFixed(4)), b: Number(b.toFixed(4)), a };
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
  sources: JsonObject | string[],
  options: { collectionId?: string; defaultModeId?: string } = {},
): { variables: FigmaVariable[]; collections: unknown[] } {
  const collectionId = options.collectionId ?? 'VariableCollectionId:1:1';
  const defaultModeId = options.defaultModeId ?? '1:0';
  const variables: FigmaVariable[] = [];

  function flatten(node: JsonObject, prefix: string): void {
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('$')) continue;
      if (value === null || typeof value !== 'object') continue;
      const path = prefix === '' ? key : `${prefix}/${key}`;
      const rec = value as JsonObject;

      if ('$value' in rec) {
        const val = rec['$value'];
        const type = (rec['$type'] as string) || '';
        const desc = (rec['$description'] as string) || '';

        if (typeof val === 'string' && val.startsWith('{')) {
          variables.push({
            id: `VariableID:${variables.length + 1}`,
            name: path,
            key: path.replaceAll('/', '_'),
            variableCollectionId: collectionId,
            resolvedType: 'STRING',
            description: `Alias to ${val}`,
            valuesByMode: { [defaultModeId]: val },
          });
          continue;
        }

        if (type === 'color' || (typeof val === 'object' && val && 'colorSpace' in val)) {
          let hex = '#000000';
          if (typeof val === 'object' && val && 'hex' in val) {
            hex = String((val as DtcgColorValue).hex);
          } else if (typeof val === 'string') {
            hex = oklchToHex(parseToOklch(val));
          }
          variables.push({
            id: `VariableID:${variables.length + 1}`,
            name: path,
            key: path.replaceAll('/', '_'),
            variableCollectionId: collectionId,
            resolvedType: 'COLOR',
            description: desc,
            valuesByMode: { [defaultModeId]: hexToFigmaRgb(hex) },
          });
        } else if (type === 'dimension' || typeof val === 'number' || hasNumericValue(val)) {
          let num = typeof val === 'number' ? val : 0;
          if (hasNumericValue(val)) {
            num = val.value;
          } else if (typeof val === 'string') {
            if (val.endsWith('rem')) num = Math.round(Number.parseFloat(val) * 16);
            else if (val.endsWith('px')) num = Number.parseFloat(val);
          }
          variables.push({
            id: `VariableID:${variables.length + 1}`,
            name: path,
            key: path.replaceAll('/', '_'),
            variableCollectionId: collectionId,
            resolvedType: 'FLOAT',
            description: desc,
            valuesByMode: { [defaultModeId]: num },
          });
        } else {
          variables.push({
            id: `VariableID:${variables.length + 1}`,
            name: path,
            key: path.replaceAll('/', '_'),
            variableCollectionId: collectionId,
            resolvedType: 'STRING',
            description: desc,
            valuesByMode: { [defaultModeId]: String(val) },
          });
        }
      } else {
        flatten(rec, path);
      }
    }
  }

  if (Array.isArray(sources)) {
    for (const file of sources) {
      try {
        flatten(JSON.parse(readFileSync(file, 'utf8')) as JsonObject, '');
      } catch {
        // skip unreadable
      }
    }
  } else {
    flatten(sources, '');
  }

  return {
    variables,
    collections: [
      {
        id: collectionId,
        name: 'Design Tokens',
        modes: [{ modeId: defaultModeId, name: 'Default' }],
        defaultModeId,
      },
    ],
  };
}

export function figmaVariablesToDtcg(variables: FigmaVariable[]): JsonObject {
  const rootObj: JsonObject = {};
  for (const v of variables) {
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
      cur[lastKey] = {
        $value: String(firstModeVal ?? ''),
        $type: v.resolvedType === 'STRING' ? 'string' : 'other',
        ...(v.description ? { $description: v.description } : {}),
      };
    }
  }
  return rootObj;
}

// -------------------------------------------------------------
// 1. EXPORT: DTCG tokens -> Figma Variables JSON
// -------------------------------------------------------------
function runCli(): void {
  const argv = process.argv.slice(2);

  if (hasFlag(argv, '--help')) {
    console.log(`Usage:
  Export to Figma:
    node figma.mjs --to-figma <tokens-dir> --out <figma-variables.json>
  Import from Figma:
    node figma.mjs --from-figma <figma-variables.json> --out <tokens-dir>`);
    process.exit(0);
  }

  const toFigmaArg = getArg(argv, '--to-figma');
  const fromFigmaArg = getArg(argv, '--from-figma');
  const outArg = getArg(argv, '--out', toFigmaArg ? 'figma-variables.json' : 'tokens') as string;

  if (!toFigmaArg && !fromFigmaArg) {
    console.error('specify either --to-figma <tokens-dir> or --from-figma <figma-variables.json>');
    process.exit(1);
  }

  if (toFigmaArg) {
    const tokensDir = fromCwd(toFigmaArg);
    if (!existsSync(tokensDir)) {
      console.error(`tokens directory not found: ${tokensDir}`);
      process.exit(1);
    }

    const files = findTokenFiles(tokensDir);
    const collectionId = 'VariableCollectionId:1:1';
    const defaultModeId = '1:0';
    const { variables } = dtcgTokensToFigma(files, { collectionId, defaultModeId });
    const figmaPayload = {
      status: 200,
      error: false,
      meta: {
        variableCollections: {
          [collectionId]: {
            id: collectionId,
            name: 'Design Tokens (DTCG)',
            modes: [{ modeId: defaultModeId, name: 'Value' }],
            defaultModeId,
          },
        },
        variables: Object.fromEntries(variables.map((v) => [v.id, v])),
      },
    };

    const outFile = fromCwd(outArg);
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, `${JSON.stringify(figmaPayload, null, 2)}\n`, 'utf8');
    console.log(`exported ${variables.length} Figma variables → ${outArg}`);
  }

  if (fromFigmaArg) {
    const figmaPath = fromCwd(fromFigmaArg);
    if (!existsSync(figmaPath)) {
      console.error(`figma variables file not found: ${figmaPath}`);
      process.exit(1);
    }

    const payload = JSON.parse(readFileSync(figmaPath, 'utf8')) as {
      meta?: {
        variables?: Record<string, FigmaVariable>;
      };
    };

    const vars = Object.values(payload.meta?.variables ?? {});
    if (vars.length === 0) {
      console.error('no variables found in figma payload');
      process.exit(1);
    }

    const outTokensDir = fromCwd(outArg);
    mkdirSync(outTokensDir, { recursive: true });

    const rootObj = figmaVariablesToDtcg(vars);

    const outPrimitive = join(outTokensDir, 'primitive');
    mkdirSync(outPrimitive, { recursive: true });
    writeFileSync(
      join(outPrimitive, 'figma-imported.tokens.json'),
      `${JSON.stringify(rootObj, null, 2)}\n`,
      'utf8',
    );
    console.log(
      `imported ${vars.length} Figma variables → ${join(outArg, 'primitive/figma-imported.tokens.json')}`,
    );
  }
}

const isMain =
  process.argv[1] !== undefined &&
  (resolve(process.argv[1]) === fileURLToPath(import.meta.url) ||
    process.argv[1].endsWith('figma.mjs') ||
    process.argv[1].endsWith('figma.ts'));

if (isMain) {
  runCli();
}
