import { mkdirSync, writeFileSync } from 'node:fs';
import { formatOklch, oklchToHex, parseToOklch } from './colors.js';
import {
  loadThemeTokens,
  tokenValue,
  type ResolvedThemeTokens,
  type ResolvedToken,
} from './compiler.js';
import { feedbackBgPath, feedbackTextPath, SEMANTIC_ROLE_PATHS } from './roles.js';

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
      { variable: '--background', source: SEMANTIC_ROLE_PATHS.BG_CANVAS },
      { variable: '--foreground', source: SEMANTIC_ROLE_PATHS.TEXT_PRIMARY },
      { variable: '--card', source: SEMANTIC_ROLE_PATHS.BG_SURFACE },
      { variable: '--card-foreground', source: SEMANTIC_ROLE_PATHS.TEXT_PRIMARY },
      { variable: '--popover', source: SEMANTIC_ROLE_PATHS.BG_RAISED },
      { variable: '--popover-foreground', source: SEMANTIC_ROLE_PATHS.TEXT_PRIMARY },
      { variable: '--primary', source: SEMANTIC_ROLE_PATHS.ACTION_PRIMARY },
      { variable: '--primary-foreground', source: SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_TEXT },
      { variable: '--secondary', source: SEMANTIC_ROLE_PATHS.BG_SUBTLE },
      { variable: '--secondary-foreground', source: SEMANTIC_ROLE_PATHS.TEXT_PRIMARY },
      { variable: '--muted', source: SEMANTIC_ROLE_PATHS.BG_SUBTLE },
      { variable: '--muted-foreground', source: SEMANTIC_ROLE_PATHS.TEXT_SECONDARY },
      { variable: '--accent', source: SEMANTIC_ROLE_PATHS.BG_RAISED },
      { variable: '--accent-foreground', source: SEMANTIC_ROLE_PATHS.TEXT_PRIMARY },
      { variable: '--destructive', source: feedbackTextPath('danger') },
      { variable: '--destructive-foreground', source: feedbackBgPath('danger') },
      { variable: '--border', source: SEMANTIC_ROLE_PATHS.BORDER_DEFAULT },
      { variable: '--input', source: SEMANTIC_ROLE_PATHS.BORDER_STRONG },
      { variable: '--ring', source: SEMANTIC_ROLE_PATHS.BORDER_FOCUS },
      { variable: '--radius', source: 'radius.md', lightOnly: true },
    ],
  },
  bootstrap: {
    darkSelector: '[data-bs-theme="dark"]',
    mapping: [
      { variable: '--bs-body-bg', source: SEMANTIC_ROLE_PATHS.BG_CANVAS },
      { variable: '--bs-body-color', source: SEMANTIC_ROLE_PATHS.TEXT_PRIMARY },
      { variable: '--bs-primary', source: SEMANTIC_ROLE_PATHS.ACTION_PRIMARY },
      { variable: '--bs-secondary-color', source: SEMANTIC_ROLE_PATHS.TEXT_SECONDARY },
      { variable: '--bs-tertiary-bg', source: SEMANTIC_ROLE_PATHS.BG_SUBTLE },
      { variable: '--bs-border-color', source: SEMANTIC_ROLE_PATHS.BORDER_DEFAULT },
      { variable: '--bs-link-color', source: SEMANTIC_ROLE_PATHS.TEXT_LINK },
      { variable: '--bs-border-radius', source: 'radius.md', lightOnly: true },
    ],
  },
  primevue: {
    darkSelector: '.p-dark',
    mapping: [
      { variable: '--p-primary-color', source: SEMANTIC_ROLE_PATHS.ACTION_PRIMARY },
      { variable: '--p-primary-contrast-color', source: SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_TEXT },
      { variable: '--p-surface-ground', source: SEMANTIC_ROLE_PATHS.BG_CANVAS },
      { variable: '--p-surface-section', source: SEMANTIC_ROLE_PATHS.BG_SUBTLE },
      { variable: '--p-surface-card', source: SEMANTIC_ROLE_PATHS.BG_SURFACE },
      { variable: '--p-surface-overlay', source: SEMANTIC_ROLE_PATHS.BG_RAISED },
      { variable: '--p-surface-border', source: SEMANTIC_ROLE_PATHS.BORDER_DEFAULT },
      { variable: '--p-text-color', source: SEMANTIC_ROLE_PATHS.TEXT_PRIMARY },
      { variable: '--p-text-muted-color', source: SEMANTIC_ROLE_PATHS.TEXT_SECONDARY },
      { variable: '--p-highlight-background', source: SEMANTIC_ROLE_PATHS.BG_RAISED },
      { variable: '--p-border-radius', source: 'radius.md', lightOnly: true },
    ],
  },
};

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

  if (profile === 'fluent') {
    return renderFluentProfile(light, dark, destination);
  }
  if (profile === 'radix') {
    return renderRadixProfile(lightData, darkData, light, dark, destination);
  }
  if (profile === 'mui') {
    return renderMuiProfile(lightData, darkData, destination);
  }
  if (profile === 'chakra') {
    return renderChakraProfile(light, dark, destination);
  }
  if (profile === 'antd') {
    return renderAntdProfile(light, dark, destination);
  }
  return renderCssMappingProfile(profile, light, dark, destination);
}

