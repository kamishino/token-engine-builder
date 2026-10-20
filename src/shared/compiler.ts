/**
 * Style Dictionary v5 ESM programmatic builder.
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
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import StyleDictionary from 'style-dictionary';
import { fileHeader, formattedVariables, usesReferences } from 'style-dictionary/utils';
import { dtcgToOklch, formatOklch, oklchToHex, parseToOklch } from './colors.js';
import type { BuildTokensOptions, DtcgColorValue } from './types.js';

interface SdToken {
  $value?: unknown;
  value?: unknown;
  $type?: string;
  $description?: string;
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

/** DTCG dimension object → CSS length, preserving its authored unit (shadows stay px). */
function dimensionToCss(value: unknown): string {
  if (value !== null && typeof value === 'object' && 'value' in value && 'unit' in value) {
    const dimension = value as { value: number; unit: string };
    return dimension.value === 0 ? '0' : `${dimension.value}${dimension.unit}`;
  }
  return String(value);
}

export const durationCssTransform = {
  name: 'duration/css',
  type: 'value' as const,
  transitive: true,
  filter: (token: SdToken) => (token.$type ?? token.type) === 'duration',
  transform: (token: SdToken) => dimensionToCss(tokenValue(token)),
};

export const cubicBezierCssTransform = {
  name: 'cubicBezier/css',
  type: 'value' as const,
  transitive: true,
  filter: (token: SdToken) => (token.$type ?? token.type) === 'cubicBezier',
  transform: (token: SdToken) => {
    const value = tokenValue(token);
    return Array.isArray(value) ? `cubic-bezier(${value.join(', ')})` : value;
  },
};

interface ShadowValue {
  color?: DtcgColorValue | string;
  offsetX?: unknown;
  offsetY?: unknown;
  blur?: unknown;
  spread?: unknown;
  inset?: boolean;
}

export const shadowCssTransform = {
  name: 'shadow/css',
  type: 'value' as const,
  transitive: true,
  filter: (token: SdToken) => (token.$type ?? token.type) === 'shadow',
  transform: (token: SdToken) => {
    const compose = (shadow: ShadowValue): string =>
      [
        shadow.inset === true ? 'inset' : '',
        dimensionToCss(shadow.offsetX ?? 0),
        dimensionToCss(shadow.offsetY ?? 0),
        dimensionToCss(shadow.blur ?? 0),
        dimensionToCss(shadow.spread ?? 0),
        shadow.color === undefined ? '' : formatOklch(dtcgToOklch(shadow.color)),
      ]
        .filter((part) => part !== '')
        .join(' ');
    const value = tokenValue(token);
    if (Array.isArray(value)) return value.map((entry) => compose(entry as ShadowValue)).join(', ');
    if (value !== null && typeof value === 'object') return compose(value as ShadowValue);
    return value;
  },
};

