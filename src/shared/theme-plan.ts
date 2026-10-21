import { buildRamp } from './colors.js';
import { FEEDBACK_ROLES, SEMANTIC_COLOR_ROLES } from './roles.js';
import { GENERATED_THEMES } from './spec.js';
import { walkTokenLeaves, type JsonObject } from './tokens.js';
import type { StyleSpec, TokenGroup } from './types.js';

type ThemeName = (typeof GENERATED_THEMES)[number];
type ThemeTarget = readonly [string, number];
interface ThemeConfig {
  targets: Record<string, ThemeTarget>;
  feedback: readonly [number, number];
}

const THEME_REGISTRY: Record<ThemeName, ThemeConfig> = {
  light: {
    targets: {
      canvas: ['neutral', 50],
      surface: ['neutral', 100],
      subtle: ['neutral', 200],
      raised: ['primary', 50],
      textPrimary: ['neutral', 900],
      textSecondary: ['neutral', 700],
      textTertiary: ['neutral', 600],
      textDisabled: ['neutral', 400],
      textInverse: ['neutral', 50],
      textLink: ['primary', 800],
      action: ['primary', 800],
      actionHover: ['primary', 900],
      actionText: ['neutral', 50],
      borderSubtle: ['neutral', 200],
      borderDefault: ['neutral', 300],
      borderStrong: ['neutral', 500],
      borderFocus: ['primary', 700],
    },
    feedback: [100, 800],
  },
  dark: {
    targets: {
      canvas: ['neutral', 950],
      surface: ['neutral', 900],
      subtle: ['neutral', 800],
      raised: ['primary', 950],
      textPrimary: ['neutral', 50],
      textSecondary: ['neutral', 300],
      textTertiary: ['neutral', 300],
      textDisabled: ['neutral', 500],
      textInverse: ['neutral', 900],
      textLink: ['primary', 100],
      action: ['primary', 100],
      actionHover: ['primary', 50],
      actionText: ['neutral', 950],
      borderSubtle: ['neutral', 800],
      borderDefault: ['neutral', 700],
      borderStrong: ['neutral', 500],
      borderFocus: ['primary', 100],
    },
    feedback: [800, 100],
  },
  'high-contrast': {
    targets: {
      canvas: ['neutral', 50],
      surface: ['neutral', 50],
      subtle: ['neutral', 100],
      raised: ['primary', 100],
      textPrimary: ['neutral', 950],
      textSecondary: ['neutral', 900],
      textTertiary: ['neutral', 800],
      textDisabled: ['neutral', 600],
      textInverse: ['neutral', 50],
      textLink: ['primary', 800],
      action: ['primary', 800],
      actionHover: ['primary', 900],
      actionText: ['neutral', 50],
      borderSubtle: ['neutral', 500],
      borderDefault: ['neutral', 700],
      borderStrong: ['neutral', 900],
      borderFocus: ['primary', 800],
    },
    feedback: [100, 900],
  },
};

export interface PlannedTheme {
  theme: string;
  data: Record<string, unknown>;
}

