import { mkdirSync, writeFileSync } from 'node:fs';
import { formatOklch, oklchToHex, parseToOklch } from './colors.js';
import { loadThemeTokens, ResolvedDictionary, tokenValue, type ResolvedToken } from './compiler.js';
import { profileFileName, type UiProfileId } from './profile-registry.js';
import { feedbackBgPath, feedbackTextPath, paletteRoleOf, SEMANTIC_ROLE_PATHS } from './roles.js';

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
type ProfileRenderer = (
  profile: UiProfileId,
  light: ResolvedDictionary,
  dark: ResolvedDictionary,
) => string;

const PROFILE_RENDERERS: Record<UiProfileId, ProfileRenderer> = {
  fluent: renderFluentProfile,
  shadcn: renderCssMappingProfile,
  bootstrap: renderCssMappingProfile,
  primevue: renderCssMappingProfile,
  antd: renderAntdProfile,
  mui: renderMuiProfile,
  chakra: renderChakraProfile,
  radix: renderRadixProfile,
};

export function renderProfile(
  profile: UiProfileId,
  light: ResolvedDictionary,
  dark: ResolvedDictionary,
): { fileName: string; content: string } {
  return {
    fileName: profileFileName(profile),
    content: PROFILE_RENDERERS[profile](profile, light, dark),
  };
}

export async function buildUiProfile(
  profile: UiProfileId,
  tokensDir: string,
  outDir: string,
): Promise<string> {
  const light = await loadThemeTokens(tokensDir, 'light');
  const dark = await loadThemeTokens(tokensDir, 'dark');
  const rendered = renderProfile(profile, light, dark);
  const buildPath = outDir.endsWith('/') ? outDir : `${outDir}/`;
  mkdirSync(buildPath, { recursive: true });
  const destination = `${buildPath}${rendered.fileName}`;
  writeFileSync(destination, rendered.content, 'utf8');
  return destination;
}

function profileHex(dict: ResolvedDictionary, path: string, profile: UiProfileId): string {
  return oklchToHex(parseToOklch(dict.require(path, `profile ${profile}`)));
}

function profileRemToPx(dict: ResolvedDictionary, path: string, profile: UiProfileId): number {
  const raw = dict.require(path, `profile ${profile}`);
  return Math.round(Number.parseFloat(raw) * 16);
}

function renderFluentProfile(
  profile: UiProfileId,
  light: ResolvedDictionary,
  dark: ResolvedDictionary,
): string {
  const fluentTokens = (dict: ResolvedDictionary): Record<string, string | number> => ({
    colorBrandBackground: profileHex(dict, SEMANTIC_ROLE_PATHS.ACTION_PRIMARY, profile),
    colorBrandForeground1: profileHex(dict, SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_TEXT, profile),
    colorNeutralBackground1: profileHex(dict, SEMANTIC_ROLE_PATHS.BG_SURFACE, profile),
    colorNeutralBackground2: profileHex(dict, SEMANTIC_ROLE_PATHS.BG_CANVAS, profile),
    colorNeutralForeground1: profileHex(dict, SEMANTIC_ROLE_PATHS.TEXT_PRIMARY, profile),
    colorNeutralForeground2: profileHex(dict, SEMANTIC_ROLE_PATHS.TEXT_SECONDARY, profile),
    colorNeutralStroke1: profileHex(dict, SEMANTIC_ROLE_PATHS.BORDER_DEFAULT, profile),
    colorNeutralStrokeAccessible: profileHex(dict, SEMANTIC_ROLE_PATHS.BORDER_STRONG, profile),
    colorBrandStroke1: profileHex(dict, SEMANTIC_ROLE_PATHS.BORDER_FOCUS, profile),
    borderRadiusMedium: profileRemToPx(dict, 'radius.md', profile),
  });
  return `${JSON.stringify({ light: fluentTokens(light), dark: fluentTokens(dark) }, null, 2)}\n`;
}