/** camelCase path segment → kebab-case (`bgHover` → `bg-hover`), digits untouched. */
function kebab(segment: string): string {
  return segment.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Tailwind v4 `@theme` property name: namespace prefix + kebab-cased path.
 * Redundant head segments are stripped (`font-family/sans` → `--font-sans`,
 * `spacing/1` → `--spacing-1`); `font-size/*` lands in the `--text-*`
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
  if (type === 'number' && segments[0] === 'line-height') {
    return `--leading-${segments.slice(1).join('-')}`;
  }
  if (type === 'dimension' && segments[0] === 'rhythm') {
    return `--rhythm-${segments.slice(1).join('-')}`;
  }
  if (type === 'dimension' && segments[0] === 'breakpoint') {
    return `--breakpoint-${segments.slice(1).join('-')}`;
  }
  if (type === 'dimension' && segments[0] === 'container') {
    return `--container-${segments.slice(1).join('-')}`;
  }
  if (type === 'dimension' && segments[0] === 'grid') {
    return `--grid-${segments.slice(1).join('-')}`;
  }
  if (type === 'dimension' && segments[0] === 'radius') {
    return `--radius-${segments.slice(1).join('-')}`;
  }
  if (type === 'dimension' && segments[0] === 'layout') {
    return `--layout-${segments.slice(1).join('-')}`;
  }
  if (type === 'dimension' && segments[0] === 'spacing') {
    return `--spacing-${segments.slice(1).join('-')}`;
  }
  if (type === 'shadow' && segments[0] === 'shadow') {
    return `--shadow-${segments.slice(1).join('-')}`;
  }
  if (type === 'number' && segments[0] === 'z-index') {
    return `--z-${segments.slice(1).join('-')}`;
  }
  if (type === 'duration' && segments[0] === 'animation') {
    return `--duration-${segments.slice(2).join('-')}`;
  }
  if (type === 'cubicBezier' && segments[0] === 'animation') {
    return `--ease-${segments.slice(2).join('-')}`;
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

/**
 * Component-spec format: per-component Markdown tables of resolved token
 * values (state → token → value), grouped by component in dictionary order.
 */
export async function componentSpecsFormat(args: {
  dictionary: { allTokens: SdToken[] };
  file: { destination?: string };
  options?: Record<string, unknown> & { label?: string };
}): Promise<string> {
  const header = await fileHeader({ file: args.file as never, options: args.options as never });
  const components = new Map<string, SdToken[]>();
  for (const token of args.dictionary.allTokens) {
    if (token.path[0] !== 'component') continue;
    const name = token.path[1] as string;
    const list = components.get(name) ?? [];
    list.push(token);
    components.set(name, list);
  }
  const sections: string[] = [
    `${header}# Component specifications\n\nTheme: ${args.options?.label ?? 'tokens'}\n`,
  ];
  for (const [name, tokens] of components) {
    const rows = tokens.map(
      (token) => `| ${token.path.slice(2).join('-')} | ${String(tokenValue(token))} |`,
    );
    sections.push(`## ${name}\n\n| Token | Value |\n|---|---|\n${rows.join('\n')}\n`);
  }
  sections.push(
    '## States\n\n' +
      'Button carries enabled, hover, focus, and disabled states; input carries enabled, focus, error, and disabled; card carries enabled and hover. ' +
      'Hover, focus, and error state pairs are contrast-gated by token-audit; disabled states are tokenized here but WCAG-exempt from the audit gate.\n',
  );
  return sections.join('\n');
}

/**
 * DESIGN.md format (Google Stitch): frontmatter rendered from the resolved
 * dictionary + spec guide data, then the 8 normative sections in Stitch
 * order. A derived view — token files remain the source of truth.
 */
export async function designMdFormat(args: {
  dictionary: { allTokens: SdToken[] };
  file: { destination?: string };
  options?: Record<string, unknown> & {
    label?: string;
    guide?: BuildTokensOptions['guide'];
  };
}): Promise<string> {
  const header = await fileHeader({ file: args.file as never, options: args.options as never });
  const guide = args.options?.guide;
  const label = args.options?.label ?? 'tokens';
  const name = guide?.name ?? label;
  const values = new Map<string, string>();
  for (const token of args.dictionary.allTokens) {
    values.set(token.path.join('.'), String(tokenValue(token)));
  }
  const get = (path: string): string => values.get(path) ?? '';
  const hexOf = (value: string): string => {
    try {
      return oklchToHex(parseToOklch(value));
    } catch {
      return value;
    }
  };
  const primaryHex = guide?.primaryHex ?? hexOf(get('semantic.color.action.primary'));
  const secondaryHex = guide?.secondaryHex ?? hexOf(get('semantic.color.bg.raised'));
  const overview =
    guide?.overview ??
    `Design system "${name}" (theme: ${label}), generated by token-engine-builder from the audited token tree. Token files are the source of truth; this document is a derived view.`;
  const description = (overview.split(/(?<=\.)\s/)[0] ?? overview).trim();
  const componentNames = [
    ...new Set(
      args.dictionary.allTokens
        .filter((token) => token.path[0] === 'component')
        .map((token) => token.path[1] as string),
    ),
  ];
  const lines = (prefix: string): string[] =>
    [...values.entries()]
      .filter(([path]) => path.startsWith(prefix))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, value]) => `- \`${path}\`: \`${value}\``);
  const typeRows = [...values.entries()]
    .filter(([path]) => path.startsWith('font-size.'))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, value]) => {
      const step = path.slice('font-size.'.length);
      return `| ${step} | ${value} | ${get(`line-height.${step}`)} |`;
    });
  const dos = guide?.dos ?? [
    'Bind semantic and layout roles in components, not primitive steps.',
    'Run token-audit before token-build; ship only on a passing gate.',
  ];
  const donts = guide?.donts ?? [
    'Do not hand-edit generated files (tokens, CSS, this document) — they are provenance-manifest guarded.',
    'Do not introduce raw hex or pixel literals above the primitive tier.',
  ];
  const frontmatter = [
    '---',
    'version: "1"',
    `name: "${name}"`,
    `description: "${description.replaceAll('"', "'")}"`,
    'colors:',
    `  primary: "${primaryHex}"`,
    `  secondary: "${secondaryHex}"`,
    'typography:',
    `  fontSans: "${get('font-family.sans')}"`,
    ...(guide?.scale === undefined ? [] : [`  scale: "${guide.scale}"`]),
    'rounded:',
    `  sm: "${get('radius.sm')}"`,
    `  md: "${get('radius.md')}"`,
    `  lg: "${get('radius.lg')}"`,
    'spacing:',
    `  base: "${get('spacing.1')}"`,
    ...(guide?.density === undefined ? [] : [`  density: "${guide.density}"`]),
    `components: [${componentNames.map((n) => `"${n}"`).join(', ')}]`,
    '---',
  ].join('\n');
  const sections = [
    `${header}${frontmatter}\n\n# ${name} Design Contract\n`,
    `## Overview\n\n${overview}\n`,
    `## Colors\n\n${lines('semantic.color.').join('\n')}\n`,
    `## Typography\n\nFont stack: \`${get('font-family.sans')}\`\n\n| Step | Size | Line height |\n|---|---|---|\n${typeRows.join('\n')}\n`,
    `## Layout\n\n${[...lines('layout.'), ...lines('breakpoint.'), ...lines('container.'), ...lines('grid.')].join('\n')}\n`,
    `## Elevation & Depth\n\n${lines('shadow.').join('\n')}\n`,
    `## Shapes\n\n${lines('radius.').join('\n')}\n`,
    `## Components\n\n${componentNames.map((n) => `- ${n}`).join('\n')}\n\nSee \`components.md\` for per-component state tables (state → token → resolved value).\n`,
    `## Do's and Don'ts\n\n${dos.map((d) => `- Do: ${d}`).join('\n')}\n${donts.map((d) => `- Don't: ${d}`).join('\n')}\n`,
  ];
  return sections.join('\n');
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
/** Shared Style Dictionary hooks (transforms + formats) for every output. */
function engineHooks() {
  return {
    transforms: {
      'color/oklch': oklchTransform as never,
      'dimension/rem': dimensionRemTransform as never,
      'duration/css': durationCssTransform as never,
      'cubicBezier/css': cubicBezierCssTransform as never,
      'shadow/css': shadowCssTransform as never,
    },
    transformGroups: {
      'token-engine/css': [
        'attribute/cti',
        'name/kebab',
        'color/oklch',
        'dimension/rem',
        'duration/css',
        'cubicBezier/css',
        'shadow/css',
      ],
    },
    formats: {
      'token-engine/css-variables': cssVariablesFormat as never,
      'tailwind/v4-theme': tailwindV4ThemeFormat as never,
      'token-engine/component-specs': componentSpecsFormat as never,
      'design-md/stitch': designMdFormat as never,
    },
  };
}

