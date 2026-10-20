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
import StyleDictionary from 'style-dictionary';
import { fileHeader, formattedVariables, usesReferences } from 'style-dictionary/utils';
import { dtcgToOklch, formatOklch, oklchToHex, parseToOklch } from './colors.js';
import { deepMerge, expandSource, loadTokenSources } from './tokens.js';
import type { BuildTokensOptions, DtcgColorValue } from './types.js';

export { expandSource, deepMerge, loadTokenSources };
export interface ResolvedToken {
  $value?: unknown;
  value?: unknown;
  $type?: string;
  $description?: string;
  type?: string;
  name: string;
  path: string[];
  original?: { $value?: unknown; value?: unknown };
}
type SdToken = ResolvedToken;

export interface ResolvedThemeTokens {
  tokens: ResolvedToken[];
  values: Map<string, string>;
}

export function tokenValue(token: ResolvedToken): unknown {
  return token.$value ?? token.value ?? token.original?.$value ?? token.original?.value;
}
const oklchTransform = {
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

const dimensionRemTransform = {
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

const durationCssTransform = {
  name: 'duration/css',
  type: 'value' as const,
  transitive: true,
  filter: (token: SdToken) => (token.$type ?? token.type) === 'duration',
  transform: (token: SdToken) => dimensionToCss(tokenValue(token)),
};

const cubicBezierCssTransform = {
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

const shadowCssTransform = {
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
async function tailwindV4ThemeFormat(args: {
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
async function componentSpecsFormat(args: {
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
      'Button carries enabled, hover, focus, and disabled states; input carries enabled, focus, error, and disabled; card carries enabled and hover; ' +
      'table carries row-hover; badge, alert, dialog, avatar, and tooltip define surface, border, and typography tokens across light and dark themes. ' +
      'All foreground, background, and meaningful boundary pairs are contrast-gated by token-audit; disabled states are tokenized here but WCAG-exempt from the audit gate.\n',
  );
  sections.push(
    '## Composite patterns\n\n' +
      'Standard multi-component compositions binding components, layout, and semantic tokens:\n\n' +
      '### Form Field\n\n' +
      'Composition: Label (`typography.fontFamily`, `fontSize: 0.875rem`, `color: text.primary`) + Input (`component.input.*`) + Hint/Error text (`fontSize: 0.75rem`, `color: text.secondary` or `feedback.danger.text`). ' +
      'Layout: Vertical stack, `gap: layout.gap.xs` (0.25rem) between label and input, `gap: layout.gap.xs` before helper/error text.\n\n' +
      '### Card Section\n\n' +
      'Composition: Card Surface (`component.card.bg`, `radius.lg`, `border: border.default`) + Header (Title `fontSize: 1.25rem` + Subtitle `text.secondary`) + Body (`layout.gap.default`) + Footer actions (`component.button.*` primary/secondary). ' +
      'Layout: Inset padding `layout.inset.lg` (1.5rem), vertical stack `layout.gap.md` (1rem), action row `justify: flex-end`, `gap: layout.gap.sm` (0.5rem).\n\n' +
      '### Modal Shell\n\n' +
      'Composition: Backdrop Overlay (`bg.canvas` at 60% opacity) + Dialog Panel (`bg.raised`, `radius.lg`, `shadow.xl`) + Header (Title `fontSize: 1.5rem` + Close icon button) + Content area + Action footer (`button.bg` primary + secondary). ' +
      'Layout: Centered container `container.sm` (40rem max-width), panel padding `layout.inset.xl` (2rem), content gap `layout.gap.md` (1rem), sticky footer `layout.gap.sm` (0.5rem).\n',
  );
  return sections.join('\n');
}

/**
 * DESIGN.md format (Google Stitch): frontmatter rendered from the resolved
 * dictionary + spec guide data, then the 8 normative sections in Stitch
 * order. A derived view — token files remain the source of truth.
 */
async function designMdFormat(args: {
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
    `## Components\n\n${componentNames.map((n) => `- ${n}`).join('\n')}\n\nComposite patterns:\n- Form Field: Input + Label + Hint/Error\n- Card Section: Surface + Header + Body + Actions\n- Modal Shell: Overlay + Dialog Panel + Header + Actions\n\nSee \`components.md\` for per-component state tables and composite pattern specs.\n`,
    `## Do's and Don'ts\n\n${dos.map((d) => `- Do: ${d}`).join('\n')}\n${donts.map((d) => `- Don't: ${d}`).join('\n')}\n`,
  ];
  return sections.join('\n');
}

/**
 * Interactive visualizer format (HTML inspection surface):
 * Zero-dep single-file HTML previewing color ramps, typography, components,
 * and WCAG contrast chips under the reader's theme.
 */
async function visualizerHtmlFormat(args: {
  dictionary: { allTokens: SdToken[] };
  file: { destination?: string };
  options?: Record<string, unknown> & { label?: string; guide?: BuildTokensOptions['guide'] };
}): Promise<string> {
  const label = args.options?.label ?? 'tokens';
  const name = args.options?.guide?.name ?? 'Design System';
  const values = new Map<string, string>();
  for (const token of args.dictionary.allTokens) {
    values.set(token.path.join('.'), String(tokenValue(token)));
  }
  const get = (path: string): string => values.get(path) ?? '';

  // Group color ramps
  const colorTokens = args.dictionary.allTokens.filter(
    (t) => t.path[0] === 'color' && t.path.length >= 3,
  );
  const ramps = new Map<string, Array<{ step: string; value: string }>>();
  for (const t of colorTokens) {
    const group = t.path[1] as string;
    const step = t.path[2] as string;
    const list = ramps.get(group) ?? [];
    list.push({ step, value: String(tokenValue(t)) });
    ramps.set(group, list);
  }

  const rampHtml = Array.from(ramps.entries())
    .map(([group, steps]) => {
      const chips = steps
        .map(
          (s) =>
            `<div style="flex:1;min-width:60px;height:70px;background:${s.value};display:flex;flex-direction:column;justify-content:flex-end;padding:6px;font-size:10px;color:${Number(s.step) >= 600 ? '#fff' : '#000'};border-radius:4px;"><span>${s.step}</span></div>`,
        )
        .join('');
      return `<div style="margin-bottom:1.5rem;"><h3 style="font-size:1rem;margin-bottom:0.5rem;text-transform:capitalize;">${group}</h3><div style="display:flex;gap:4px;flex-wrap:wrap;">${chips}</div></div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — Visualizer (${label})</title>
  <style>
    :root {
      --bg: ${get('semantic.color.bg.canvas') || '#ffffff'};
      --surface: ${get('semantic.color.bg.surface') || '#f8f9fa'};
      --text: ${get('semantic.color.text.primary') || '#111827'};
      --text-muted: ${get('semantic.color.text.secondary') || '#6b7280'};
      --primary: ${get('semantic.color.action.primary') || '#2563eb'};
      --primary-text: ${get('semantic.color.action.primary-text') || '#ffffff'};
      --border: ${get('semantic.color.border.default') || '#e5e7eb'};
      --radius: ${get('radius.md') || '8px'};
      --font: ${get('font-family.sans') || 'system-ui, sans-serif'};
    }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      margin: 0;
      padding: 2rem;
      line-height: 1.5;
    }
    .container { max-width: 960px; margin: 0 auto; }
    h1 { font-size: 1.875rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.25rem; margin-top: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    .specimen-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.5rem;
      margin-top: 1rem;
    }
    .btn {
      background: var(--primary);
      color: var(--primary-text);
      border: none;
      border-radius: var(--radius);
      padding: 0.5rem 1rem;
      font-weight: 500;
      cursor: pointer;
      display: inline-block;
    }
    .btn:hover { opacity: 0.9; }
    .input-field {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.5rem 0.75rem;
      color: var(--text);
      width: 100%;
      max-width: 320px;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${name} Visualizer</h1>
    <p style="color:var(--text-muted);margin-top:0;">Theme: <strong>${label}</strong> — generated by token-engine-builder for visual inspection</p>

    <h2>1. Color Ramps</h2>
    ${rampHtml}

    <h2>2. Component Specimens</h2>
    <div class="specimen-card">
      <h3 style="margin-top:0;">Card Specimen</h3>
      <p style="color:var(--text-muted);">This card tests surface background, borders, radius, and typography bindings.</p>
      <div style="display:flex;gap:1rem;align-items:center;margin-top:1rem;">
        <button class="btn">Action Button</button>
        <input type="text" class="input-field" placeholder="Input specimen..." value="Sample text" />
      </div>
      <div style="display:flex;gap:0.75rem;align-items:center;margin-top:1rem;flex-wrap:wrap;">
        <span style="background:${get('semantic.color.bg.raised')};border:1px solid ${get('semantic.color.border.default')};color:${get('semantic.color.text.primary')};padding:0.25rem 0.5rem;border-radius:9999px;font-size:0.75rem;font-weight:600;">Status Badge</span>
        <div style="background:${get('semantic.color.bg.subtle')};border:1px solid ${get('semantic.color.border.default')};color:${get('semantic.color.text.secondary')};width:32px;height:32px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:0.875rem;font-weight:600;">JD</div>
        <div style="background:${get('semantic.color.text.primary')};color:${get('semantic.color.bg.canvas')};padding:0.25rem 0.5rem;border-radius:${get('radius.sm')};font-size:0.75rem;">Tooltip helper</div>
      </div>
      <div style="background:${get('semantic.color.bg.subtle')};border-left:4px solid ${get('semantic.color.action.primary')};padding:0.75rem 1rem;border-radius:${get('radius.md')};margin-top:1rem;font-size:0.875rem;color:${get('semantic.color.text.primary')};">
        <strong>Alert Banner:</strong> System tokens active and certified.
      </div>
      <table style="width:100%;margin-top:1rem;border-collapse:collapse;font-size:0.875rem;">
        <thead>
          <tr style="background:${get('semantic.color.bg.surface')};color:${get('semantic.color.text.secondary')};border-bottom:1px solid ${get('semantic.color.border.default')};">
            <th style="padding:0.5rem;text-align:left;">Role</th>
            <th style="padding:0.5rem;text-align:left;">Token</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid ${get('semantic.color.border.default')};">
            <td style="padding:0.5rem;">Surface</td>
            <td style="padding:0.5rem;font-family:monospace;">${get('semantic.color.bg.surface')}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
`;
}
async function cssVariablesFormat(args: {
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
      'token-engine/visualizer': visualizerHtmlFormat as never,
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
          ...(options.visualizer
            ? [
                {
                  destination: 'visualizer.html',
                  format: 'token-engine/visualizer',
                  options: { label: options.label ?? 'tokens', guide: options.guide },
                },
              ]
            : []),
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
    ...(options.visualizer ? [`${buildPath}visualizer.html`] : []),
  ];
}

/** Load one theme's resolved tokens (UI profiles): raw tokens + path → value map. */
export async function loadThemeTokens(
  tokensDir: string,
  theme: string,
): Promise<ResolvedThemeTokens> {
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
