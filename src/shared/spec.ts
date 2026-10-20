import { readFileSync } from 'node:fs';
import { clampToSrgb } from './colors.js';
import type { HarmonyMethod, RampStepCount, StyleSpec } from './types.js';

export interface StyleSpecValidationResult {
  valid: boolean;
  spec?: StyleSpec;
  errors: string[];
  warnings: string[];
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ALIAS_PATTERN = /^\{[a-z0-9.-]+\}$/;
export const GENERATED_THEMES = ['light', 'dark', 'high-contrast'] as const;
export type GeneratedTheme = (typeof GENERATED_THEMES)[number];
const HARMONY_METHODS: readonly HarmonyMethod[] = [
  'triadic',
  'analogous',
  'complementary',
  'split-complementary',
  'tetradic',
  'monochromatic',
];

function inRange(value: number, [min, max]: [number, number]): boolean {
  return min <= max ? value >= min && value <= max : value >= min || value <= max;
}

/** Validate a raw parsed object against the StyleSpec contract. */
export function validateStyleSpec(raw: unknown): StyleSpecValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, errors: ['style-spec must be a JSON object'], warnings: [] };
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj['name'] !== 'string' || obj['name'].trim() === '') {
    errors.push('name must be a non-empty string');
  }

  const palette = obj['palette'];
  if (!Array.isArray(palette) || palette.length < 3 || palette.length > 5) {
    errors.push('palette must contain 3–5 colors');
  } else {
    const primaryCount = palette.filter(
      (entry) =>
        entry !== null &&
        typeof entry === 'object' &&
        (entry as Record<string, unknown>)['role'] === 'primary',
    ).length;
    if (primaryCount !== 1) {
      errors.push('palette must contain exactly one primary color');
    }

    const paletteNames = new Set<string>();
    for (const item of palette) {
      if (item === null || typeof item !== 'object') {
        errors.push('palette entries must be objects');
        continue;
      }
      const entry = item as Record<string, unknown>;
      const name = entry['name'];
      if (typeof name !== 'string' || !SLUG_PATTERN.test(name) || paletteNames.has(name)) {
        errors.push(`palette name "${String(name)}" must be a unique kebab-case slug`);
      } else {
        paletteNames.add(name);
      }

      const role = entry['role'];
      if (role !== 'primary' && role !== 'secondary' && role !== 'accent' && role !== 'other') {
        errors.push(`palette "${String(name)}" role must be primary, secondary, accent, or other`);
      }

      const a = entry['anchor'] as Record<string, unknown> | undefined;
      if (
        a === null ||
        typeof a !== 'object' ||
        typeof a['l'] !== 'number' ||
        a['l'] < 0 ||
        a['l'] > 1 ||
        typeof a['c'] !== 'number' ||
        a['c'] < 0 ||
        typeof a['h'] !== 'number' ||
        a['h'] < 0 ||
        a['h'] > 360
      ) {
        errors.push(`palette "${String(name)}" anchor must be OKLCH { l: 0–1, c: ≥0, h: 0–360 }`);
      } else {
        const anchor = { l: a['l'], c: a['c'], h: a['h'] };
        const clamped = clampToSrgb(anchor);
        if (clamped.c !== anchor.c) {
          warnings.push(
            `anchor for ${String(name)} clamped to sRGB (chroma ${anchor.c} → ${clamped.c})`,
          );
        }
      }
    }
  }

  if (obj['rampSteps'] !== undefined) {
    const steps = obj['rampSteps'];
    if (steps !== 5 && steps !== 9 && steps !== 11) {
      errors.push('rampSteps must be 5, 9, or 11');
    }
  }

  const typography = obj['typography'] as Record<string, unknown> | undefined;
  if (
    typography === null ||
    typeof typography !== 'object' ||
    typeof typography['ratio'] !== 'number' ||
    !(typography['ratio'] > 1) ||
    typeof typography['baseSizePx'] !== 'number' ||
    !(typography['baseSizePx'] > 0)
  ) {
    errors.push('typography.baseSizePx > 0 and typography.ratio > 1 required');
  } else {
    if (typeof typography['fontFamily'] !== 'string' || typography['fontFamily'].trim() === '') {
      errors.push('typography.fontFamily must be a non-empty string');
    }
    if (typography['baseLineHeight'] !== undefined) {
      const blh = typography['baseLineHeight'];
      if (typeof blh !== 'number' || blh < 1 || blh > 2.5) {
        errors.push('typography.baseLineHeight must be 1–2.5');
      }
    }
  }

  if (obj['harmony'] !== undefined) {
    if (!HARMONY_METHODS.includes(obj['harmony'] as HarmonyMethod)) {
      errors.push(`harmony must be one of ${HARMONY_METHODS.join(', ')}`);
    }
  }

  if (obj['overrides'] !== undefined) {
    const overrides = obj['overrides'];
    if (overrides === null || typeof overrides !== 'object' || Array.isArray(overrides)) {
      errors.push('overrides must be an object');
    } else {
      const allowedThemes = [
        ...GENERATED_THEMES,
        ...Object.keys((obj['themes'] as Record<string, unknown>) ?? {}),
      ];
      for (const [theme, paths] of Object.entries(overrides as Record<string, unknown>)) {
        if (!allowedThemes.includes(theme)) {
          errors.push(`overrides theme "${theme}" is not a recognized theme`);
        }
        if (paths === null || typeof paths !== 'object' || Array.isArray(paths)) {
          errors.push(`overrides["${theme}"] must be an object`);
          continue;
        }
        for (const [path, alias] of Object.entries(paths as Record<string, unknown>)) {
          if (
            !path.startsWith('semantic.') ||
            typeof alias !== 'string' ||
            !ALIAS_PATTERN.test(alias)
          ) {
            errors.push(
              `override "${path}" must start semantic. with an alias value like {color.neutral.300}`,
            );
          }
        }
      }
    }
  }
  if (obj['themes'] !== undefined) {
    const themes = obj['themes'];
    if (themes === null || typeof themes !== 'object' || Array.isArray(themes)) {
      errors.push('themes must be an object');
    } else {
      for (const [themeName, config] of Object.entries(themes as Record<string, unknown>)) {
        if (config === null || typeof config !== 'object' || Array.isArray(config)) {
          errors.push(`themes["${themeName}"] must be an object`);
          continue;
        }
        const cfg = config as Record<string, unknown>;
        if (cfg['mode'] !== 'light' && cfg['mode'] !== 'dark') {
          errors.push(`themes["${themeName}"].mode must be "light" or "dark"`);
        }
        if (cfg['actionStep'] !== undefined && typeof cfg['actionStep'] !== 'number') {
          errors.push(`themes["${themeName}"].actionStep must be a number`);
        }
        if (cfg['surfaceSteps'] !== undefined) {
          if (typeof cfg['surfaceSteps'] !== 'object' || cfg['surfaceSteps'] === null) {
            errors.push(`themes["${themeName}"].surfaceSteps must be an object`);
          }
        }
      }
    }
  }

  if (
    obj['density'] !== undefined &&
    obj['density'] !== 'comfortable' &&
    obj['density'] !== 'compact'
  ) {
    errors.push('density must be "comfortable" or "compact"');
  }

  if (
    obj['neutralHue'] !== undefined &&
    (typeof obj['neutralHue'] !== 'number' || obj['neutralHue'] < 0 || obj['neutralHue'] > 360)
  ) {
    errors.push('neutralHue must be a number between 0 and 360');
  }

  if (
    obj['neutralChroma'] !== undefined &&
    (typeof obj['neutralChroma'] !== 'number' || obj['neutralChroma'] < 0)
  ) {
    errors.push('neutralChroma must be a non-negative number');
  }

  if (obj['targets'] !== undefined) {
    const targets = obj['targets'] as Record<string, unknown> | undefined;
    if (
      targets === null ||
      typeof targets !== 'object' ||
      typeof targets['minWcagRatio'] !== 'number' ||
      !(targets['minWcagRatio'] > 0)
    ) {
      errors.push('targets.minWcagRatio must be a positive number');
    }
  }

  if (obj['radius'] !== undefined) {
    const radius = obj['radius'] as Record<string, unknown> | undefined;
    if (
      radius === null ||
      typeof radius !== 'object' ||
      typeof radius['sm'] !== 'number' ||
      typeof radius['md'] !== 'number' ||
      typeof radius['lg'] !== 'number' ||
      typeof radius['full'] !== 'number'
    ) {
      errors.push('radius must specify numeric sm, md, lg, and full values');
    }
  }

  if (obj['clusterBounds'] !== undefined && Array.isArray(palette)) {
    const bounds = obj['clusterBounds'] as {
      h: [number, number];
      c: [number, number];
      l: [number, number];
    };
    if (bounds?.h && bounds?.c && bounds?.l) {
      for (const item of palette) {
        const entry = item as Record<string, unknown>;
        const a = entry?.['anchor'] as { l: number; c: number; h: number } | undefined;
        if (a && typeof a.h === 'number' && typeof a.c === 'number' && typeof a.l === 'number') {
          if (!inRange(a.h, bounds.h) || !inRange(a.c, bounds.c) || !inRange(a.l, bounds.l)) {
            warnings.push(
              `${String(entry['name'])} anchor outside cluster ${String(obj['cluster'] ?? 'recorded')} bounds (creative departure?)`,
            );
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  return {
    valid: true,
    spec: obj as unknown as StyleSpec,
    errors: [],
    warnings,
  };
}

/** Normalize optional defaults for StyleSpec. */
export function normalizeStyleSpec(spec: StyleSpec): StyleSpec {
  return {
    ...spec,
    rampSteps: (spec.rampSteps ?? 11) as RampStepCount,
    neutralHue: spec.neutralHue ?? 250,
    neutralChroma: spec.neutralChroma ?? 0.015,
    spacingBasePx: spec.spacingBasePx ?? 4,
    density: spec.density ?? 'comfortable',
    radius: spec.radius ?? { sm: 4, md: 8, lg: 12, full: 9999 },
    targets: spec.targets ?? { minWcagRatio: 4.5 },
    typography: {
      ...spec.typography,
      baseLineHeight: spec.typography?.baseLineHeight ?? 1.5,
    },
  };
}

/** Load, validate, and normalize a StyleSpec from a file path or JSON object. */
export function loadStyleSpec(pathOrJson: string | Record<string, unknown>): {
  spec: StyleSpec;
  warnings: string[];
} {
  const raw: unknown =
    typeof pathOrJson === 'string'
      ? (JSON.parse(readFileSync(pathOrJson, 'utf8')) as unknown)
      : pathOrJson;

  const result = validateStyleSpec(raw);
  if (!result.valid || result.spec === undefined) {
    throw new Error(`invalid style-spec: ${result.errors.join('; ')}`);
  }

  return {
    spec: normalizeStyleSpec(result.spec),
    warnings: result.warnings,
  };
}