export async function buildTokens(options: BuildTokensOptions): Promise<string[]> {
  const buildPath = options.outDir.endsWith('/') ? options.outDir : `${options.outDir}/`;
  const sd = new StyleDictionary({
    tokens: loadTokenSources(options.source) as never,
    hooks: engineHooks(),
    platforms: {
      css: {
        transformGroup: 'token-engine/css',
        buildPath,
        ...(options.prefix === undefined ? {} : { prefix: options.prefix }),
        files: [
          { destination: 'tokens.css', format: 'token-engine/css-variables' },
          { destination: 'theme.css', format: 'tailwind/v4-theme' },
          {
            destination: 'components.md',
            format: 'token-engine/component-specs',
            options: { label: options.label ?? 'tokens' },
          },
          {
            destination: 'DESIGN.md',
            format: 'design-md/stitch',
            options: { label: options.label ?? 'tokens', guide: options.guide },
          },
        ],
      },
    },
  });
  await sd.buildAllPlatforms();
  return [
    `${buildPath}tokens.css`,
    `${buildPath}theme.css`,
    `${buildPath}components.md`,
    `${buildPath}DESIGN.md`,
  ];
}

/** Load one theme's resolved tokens (UI profiles): raw tokens + path → value map. */
export async function loadThemeTokens(
  tokensDir: string,
  theme: string,
): Promise<{ tokens: SdToken[]; values: Map<string, string> }> {
  const base = tokensDir.replaceAll('\\', '/');
  const merged = loadTokenSources([
    `${base}/primitive/**/*.tokens.json`,
    `${base}/semantic/${theme}.tokens.json`,
    `${base}/component/**/*.tokens.json`,
  ]);
  const sd = new StyleDictionary({
    tokens: merged as never,
    hooks: engineHooks(),
    platforms: {
      css: {
        transformGroup: 'token-engine/css',
        buildPath: '',
        files: [{ destination: 'tokens.css', format: 'token-engine/css-variables' }],
      },
    },
  });
  const dictionary = (await sd.getPlatformTokens('css')) as unknown as { allTokens: SdToken[] };
  const values = new Map<string, string>();
  for (const token of dictionary.allTokens) {
    values.set(token.path.join('.'), String(tokenValue(token)));
  }
  return { tokens: dictionary.allTokens, values };
}