const RADIX_LIGHT_POSITIONS = [
  0, 0.06, 0.14, 0.23, 0.32, 0.42, 0.52, 0.63, 0.74, 0.84, 0.92, 1,
] as const;
const RADIX_DARK_POSITIONS = [
  1, 0.94, 0.86, 0.77, 0.68, 0.58, 0.48, 0.37, 0.26, 0.16, 0.08, 0,
] as const;

function renderRadixProfile(
  profile: UiProfileId,
  light: ResolvedDictionary,
  dark: ResolvedDictionary,
): string {
  const rampPointsFor = (
    tokensList: readonly ResolvedToken[],
    slug: string,
  ): Array<{ l: number; c: number; h: number }> => {
    return tokensList
      .filter((t) => t.path[0] === 'color' && t.path[1] === slug && /^\d+$/.test(t.path[2] ?? ''))
      .map((t) => parseToOklch(String(tokenValue(t))))
      .sort((a, b) => b.l - a.l);
  };

  const rampOrThrow = (
    tokensList: readonly ResolvedToken[],
    slug: string,
  ): Array<{ l: number; c: number; h: number }> => {
    const points = rampPointsFor(tokensList, slug);
    if (points.length < 2) {
      throw new Error(`profile radix: ramp "${slug}" needs at least two steps`);
    }
    return points;
  };

  const primaryToken = light.tokens.find((token) => paletteRoleOf(token) === 'primary');
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
    rampOrThrow(light.tokens, primarySlug),
    RADIX_LIGHT_POSITIONS,
  );
  const lightGray = interpolateRamp(rampOrThrow(light.tokens, 'neutral'), RADIX_LIGHT_POSITIONS);
  const darkAccent = interpolateRamp(rampOrThrow(dark.tokens, primarySlug), RADIX_DARK_POSITIONS);
  const darkGray = interpolateRamp(rampOrThrow(dark.tokens, 'neutral'), RADIX_DARK_POSITIONS);

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

  return (
    `/**\n * Do not edit directly, this file was auto-generated.\n */\n\n` +
    renderRadixBlock(
      ':root',
      lightAccent,
      lightGray,
      light.require(SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_TEXT, `profile ${profile}`),
    ) +
    `\n` +
    renderRadixBlock(
      '.dark',
      darkAccent,
      darkGray,
      dark.require(SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_TEXT, `profile ${profile}`),
    )
  );
}

function renderMuiProfile(
  profile: UiProfileId,
  light: ResolvedDictionary,
  dark: ResolvedDictionary,
): string {
  const muiTheme = (theme: string): Record<string, unknown> => {
    const dict = theme === 'light' ? light : dark;
    const secondary = dict.tokens.find((token) => paletteRoleOf(token) === 'secondary');
    return {
      palette: {
        mode: theme,
        primary: {
          main: profileHex(dict, SEMANTIC_ROLE_PATHS.ACTION_PRIMARY, profile),
          contrastText: profileHex(dict, SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_TEXT, profile),
        },
        secondary: {
          main:
            secondary === undefined
              ? profileHex(dict, SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_HOVER, profile)
              : oklchToHex(parseToOklch(String(tokenValue(secondary)))),
        },
        error: { main: profileHex(dict, feedbackTextPath('danger'), profile) },
        warning: { main: profileHex(dict, feedbackTextPath('warning'), profile) },
        success: { main: profileHex(dict, feedbackTextPath('success'), profile) },
        info: { main: profileHex(dict, feedbackTextPath('info'), profile) },
        text: {
          primary: profileHex(dict, SEMANTIC_ROLE_PATHS.TEXT_PRIMARY, profile),
          secondary: profileHex(dict, SEMANTIC_ROLE_PATHS.TEXT_SECONDARY, profile),
          disabled: profileHex(dict, SEMANTIC_ROLE_PATHS.TEXT_DISABLED, profile),
        },
        background: {
          default: profileHex(dict, SEMANTIC_ROLE_PATHS.BG_CANVAS, profile),
          paper: profileHex(dict, SEMANTIC_ROLE_PATHS.BG_SURFACE, profile),
        },
        divider: profileHex(dict, SEMANTIC_ROLE_PATHS.BORDER_DEFAULT, profile),
      },
      typography: {
        fontFamily: dict.require('font-family.sans', `profile ${profile}`),
        fontSize: profileRemToPx(dict, 'font-size.base', profile),
      },
      shape: { borderRadius: profileRemToPx(dict, 'radius.md', profile) },
    };
  };
  return `${JSON.stringify({ light: muiTheme('light'), dark: muiTheme('dark') }, null, 2)}\n`;
}