export function planThemes(spec: StyleSpec): PlannedTheme[] {
  const stepCount = spec.rampSteps ?? 11;
  const primaryEntry = spec.palette.find((entry) => entry.role === 'primary');
  if (primaryEntry === undefined) throw new Error('style-spec palette has no primary role');
  const rampSteps = Object.keys(buildRamp(primaryEntry.anchor, stepCount)).map(Number);
  const pickStep = (target: number): number =>
    rampSteps.reduce((best, step) =>
      Math.abs(step - target) < Math.abs(best - target) ||
      (Math.abs(step - target) === Math.abs(best - target) && step > best)
        ? step
        : best,
    );
  const colorAlias = (family: string, targetStep: number): { $value: string; $type: 'color' } => ({
    $value: `{color.${family}.${pickStep(targetStep)}}`,
    $type: 'color',
  });

  const allThemes: Record<string, ThemeConfig> = Object.fromEntries(
    GENERATED_THEMES.map((name) => [
      name,
      { targets: { ...THEME_REGISTRY[name].targets }, feedback: THEME_REGISTRY[name].feedback },
    ]),
  );
  if (spec.themes !== undefined) {
    for (const [customName, customConfig] of Object.entries(spec.themes)) {
      const baseMode = customConfig.mode as ThemeName;
      const base = THEME_REGISTRY[baseMode];
      if (base === undefined) throw new Error(`unknown theme mode: ${customConfig.mode}`);
      const baseTargets = { ...base.targets };
      if (customConfig.surfaceSteps !== undefined) {
        if (customConfig.surfaceSteps.canvas !== undefined)
          baseTargets['canvas'] = ['neutral', customConfig.surfaceSteps.canvas];
        if (customConfig.surfaceSteps.surface !== undefined)
          baseTargets['surface'] = ['neutral', customConfig.surfaceSteps.surface];
        if (customConfig.surfaceSteps.subtle !== undefined)
          baseTargets['subtle'] = ['neutral', customConfig.surfaceSteps.subtle];
        if (customConfig.surfaceSteps.raised !== undefined)
          baseTargets['raised'] = ['primary', customConfig.surfaceSteps.raised];
      }
      if (customConfig.actionStep !== undefined) {
        baseTargets['action'] = ['primary', customConfig.actionStep];
      }
      allThemes[customName] = { targets: baseTargets, feedback: base.feedback };
    }
  }

  const planned: PlannedTheme[] = [];
  for (const [theme, config] of Object.entries(allThemes)) {
    const targets = config.targets;
    const color: TokenGroup = { $type: 'color' };
    for (const role of SEMANTIC_COLOR_ROLES) {
      const target = targets[role.target];
      if (target === undefined) {
        throw new Error(`theme ${theme}: unknown semantic target "${role.target}"`);
      }
      const [group, leaf] = role.keys;
      const node = (color[group] as TokenGroup | undefined) ?? {};
      node[leaf] = colorAlias(target[0] === 'primary' ? primaryEntry.name : target[0], target[1]);
      color[group] = node;
    }
    color.feedback = Object.fromEntries(
      FEEDBACK_ROLES.map((role) => {
        const fb = config.feedback;
        return [
          role,
          {
            bg: colorAlias(`feedback.${role}`, fb[0]),
            text: colorAlias(`feedback.${role}`, fb[1]),
          },
        ];
      }),
    ) as TokenGroup;

    const data: Record<string, unknown> = {
      $description: `Tier 2 — semantic roles, ${theme.toUpperCase()} theme. Generated from the spec palette; aliases only.`,
      semantic: { color },
      layout: {
        $type: 'dimension',
        inset: {
          none: { $value: '{spacing.0}', $type: 'dimension' },
          xs: { $value: '{spacing.1}', $type: 'dimension' },
          sm: { $value: '{spacing.2}', $type: 'dimension' },
          base: { $value: '{spacing.3}', $type: 'dimension' },
          md: { $value: '{spacing.4}', $type: 'dimension' },
          lg: { $value: '{spacing.6}', $type: 'dimension' },
          xl: { $value: '{spacing.8}', $type: 'dimension' },
        },
        gap: {
          tight: { $value: '{spacing.2}', $type: 'dimension' },
          related: { $value: '{spacing.3}', $type: 'dimension' },
          default: { $value: '{spacing.4}', $type: 'dimension' },
          loose: { $value: '{spacing.6}', $type: 'dimension' },
        },
        section: { $value: '{rhythm.2}', $type: 'dimension' },
        page: { $value: '{spacing.16}', $type: 'dimension' },
      },
    };
    applyOverrides(data, spec.overrides?.[theme], theme);
    planned.push({ theme, data });
  }

  for (const theme of Object.keys(spec.overrides ?? {})) {
    if (!planned.some((entry) => entry.theme === theme)) {
      throw new Error(`override theme "${theme}" has no planned semantic file`);
    }
  }
  return planned;
}

function applyOverrides(
  data: Record<string, unknown>,
  overrides: Record<string, string> | undefined,
  theme: string,
): void {
  if (overrides === undefined) return;
  const known = new Set<string>();
  walkTokenLeaves(data as JsonObject, '.', (path) => known.add(path));
  for (const [path, alias] of Object.entries(overrides)) {
    if (!known.has(path)) {
      throw new Error(`theme ${theme}: override "${path}" matches no generated semantic token`);
    }
    const segments = path.split('.');
    let node = data;
    for (const segment of segments.slice(0, -1)) {
      node = node[segment] as Record<string, unknown>;
    }
    const leaf = node[segments[segments.length - 1] as string] as Record<string, unknown>;
    leaf['$value'] = alias;
  }
}