/** Load one theme's resolved token dictionary as path → value (UI profiles). */
export async function loadThemeDictionary(
  tokensDir: string,
  theme: string,
): Promise<Map<string, string>> {
  return (await loadThemeTokens(tokensDir, theme)).values;
}

export type UiProfileId =
  'shadcn' | 'bootstrap' | 'primevue' | 'antd' | 'mui' | 'chakra' | 'radix' | 'fluent';

export const UI_PROFILE_IDS: readonly UiProfileId[] = [
  'shadcn',
  'bootstrap',
  'primevue',
  'antd',
  'mui',
  'chakra',
  'radix',
  'fluent',
];

/** Output filename per profile (JSON themes are not CSS). */
export function profileFileName(profile: UiProfileId): string {
  if (profile === 'antd') return 'antd-theme.json';
  if (profile === 'mui') return 'mui-theme.json';
  if (profile === 'chakra') return 'chakra-theme.json';
  if (profile === 'radix') return 'radix-theme.css';
  if (profile === 'fluent') return 'fluent-theme.json';
  return `${profile}.css`;
}

interface ProfileMapping {
  variable: string;
  source: string;
  lightOnly?: boolean;
}

const PROFILE_MAPPINGS: Record<
  Exclude<UiProfileId, 'antd' | 'mui' | 'chakra' | 'radix' | 'fluent'>,
  { darkSelector: string; mapping: ProfileMapping[] }