function profileHex(values: Map<string, string>, path: string): string {
  const raw = values.get(path);
  if (!raw) throw new Error(`missing color token "${path}"`);
  return oklchToHex(parseToOklch(raw));
}

function profileRemToPx(values: Map<string, string>, path: string): number {
  const raw = values.get(path);
  if (!raw) throw new Error(`missing dimension token "${path}"`);
  return Math.round(Number.parseFloat(raw) * 16);
}

function assertRequiredRoles(
  profile: string,
  required: readonly string[],
  light: Map<string, string>,
  dark: Map<string, string>,
): void {
  for (const source of required) {
    if (!light.has(source) || !dark.has(source)) {
      throw new Error(`profile ${profile}: missing token role ${source}`);
    }
  }
}

const FLUENT_REQUIRED = [
  SEMANTIC_ROLE_PATHS.ACTION_PRIMARY,
  SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_TEXT,
  SEMANTIC_ROLE_PATHS.TEXT_PRIMARY,
  SEMANTIC_ROLE_PATHS.TEXT_SECONDARY,
  SEMANTIC_ROLE_PATHS.BG_CANVAS,
  SEMANTIC_ROLE_PATHS.BG_SURFACE,
  SEMANTIC_ROLE_PATHS.BORDER_DEFAULT,
  SEMANTIC_ROLE_PATHS.BORDER_STRONG,
  SEMANTIC_ROLE_PATHS.BORDER_FOCUS,
  'radius.md',
] as const;

function renderFluentProfile(
  light: Map<string, string>,
  dark: Map<string, string>,
  destination: string,
): string[] {
  assertRequiredRoles('fluent', FLUENT_REQUIRED, light, dark);
  const fluentTokens = (values: Map<string, string>): Record<string, string | number> => ({
    colorBrandBackground: profileHex(values, SEMANTIC_ROLE_PATHS.ACTION_PRIMARY),
    colorBrandForeground1: profileHex(values, SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_TEXT),
    colorNeutralBackground1: profileHex(values, SEMANTIC_ROLE_PATHS.BG_SURFACE),
    colorNeutralBackground2: profileHex(values, SEMANTIC_ROLE_PATHS.BG_CANVAS),
    colorNeutralForeground1: profileHex(values, SEMANTIC_ROLE_PATHS.TEXT_PRIMARY),
    colorNeutralForeground2: profileHex(values, SEMANTIC_ROLE_PATHS.TEXT_SECONDARY),
    colorNeutralStroke1: profileHex(values, SEMANTIC_ROLE_PATHS.BORDER_DEFAULT),
    colorNeutralStrokeAccessible: profileHex(values, SEMANTIC_ROLE_PATHS.BORDER_STRONG),
    colorBrandStroke1: profileHex(values, SEMANTIC_ROLE_PATHS.BORDER_FOCUS),
    borderRadiusMedium: profileRemToPx(values, 'radius.md'),
  });
  const content = `${JSON.stringify({ light: fluentTokens(light), dark: fluentTokens(dark) }, null, 2)}\n`;
  writeFileSync(destination, content, 'utf8');
  return [destination];
}

