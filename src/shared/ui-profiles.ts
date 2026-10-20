import { mkdirSync, writeFileSync } from 'node:fs';
import { formatOklch, oklchToHex, parseToOklch } from './colors.js';
import { loadThemeTokens } from './compiler.js';

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

function tokenValue(token: {
  $value?: unknown;
  value?: unknown;
  original?: { $value?: unknown; value?: unknown };
}): unknown {
  return token.$value ?? token.value ?? token.original?.$value ?? token.original?.value;
}

/**
 * Build a UI-library profile: one CSS or JSON file mapping semantic roles to the
 * library's variables for light + dark themes. Fails closed listing any
 * missing mapping target — never emits a partial variable set.
 */
export async function buildUiProfile(
  profile: UiProfileId,
  tokensDir: string,
  outDir: string,
): Promise<string[]> {
  const lightData = await loadThemeTokens(tokensDir, 'light');
  const darkData = await loadThemeTokens(tokensDir, 'dark');
  const light = lightData.values;
  const dark = darkData.values;
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

    if (profile === 'fluent') {
      const hex = (values: Map<string, string>, path: string): string =>
        oklchToHex(parseToOklch(values.get(path) as string));
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

    const tokens = lightData.tokens;
    const rampPoints = (slug: string): Array<{ l: number; c: number; h: number }> => {
      const points = tokens
        .filter((t) => t.path[0] === 'color' && t.path[1] === slug && /^\d+$/.test(t.path[2] ?? ''))
        .map((t) => parseToOklch(String(tokenValue(t))))
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
      const muiTheme = (theme: string): Record<string, unknown> => {
        const { tokens, values } = theme === 'light' ? lightData : darkData;
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
      const content = `${JSON.stringify({ light: muiTheme('light'), dark: muiTheme('dark') }, null, 2)}\n`;
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