> = {
  shadcn: {
    darkSelector: '.dark',
    mapping: [
      { variable: '--background', source: 'semantic.color.bg.canvas' },
      { variable: '--foreground', source: 'semantic.color.text.primary' },
      { variable: '--card', source: 'semantic.color.bg.surface' },
      { variable: '--card-foreground', source: 'semantic.color.text.primary' },
      { variable: '--popover', source: 'semantic.color.bg.raised' },
      { variable: '--popover-foreground', source: 'semantic.color.text.primary' },
      { variable: '--primary', source: 'semantic.color.action.primary' },
      { variable: '--primary-foreground', source: 'semantic.color.action.primary-text' },
      { variable: '--secondary', source: 'semantic.color.bg.subtle' },
      { variable: '--secondary-foreground', source: 'semantic.color.text.primary' },
      { variable: '--muted', source: 'semantic.color.bg.subtle' },
      { variable: '--muted-foreground', source: 'semantic.color.text.secondary' },
      { variable: '--accent', source: 'semantic.color.bg.raised' },
      { variable: '--accent-foreground', source: 'semantic.color.text.primary' },
      { variable: '--destructive', source: 'semantic.color.feedback.danger.text' },
      { variable: '--destructive-foreground', source: 'semantic.color.feedback.danger.bg' },
      { variable: '--border', source: 'semantic.color.border.default' },
      { variable: '--input', source: 'semantic.color.border.strong' },
      { variable: '--ring', source: 'semantic.color.border.focus' },
      { variable: '--radius', source: 'radius.md', lightOnly: true },
    ],
  },
  bootstrap: {
    darkSelector: '[data-bs-theme="dark"]',
    mapping: [
      { variable: '--bs-body-bg', source: 'semantic.color.bg.canvas' },
      { variable: '--bs-body-color', source: 'semantic.color.text.primary' },
      { variable: '--bs-primary', source: 'semantic.color.action.primary' },
      { variable: '--bs-secondary-color', source: 'semantic.color.text.secondary' },
      { variable: '--bs-tertiary-bg', source: 'semantic.color.bg.subtle' },
      { variable: '--bs-border-color', source: 'semantic.color.border.default' },
      { variable: '--bs-link-color', source: 'semantic.color.text.link' },
      { variable: '--bs-border-radius', source: 'radius.md', lightOnly: true },
    ],
  },
  primevue: {
    darkSelector: '.p-dark',
    mapping: [
      { variable: '--p-primary-color', source: 'semantic.color.action.primary' },
      { variable: '--p-primary-contrast-color', source: 'semantic.color.action.primary-text' },
      { variable: '--p-surface-ground', source: 'semantic.color.bg.canvas' },
      { variable: '--p-surface-section', source: 'semantic.color.bg.subtle' },
      { variable: '--p-surface-card', source: 'semantic.color.bg.surface' },
      { variable: '--p-surface-overlay', source: 'semantic.color.bg.raised' },
      { variable: '--p-surface-border', source: 'semantic.color.border.default' },
      { variable: '--p-text-color', source: 'semantic.color.text.primary' },
      { variable: '--p-text-muted-color', source: 'semantic.color.text.secondary' },
      { variable: '--p-highlight-background', source: 'semantic.color.bg.raised' },
      { variable: '--p-border-radius', source: 'radius.md', lightOnly: true },
    ],
  },
};

/**
 * Build a UI-library profile: one CSS file mapping semantic roles to the
 * library's variables for light + dark themes. Fails closed listing any
 * missing mapping target — never emits a partial variable set.
 */