const RADIX_REQUIRED = [
  SEMANTIC_ROLE_PATHS.ACTION_PRIMARY,
  SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_TEXT,
  SEMANTIC_ROLE_PATHS.TEXT_PRIMARY,
  SEMANTIC_ROLE_PATHS.TEXT_SECONDARY,
  SEMANTIC_ROLE_PATHS.BG_CANVAS,
  SEMANTIC_ROLE_PATHS.BG_SURFACE,
  SEMANTIC_ROLE_PATHS.BORDER_DEFAULT,
  SEMANTIC_ROLE_PATHS.BORDER_STRONG,
  SEMANTIC_ROLE_PATHS.BORDER_FOCUS,
  'radius.md',
] as const;

const RADIX_LIGHT_POSITIONS = [
  0, 0.06, 0.14, 0.23, 0.32, 0.42, 0.52, 0.63, 0.74, 0.84, 0.92, 1,
] as const;
const RADIX_DARK_POSITIONS = [
  1, 0.94, 0.86, 0.77, 0.68, 0.58, 0.48, 0.37, 0.26, 0.16, 0.08, 0,
] as const;

function renderRadixProfile(
  lightData: ResolvedThemeTokens,
  darkData: ResolvedThemeTokens,
  light: Map<string, string>,
  dark: Map<string, string>,
  destination: string,
): string[] {
  assertRequiredRoles('radix', RADIX_REQUIRED, light, dark);
  const rampPointsFor = (
    tokensList: ResolvedToken[],
    slug: string,
  ): Array<{ l: number; c: number; h: number }> => {
    return tokensList
      .filter((t) => t.path[0] === 'color' && t.path[1] === slug && /^\d+$/.test(t.path[2] ?? ''))
      .map((t) => parseToOklch(String(tokenValue(t))))
      .sort((a, b) => b.l - a.l);
  };

  const primaryToken = lightData.tokens.find(
    (token) => (token.$description ?? '').startsWith('primary —') && token.path[2] === '500',
  );
  if (primaryToken === undefined) throw new Error('profile radix: primary ramp not found');
  const primarySlug = primaryToken.path[1] as string;

  const interpolateRamp = (
    points: Array<{ l: number; c: number; h: number }>,
    positions: readonly number[],
  ): string[] => {
    const lMax = points[0]?.l as number;
    const lMin = points[points.length - 1]?.l as number;
    return positions.map((t) => {
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

  const lightAccent = interpolateRamp(
    rampPointsFor(lightData.tokens, primarySlug),
    RADIX_LIGHT_POSITIONS,
  );
  const lightGray = interpolateRamp(
    rampPointsFor(lightData.tokens, 'neutral'),
    RADIX_LIGHT_POSITIONS,
  );
  const darkAccent = interpolateRamp(
    rampPointsFor(darkData.tokens, primarySlug),
    RADIX_DARK_POSITIONS,
  );
  const darkGray = interpolateRamp(rampPointsFor(darkData.tokens, 'neutral'), RADIX_DARK_POSITIONS);

  const renderRadixBlock = (
    selector: string,
    accentList: string[],
    grayList: string[],
    contrastText: string,
  ): string =>
    `${selector} {\n` +
    accentList.map((value, i) => `  --accent-${i + 1}: ${value};`).join('\n') +
    `\n  --accent-contrast: ${contrastText};\n` +
    grayList.map((value, i) => `  --gray-${i + 1}: ${value};`).join('\n') +
    '\n}\n';

  const content =
    `/**\n * Do not edit directly, this file was auto-generated.\n */\n\n` +
    renderRadixBlock(
      ':root',
      lightAccent,
      lightGray,
      light.get(SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_TEXT) as string,
    ) +
    `\n` +
    renderRadixBlock(
      '.dark',
      darkAccent,
      darkGray,
      dark.get(SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_TEXT) as string,
    );
  writeFileSync(destination, content, 'utf8');
  return [destination];
}

const MUI_CHAKRA_REQUIRED = [
  SEMANTIC_ROLE_PATHS.ACTION_PRIMARY,
  SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_TEXT,
  SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_HOVER,
  feedbackTextPath('success'),
  feedbackTextPath('warning'),
  feedbackTextPath('danger'),
  feedbackTextPath('info'),
  SEMANTIC_ROLE_PATHS.TEXT_PRIMARY,
  SEMANTIC_ROLE_PATHS.TEXT_SECONDARY,
  SEMANTIC_ROLE_PATHS.TEXT_DISABLED,
  SEMANTIC_ROLE_PATHS.BG_CANVAS,
  SEMANTIC_ROLE_PATHS.BG_SURFACE,
  SEMANTIC_ROLE_PATHS.BG_RAISED,
  SEMANTIC_ROLE_PATHS.BG_SUBTLE,
  SEMANTIC_ROLE_PATHS.BORDER_DEFAULT,
  SEMANTIC_ROLE_PATHS.BORDER_SUBTLE,
  SEMANTIC_ROLE_PATHS.BORDER_FOCUS,
  'radius.md',
  'font-family.sans',
  'font-size.base',
] as const;

function renderMuiProfile(
  lightData: ResolvedThemeTokens,
  darkData: ResolvedThemeTokens,
  destination: string,
): string[] {
  assertRequiredRoles('mui', MUI_CHAKRA_REQUIRED, lightData.values, darkData.values);
  const muiTheme = (theme: string): Record<string, unknown> => {
    const { tokens, values } = theme === 'light' ? lightData : darkData;
    const secondary = tokens.find(
      (token) => (token.$description ?? '').startsWith('secondary —') && token.path[2] === '500',
    );
    return {
      palette: {
        mode: theme,
        primary: {
          main: profileHex(values, SEMANTIC_ROLE_PATHS.ACTION_PRIMARY),
          contrastText: profileHex(values, SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_TEXT),
        },
        secondary: {
          main:
            secondary === undefined
              ? profileHex(values, SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_HOVER)
              : oklchToHex(parseToOklch(String(tokenValue(secondary)))),
        },
        error: { main: profileHex(values, feedbackTextPath('danger')) },
        warning: { main: profileHex(values, feedbackTextPath('warning')) },
        success: { main: profileHex(values, feedbackTextPath('success')) },
        info: { main: profileHex(values, feedbackTextPath('info')) },
        text: {
          primary: profileHex(values, SEMANTIC_ROLE_PATHS.TEXT_PRIMARY),
          secondary: profileHex(values, SEMANTIC_ROLE_PATHS.TEXT_SECONDARY),
          disabled: profileHex(values, SEMANTIC_ROLE_PATHS.TEXT_DISABLED),
        },
        background: {
          default: profileHex(values, SEMANTIC_ROLE_PATHS.BG_CANVAS),
          paper: profileHex(values, SEMANTIC_ROLE_PATHS.BG_SURFACE),
        },
        divider: profileHex(values, SEMANTIC_ROLE_PATHS.BORDER_DEFAULT),
      },
      typography: {
        fontFamily: values.get('font-family.sans') as string,
        fontSize: profileRemToPx(values, 'font-size.base'),
      },
      shape: { borderRadius: profileRemToPx(values, 'radius.md') },
    };
  };
  const content = `${JSON.stringify({ light: muiTheme('light'), dark: muiTheme('dark') }, null, 2)}\n`;
  writeFileSync(destination, content, 'utf8');
  return [destination];
}

function renderChakraProfile(
  light: Map<string, string>,
  dark: Map<string, string>,
  destination: string,
): string[] {
  assertRequiredRoles('chakra', MUI_CHAKRA_REQUIRED, light, dark);
  const pair = (path: string): { value: { _light: string; _dark: string } } => ({
    value: { _light: light.get(path) as string, _dark: dark.get(path) as string },
  });
  const chakra = {
    semanticTokens: {
      colors: {
        bg: pair(SEMANTIC_ROLE_PATHS.BG_CANVAS),
        'bg.subtle': pair(SEMANTIC_ROLE_PATHS.BG_SUBTLE),
        'bg.panel': pair(SEMANTIC_ROLE_PATHS.BG_SURFACE),
        'bg.raised': pair(SEMANTIC_ROLE_PATHS.BG_RAISED),
        fg: pair(SEMANTIC_ROLE_PATHS.TEXT_PRIMARY),
        'fg.muted': pair(SEMANTIC_ROLE_PATHS.TEXT_SECONDARY),
        'fg.disabled': pair(SEMANTIC_ROLE_PATHS.TEXT_DISABLED),
        border: pair(SEMANTIC_ROLE_PATHS.BORDER_DEFAULT),
        'border.subtle': pair(SEMANTIC_ROLE_PATHS.BORDER_SUBTLE),
        'border.focus': pair(SEMANTIC_ROLE_PATHS.BORDER_FOCUS),
        solid: pair(SEMANTIC_ROLE_PATHS.ACTION_PRIMARY),
        'solid.fg': pair(SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_TEXT),
        focusRing: pair(SEMANTIC_ROLE_PATHS.BORDER_FOCUS),
      },
    },
  };
  writeFileSync(destination, `${JSON.stringify(chakra, null, 2)}\n`, 'utf8');
  return [destination];
}

const ANTD_REQUIRED = [
  SEMANTIC_ROLE_PATHS.ACTION_PRIMARY,
  feedbackTextPath('success'),
  feedbackTextPath('warning'),
  feedbackTextPath('danger'),
  feedbackTextPath('info'),
  SEMANTIC_ROLE_PATHS.TEXT_PRIMARY,
  SEMANTIC_ROLE_PATHS.TEXT_SECONDARY,
  SEMANTIC_ROLE_PATHS.BG_CANVAS,
  SEMANTIC_ROLE_PATHS.BG_SURFACE,
  SEMANTIC_ROLE_PATHS.BG_RAISED,
  SEMANTIC_ROLE_PATHS.BORDER_DEFAULT,
  SEMANTIC_ROLE_PATHS.BORDER_SUBTLE,
  SEMANTIC_ROLE_PATHS.TEXT_LINK,
  'radius.md',
  'font-family.sans',
  'font-size.base',
] as const;

function renderAntdProfile(
  light: Map<string, string>,
  dark: Map<string, string>,
  destination: string,
): string[] {
  assertRequiredRoles('antd', ANTD_REQUIRED, light, dark);
  const antdTokens = (values: Map<string, string>): Record<string, string | number> => ({
    colorPrimary: profileHex(values, SEMANTIC_ROLE_PATHS.ACTION_PRIMARY),
    colorSuccess: profileHex(values, feedbackTextPath('success')),
    colorWarning: profileHex(values, feedbackTextPath('warning')),
    colorError: profileHex(values, feedbackTextPath('danger')),
    colorInfo: profileHex(values, feedbackTextPath('info')),
    colorText: profileHex(values, SEMANTIC_ROLE_PATHS.TEXT_PRIMARY),
    colorTextSecondary: profileHex(values, SEMANTIC_ROLE_PATHS.TEXT_SECONDARY),
    colorBgLayout: profileHex(values, SEMANTIC_ROLE_PATHS.BG_CANVAS),
    colorBgContainer: profileHex(values, SEMANTIC_ROLE_PATHS.BG_SURFACE),
    colorBgElevated: profileHex(values, SEMANTIC_ROLE_PATHS.BG_RAISED),
    colorBorder: profileHex(values, SEMANTIC_ROLE_PATHS.BORDER_DEFAULT),
    colorBorderSecondary: profileHex(values, SEMANTIC_ROLE_PATHS.BORDER_SUBTLE),
    colorLink: profileHex(values, SEMANTIC_ROLE_PATHS.TEXT_LINK),
    borderRadius: profileRemToPx(values, 'radius.md'),
    fontFamily: values.get('font-family.sans') as string,
    fontSize: profileRemToPx(values, 'font-size.base'),
  });
  const content = `${JSON.stringify({ light: { token: antdTokens(light) }, dark: { token: antdTokens(dark) } }, null, 2)}\n`;
  writeFileSync(destination, content, 'utf8');
  return [destination];
}

function renderCssMappingProfile(
  profile: 'shadcn' | 'bootstrap' | 'primevue',
  light: Map<string, string>,
  dark: Map<string, string>,
  destination: string,
): string[] {
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