function renderChakraProfile(
  profile: UiProfileId,
  light: ResolvedDictionary,
  dark: ResolvedDictionary,
): string {
  const pair = (path: string): { value: { _light: string; _dark: string } } => ({
    value: {
      _light: light.require(path, `profile ${profile}`),
      _dark: dark.require(path, `profile ${profile}`),
    },
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
  return `${JSON.stringify(chakra, null, 2)}\n`;
}

function renderAntdProfile(
  profile: UiProfileId,
  light: ResolvedDictionary,
  dark: ResolvedDictionary,
): string {
  const antdTokens = (dict: ResolvedDictionary): Record<string, string | number> => ({
    colorPrimary: profileHex(dict, SEMANTIC_ROLE_PATHS.ACTION_PRIMARY, profile),
    colorSuccess: profileHex(dict, feedbackTextPath('success'), profile),
    colorWarning: profileHex(dict, feedbackTextPath('warning'), profile),
    colorError: profileHex(dict, feedbackTextPath('danger'), profile),
    colorInfo: profileHex(dict, feedbackTextPath('info'), profile),
    colorText: profileHex(dict, SEMANTIC_ROLE_PATHS.TEXT_PRIMARY, profile),
    colorTextSecondary: profileHex(dict, SEMANTIC_ROLE_PATHS.TEXT_SECONDARY, profile),
    colorBgLayout: profileHex(dict, SEMANTIC_ROLE_PATHS.BG_CANVAS, profile),
    colorBgContainer: profileHex(dict, SEMANTIC_ROLE_PATHS.BG_SURFACE, profile),
    colorBgElevated: profileHex(dict, SEMANTIC_ROLE_PATHS.BG_RAISED, profile),
    colorBorder: profileHex(dict, SEMANTIC_ROLE_PATHS.BORDER_DEFAULT, profile),
    colorBorderSecondary: profileHex(dict, SEMANTIC_ROLE_PATHS.BORDER_SUBTLE, profile),
    colorLink: profileHex(dict, SEMANTIC_ROLE_PATHS.TEXT_LINK, profile),
    borderRadius: profileRemToPx(dict, 'radius.md', profile),
    fontFamily: dict.require('font-family.sans', `profile ${profile}`),
    fontSize: profileRemToPx(dict, 'font-size.base', profile),
  });
  return `${JSON.stringify({ light: { token: antdTokens(light) }, dark: { token: antdTokens(dark) } }, null, 2)}\n`;
}

function renderCssMappingProfile(
  profile: UiProfileId,
  light: ResolvedDictionary,
  dark: ResolvedDictionary,
): string {
  if (profile !== 'shadcn' && profile !== 'bootstrap' && profile !== 'primevue') {
    throw new Error(`profile ${profile} has no CSS mapping`);
  }
  const { darkSelector, mapping } = PROFILE_MAPPINGS[profile];
  const renderBlock = (dict: ResolvedDictionary, includeLightOnly: boolean): string =>
    mapping
      .filter((entry) => includeLightOnly || !entry.lightOnly)
      .map((entry) => `  ${entry.variable}: ${dict.require(entry.source, `profile ${profile}`)};`)
      .join('\n');
  return (
    `/**\n * Do not edit directly, this file was auto-generated.\n */\n\n` +
    `:root {\n${renderBlock(light, true)}\n}\n\n${darkSelector} {\n${renderBlock(dark, false)}\n}\n`
  );
}