export async function buildUiProfile(
  profile: UiProfileId,
  tokensDir: string,
  outDir: string,
): Promise<string[]> {
  const light = await loadThemeDictionary(tokensDir, 'light');
  const dark = await loadThemeDictionary(tokensDir, 'dark');
  const buildPath = outDir.endsWith('/') ? outDir : `${outDir}/`;
  mkdirSync(buildPath, { recursive: true });
  const destination = `${buildPath}${profileFileName(profile)}`;

  if (profile === 'radix' || profile === 'fluent') {
    const required = [
      'semantic.color.action.primary',
      'semantic.color.action.primary-text',
      'semantic.color.text.primary',
      'semantic.color.text.secondary',
      'semantic.color.bg.canvas',
      'semantic.color.bg.surface',
      'semantic.color.border.default',
      'semantic.color.border.strong',
      'semantic.color.border.focus',
      'radius.md',
    ];
    for (const source of required) {
      if (!light.has(source) || !dark.has(source)) {
        throw new Error(`profile ${profile}: missing token role ${source}`);
      }
    }
    const hex = (values: Map<string, string>, path: string): string =>
      oklchToHex(parseToOklch(values.get(path) as string));

    if (profile === 'fluent') {
      const fluentTokens = (values: Map<string, string>): Record<string, string | number> => ({
        colorBrandBackground: hex(values, 'semantic.color.action.primary'),
        colorBrandForeground1: hex(values, 'semantic.color.action.primary-text'),
        colorNeutralBackground1: hex(values, 'semantic.color.bg.surface'),
        colorNeutralBackground2: hex(values, 'semantic.color.bg.canvas'),
        colorNeutralForeground1: hex(values, 'semantic.color.text.primary'),
        colorNeutralForeground2: hex(values, 'semantic.color.text.secondary'),
        colorNeutralStroke1: hex(values, 'semantic.color.border.default'),
        colorNeutralStrokeAccessible: hex(values, 'semantic.color.border.strong'),
        colorBrandStroke1: hex(values, 'semantic.color.border.focus'),
        borderRadiusMedium: Math.round(Number.parseFloat(values.get('radius.md') as string) * 16),
      });
      const content = `${JSON.stringify({ light: fluentTokens(light), dark: fluentTokens(dark) }, null, 2)}\n`;
      writeFileSync(destination, content, 'utf8');
      return [destination];
    }

    // Radix: interpolate our ramp onto the 12 Radix steps by lightness position.
    const { tokens } = await loadThemeTokens(tokensDir, 'light');
    const rampPoints = (slug: string): Array<{ l: number; c: number; h: number }> => {
      const points = tokens
        .filter((token) => token.path[0] === 'color' && token.path[1] === slug)
        .map((token) => {
          const parsed = parseToOklch(String(tokenValue(token)));
          return { l: parsed.l, c: parsed.c, h: parsed.h };
        })
        .sort((a, b) => b.l - a.l);
      if (points.length < 2) throw new Error(`profile radix: ramp not found for ${slug}`);
      return points;
    };
    const primaryToken = tokens.find(
      (token) => (token.$description ?? '').startsWith('primary —') && token.path[2] === '500',
    );
    if (primaryToken === undefined) throw new Error('profile radix: primary ramp not found');
    const primarySlug = primaryToken.path[1] as string;
    const POSITIONS = [0, 0.06, 0.14, 0.23, 0.32, 0.42, 0.52, 0.63, 0.74, 0.84, 0.92, 1];
    const interpolate = (points: Array<{ l: number; c: number; h: number }>): string[] => {
      const lMax = points[0]?.l as number;
      const lMin = points[points.length - 1]?.l as number;
      return POSITIONS.map((t) => {
        const targetL = lMax - t * (lMax - lMin);
        let i = 0;
        while (i < points.length - 2 && (points[i + 1]?.l as number) > targetL) i++;
        const a = points[i] as { l: number; c: number; h: number };
        const b = points[i + 1] as { l: number; c: number; h: number };
        const span = a.l - b.l;
        const f = span === 0 ? 0 : (a.l - targetL) / span;
        const round4 = (v: number): number => Math.round(v * 10000) / 10000;
        return formatOklch({
          l: round4(a.l + (b.l - a.l) * f),
          c: round4(a.c + (b.c - a.c) * f),
          h: round4(a.h + (b.h - a.h) * f),
        });
      });
    };
    const accent = interpolate(rampPoints(primarySlug));
    const gray = interpolate(rampPoints('neutral'));
    const block = (selector: string): string =>
      `${selector} {\n` +
      accent.map((value, i) => `  --accent-${i + 1}: ${value};`).join('\n') +
      `\n  --accent-contrast: ${light.get('semantic.color.action.primary-text') as string};\n` +
      gray.map((value, i) => `  --gray-${i + 1}: ${value};`).join('\n') +
      '\n}\n';
    const content =
      `/**\n * Do not edit directly, this file was auto-generated.\n */\n\n` +
      block(':root') +
      `\n${block('.dark')}`;
    writeFileSync(destination, content, 'utf8');
    return [destination];
  }

  if (profile === 'mui' || profile === 'chakra') {
    const required = [
      'semantic.color.action.primary',
      'semantic.color.action.primary-text',
      'semantic.color.action.primary-hover',
      'semantic.color.feedback.success.text',
      'semantic.color.feedback.warning.text',
      'semantic.color.feedback.danger.text',
      'semantic.color.feedback.info.text',
      'semantic.color.text.primary',
      'semantic.color.text.secondary',
      'semantic.color.text.disabled',
      'semantic.color.bg.canvas',
      'semantic.color.bg.surface',
      'semantic.color.bg.raised',
      'semantic.color.bg.subtle',
      'semantic.color.border.default',
      'semantic.color.border.subtle',
      'semantic.color.border.focus',
      'radius.md',
      'font-family.sans',
      'font-size.base',
    ];
    for (const source of required) {
      if (!light.has(source) || !dark.has(source)) {
        throw new Error(`profile ${profile}: missing token role ${source}`);
      }
    }
    const hex = (values: Map<string, string>, path: string): string =>
      oklchToHex(parseToOklch(values.get(path) as string));
    const remToPx = (values: Map<string, string>, path: string): number =>
      Math.round(Number.parseFloat(values.get(path) as string) * 16);

    if (profile === 'mui') {
      const muiTheme = async (theme: string): Promise<Record<string, unknown>> => {
        const { tokens, values } = await loadThemeTokens(tokensDir, theme);
        const secondary = tokens.find(
          (token) =>
            (token.$description ?? '').startsWith('secondary —') && token.path[2] === '500',
        );
        return {
          palette: {
            mode: theme,
            primary: {
              main: hex(values, 'semantic.color.action.primary'),
              contrastText: hex(values, 'semantic.color.action.primary-text'),
            },
            secondary: {
              main:
                secondary === undefined
                  ? hex(values, 'semantic.color.action.primary-hover')
                  : oklchToHex(parseToOklch(String(tokenValue(secondary)))),
            },
            error: { main: hex(values, 'semantic.color.feedback.danger.text') },
            warning: { main: hex(values, 'semantic.color.feedback.warning.text') },
            success: { main: hex(values, 'semantic.color.feedback.success.text') },
            info: { main: hex(values, 'semantic.color.feedback.info.text') },
            text: {
              primary: hex(values, 'semantic.color.text.primary'),
              secondary: hex(values, 'semantic.color.text.secondary'),
              disabled: hex(values, 'semantic.color.text.disabled'),
            },
            background: {
              default: hex(values, 'semantic.color.bg.canvas'),
              paper: hex(values, 'semantic.color.bg.surface'),
            },
            divider: hex(values, 'semantic.color.border.default'),
          },
          typography: {
            fontFamily: values.get('font-family.sans') as string,
            fontSize: remToPx(values, 'font-size.base'),
          },
          shape: { borderRadius: remToPx(values, 'radius.md') },
        };
      };
      const content = `${JSON.stringify({ light: await muiTheme('light'), dark: await muiTheme('dark') }, null, 2)}\n`;
      writeFileSync(destination, content, 'utf8');
      return [destination];
    }

    // Chakra v3: one semantic-token object; each color pairs _light/_dark values.
    const pair = (path: string): { value: { _light: string; _dark: string } } => ({
      value: { _light: light.get(path) as string, _dark: dark.get(path) as string },
    });
    const chakra = {
      semanticTokens: {
        colors: {
          bg: pair('semantic.color.bg.canvas'),
          'bg.subtle': pair('semantic.color.bg.subtle'),
          'bg.panel': pair('semantic.color.bg.surface'),
          'bg.raised': pair('semantic.color.bg.raised'),
          fg: pair('semantic.color.text.primary'),
          'fg.muted': pair('semantic.color.text.secondary'),
          'fg.disabled': pair('semantic.color.text.disabled'),
          border: pair('semantic.color.border.default'),
          'border.subtle': pair('semantic.color.border.subtle'),
          'border.focus': pair('semantic.color.border.focus'),
          solid: pair('semantic.color.action.primary'),
          'solid.fg': pair('semantic.color.action.primary-text'),
          focusRing: pair('semantic.color.border.focus'),
        },
      },
    };
    writeFileSync(destination, `${JSON.stringify(chakra, null, 2)}\n`, 'utf8');
    return [destination];
  }

  if (profile === 'antd') {
    const sources = [
      'semantic.color.action.primary',
      'semantic.color.feedback.success.text',
      'semantic.color.feedback.warning.text',
      'semantic.color.feedback.danger.text',
      'semantic.color.feedback.info.text',
      'semantic.color.text.primary',
      'semantic.color.text.secondary',
      'semantic.color.bg.canvas',
      'semantic.color.bg.surface',
      'semantic.color.bg.raised',
      'semantic.color.border.default',
      'semantic.color.border.subtle',
      'semantic.color.text.link',
      'radius.md',
      'font-family.sans',
      'font-size.base',
    ];
    for (const source of sources) {
      if (!light.has(source) || !dark.has(source)) {
        throw new Error(`profile antd: missing token role ${source}`);
      }
    }
    const hex = (values: Map<string, string>, path: string): string =>
      oklchToHex(parseToOklch(values.get(path) as string));
    const remToPx = (values: Map<string, string>, path: string): number =>
      Math.round(Number.parseFloat(values.get(path) as string) * 16);
    const antdTokens = (values: Map<string, string>): Record<string, string | number> => ({
      colorPrimary: hex(values, 'semantic.color.action.primary'),
      colorSuccess: hex(values, 'semantic.color.feedback.success.text'),
      colorWarning: hex(values, 'semantic.color.feedback.warning.text'),
      colorError: hex(values, 'semantic.color.feedback.danger.text'),
      colorInfo: hex(values, 'semantic.color.feedback.info.text'),
      colorText: hex(values, 'semantic.color.text.primary'),
      colorTextSecondary: hex(values, 'semantic.color.text.secondary'),
      colorBgLayout: hex(values, 'semantic.color.bg.canvas'),
      colorBgContainer: hex(values, 'semantic.color.bg.surface'),
      colorBgElevated: hex(values, 'semantic.color.bg.raised'),
      colorBorder: hex(values, 'semantic.color.border.default'),
      colorBorderSecondary: hex(values, 'semantic.color.border.subtle'),
      colorLink: hex(values, 'semantic.color.text.link'),
      borderRadius: remToPx(values, 'radius.md'),
      fontFamily: values.get('font-family.sans') as string,
      fontSize: remToPx(values, 'font-size.base'),
    });
    const content = `${JSON.stringify({ light: { token: antdTokens(light) }, dark: { token: antdTokens(dark) } }, null, 2)}\n`;
    writeFileSync(destination, content, 'utf8');
    return [destination];
  }

  const { darkSelector, mapping } = PROFILE_MAPPINGS[profile];
  for (const entry of mapping) {
    if (!light.has(entry.source) || (!entry.lightOnly && !dark.has(entry.source))) {
      throw new Error(`profile ${profile}: missing token role ${entry.source}`);
    }
  }
  const renderBlock = (values: Map<string, string>, includeLightOnly: boolean): string =>
    mapping
      .filter((entry) => includeLightOnly || !entry.lightOnly)
      .map((entry) => `  ${entry.variable}: ${values.get(entry.source) as string};`)
      .join('\n');
  const content =
    `/**\n * Do not edit directly, this file was auto-generated.\n */\n\n` +
    `:root {\n${renderBlock(light, true)}\n}\n\n${darkSelector} {\n${renderBlock(dark, false)}\n}\n`;
  writeFileSync(destination, content, 'utf8');
  return [destination];
}
