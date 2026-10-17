/**
 * Style Dictionary v4 ESM programmatic builder.
 *
 * Custom hooks (the v4 registration surface):
 * - `color/oklch` transform: DTCG color object → CSS `oklch()` string.
 * - `dimension/rem` transform: DTCG dimension object → rem string (16px base).
 * - `tailwind/v4-theme` format: resolved tokens → Tailwind v4 `@theme` block.
 *
 * Sources are expanded + merged here and passed to Style Dictionary as inline
 * `tokens`: SD's own glob loader (@bundled-es-modules/glob) does not survive
 * being re-bundled into a standalone .mjs, and this keeps builds portable.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import StyleDictionary from 'style-dictionary';
import { fileHeader, formattedVariables, usesReferences } from 'style-dictionary/utils';
import { dtcgToOklch, formatOklch } from './colors.js';
import type { BuildTokensOptions, DtcgColorValue } from './types.js';

interface SdToken {
  $value?: unknown;
  value?: unknown;
  $type?: string;
  type?: string;
  name: string;
  path: string[];
  original?: { $value?: unknown; value?: unknown };
}

function tokenValue(token: SdToken): unknown {
  return token.$value ?? token.value ?? token.original?.$value ?? token.original?.value;
}

export const oklchTransform = {
  name: 'color/oklch',
  type: 'value' as const,
  transitive: true,
  filter: (token: SdToken) => (token.$type ?? token.type) === 'color',
  transform: (token: SdToken) => {
    const value = tokenValue(token);
    if (typeof value === 'string' && !usesReferences(value)) return formatOklch(dtcgToOklch(value));
    if (value !== null && typeof value === 'object' && 'colorSpace' in value) {
      return formatOklch(dtcgToOklch(value as DtcgColorValue));
    }
    return value;
  },
};

/** rem strings rounded to 4dp (stylelint `number-max-precision` + no float dust). */
function toRem(px: number): string {
  if (px === 0) return '0';
  return `${Number((px / 16).toFixed(4))}rem`;
}

export const dimensionRemTransform = {
  name: 'dimension/rem',
  type: 'value' as const,
  transitive: true,
  filter: (token: SdToken) => (token.$type ?? token.type) === 'dimension',
  transform: (token: SdToken) => {
    const value = tokenValue(token);
    if (value !== null && typeof value === 'object' && 'value' in value && 'unit' in value) {
      const dimension = value as { value: number; unit: string };
      if (dimension.unit === 'rem') return `${dimension.value}rem`;
      return toRem(dimension.value);
    }
    if (typeof value === 'number') return toRem(value);
    return value;
  },
};

/** camelCase path segment → kebab-case (`bgHover` → `bg-hover`), digits untouched. */
function kebab(segment: string): string {
  return segment.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Tailwind v4 `@theme` property name: namespace prefix + kebab-cased path.
 * Redundant head segments are stripped (`fontFamily/sans` → `--font-sans`,
 * `spacing/1` → `--spacing-1`); `fontSize/*` lands in the `--text-*`
 * namespace and `radius/*` in `--radius-*`, matching Tailwind v4.
 */
function themeName(type: string, path: string[]): string {
  const segments = path.map(kebab);
  if (type === 'color') {
    const rest = segments[0] === 'color' ? segments.slice(1) : segments;
    return `--color-${rest.join('-')}`;
  }
  if (type === 'fontFamily') return `--font-${segments.slice(1).join('-')}`;
  if (type === 'fontWeight') return `--font-weight-${segments.slice(1).join('-')}`;
  if (type === 'dimension' && segments[0] === 'font-size') {
    return `--text-${segments.slice(1).join('-')}`;
  }
  if (type === 'dimension' && segments[0] === 'radius') {
    return `--radius-${segments.slice(1).join('-')}`;
  }
  if (type === 'dimension' && segments[0] === 'spacing') {
    return `--spacing-${segments.slice(1).join('-')}`;
  }
  const prefix =
    type === 'fontFamily'
      ? '--font'
      : type === 'fontWeight'
        ? '--font-weight'
        : type === 'color'
          ? '--color'
          : '--spacing';
  return `${prefix}-${segments.join('-')}`;
}

/** Tailwind v4 `@theme` format: every token becomes a namespaced custom property. */
export async function tailwindV4ThemeFormat(args: {
  dictionary: { allTokens: SdToken[] };
  file: { destination?: string };
  options?: Record<string, unknown>;
}): Promise<string> {
  const header = await fileHeader({ file: args.file as never, options: args.options as never });
  const lines = args.dictionary.allTokens.map((token) => {
    const type = token.$type ?? token.type ?? '';
    return `  ${themeName(type, token.path)}: ${String(tokenValue(token))};`;
  });
  return `${header}@theme {\n${lines.join('\n')}\n}\n`;
}

export async function cssVariablesFormat(args: {
  dictionary: { allTokens: SdToken[] };
  file: { destination?: string };
  options?: Record<string, unknown> & { outputReferences?: boolean };
}): Promise<string> {
  const header = await fileHeader({ file: args.file as never, options: args.options as never });
  const variables = formattedVariables({
    format: 'css',
    dictionary: args.dictionary as never,
    outputReferences: args.options?.outputReferences ?? false,
    usesDtcg: true,
  });
  return `${header}:root {\n${variables}\n}\n`;
}

type JsonObject = Record<string, unknown>;

/** Expand one source entry: literal file, or a `**` / `*` glob ending in `.tokens.json`. */
function expandSource(pattern: string): string[] {
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

function deepMerge(target: JsonObject, source: JsonObject): JsonObject {
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

/** Load + deep-merge every source file into one DTCG token tree. */
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

/**
 * Compile DTCG token sources into `tokens.css` (`:root` custom properties)
 * and `theme.css` (Tailwind v4 `@theme`) under `options.outDir`.
 */
export async function buildTokens(options: BuildTokensOptions): Promise<string[]> {
  const buildPath = options.outDir.endsWith('/') ? options.outDir : `${options.outDir}/`;
  const sd = new StyleDictionary({
    tokens: loadTokenSources(options.source) as never,
    hooks: {
      transforms: {
        'color/oklch': oklchTransform as never,
        'dimension/rem': dimensionRemTransform as never,
      },
      transformGroups: {
        'token-engine/css': ['attribute/cti', 'name/kebab', 'color/oklch', 'dimension/rem'],
      },
      formats: {
        'token-engine/css-variables': cssVariablesFormat as never,
        'tailwind/v4-theme': tailwindV4ThemeFormat as never,
      },
    },
    platforms: {
      css: {
        transformGroup: 'token-engine/css',
        buildPath,
        ...(options.prefix === undefined ? {} : { prefix: options.prefix }),
        files: [
          { destination: 'tokens.css', format: 'token-engine/css-variables' },
          { destination: 'theme.css', format: 'tailwind/v4-theme' },
        ],
      },
    },
  });
  await sd.buildAllPlatforms();
  return [`${buildPath}tokens.css`, `${buildPath}theme.css`];
}
