/**
 * Modular typography scale + 4px-base spacing math.
 * Every value emitted as a DTCG dimension (`{ value, unit: 'px' }`).
 */
import type { DtcgDimensionValue, TokenGroup } from './types.js';

const px = (value: number): DtcgDimensionValue => ({
  value: Number(value.toFixed(3)),
  unit: 'px',
});

export const TYPE_STEPS: ReadonlyArray<readonly [string, number]> = [
  ['xs', -2],
  ['sm', -1],
  ['base', 0],
  ['lg', 1],
  ['xl', 2],
  ['2xl', 3],
  ['3xl', 4],
  ['4xl', 5],
  ['5xl', 6],
];

/** DTCG `font-size` primitive group from base size + modular ratio (1.25 default). */
export function typographyScale(baseSizePx: number, ratio: number): TokenGroup {
  const group: TokenGroup = { $type: 'dimension' };
  for (const [name, step] of TYPE_STEPS) {
    group[name] = { $value: px(baseSizePx * ratio ** step), $type: 'dimension' };
  }
  return group;
}

/**
 * Vertical-rhythm baseline: base font size × the chosen base line-height,
 * rounded to a 4px multiple (16px × 1.5 → 24px; × 1.75 → 28px).
 */
export function baselinePx(baseSizePx: number, baseLineHeight = 1.5): number {
  return Math.round((baseSizePx * baseLineHeight) / 4) * 4;
}

/**
 * Paired line-heights, one per font-size step: each step's line height snaps
 * UP to the baseline subdivision grid (baseline/6, ≥2px; 24px baseline → 4px),
 * stored as a unitless multiplier so text sits on the vertical rhythm.
 */
export function pairedLineHeights(
  baseSizePx: number,
  ratio: number,
  baseLineHeight = 1.5,
): TokenGroup {
  const snapUnit = Math.max(2, Math.round(baselinePx(baseSizePx, baseLineHeight) / 6));
  const group: TokenGroup = { $type: 'number' };
  for (const [name, step] of TYPE_STEPS) {
    const sizePx = baseSizePx * ratio ** step;
    const lhPx = Math.ceil((sizePx * 1.2) / snapUnit) * snapUnit;
    group[name] = { $value: Number((lhPx / sizePx).toFixed(3)), $type: 'number' };
  }
  return group;
}

/** Vertical rhythm scale: half-baseline plus baseline multiples 1–6, as dimensions. */
export function rhythmScale(baseline: number): TokenGroup {
  const group: TokenGroup = { $type: 'dimension' };
  group['half'] = { $value: px(baseline / 2), $type: 'dimension' };
  group['baseline'] = { $value: px(baseline), $type: 'dimension' };
  for (let n = 1; n <= 6; n++) {
    group[String(n)] = { $value: px(baseline * n), $type: 'dimension' };
  }
  return group;
}

const SPACING_MULTIPLIERS: ReadonlyArray<readonly [string, number]> = [
  ['0', 0],
  ['1', 1],
  ['2', 2],
  ['3', 3],
  ['4', 4],
  ['5', 5],
  ['6', 6],
  ['8', 8],
  ['10', 10],
  ['12', 12],
  ['16', 16],
  ['20', 20],
  ['24', 24],
];

/** DTCG `spacing` primitive group on a 4px base unit (sp.1 = 4px, sp.4 = 16px, …). */
export function spacingScale(
  basePx = 4,
  density: 'comfortable' | 'compact' = 'comfortable',
): TokenGroup {
  const densityFactor = density === 'compact' ? 0.875 : 1;
  const group: TokenGroup = { $type: 'dimension' };
  for (const [name, multiplier] of SPACING_MULTIPLIERS) {
    group[name] = { $value: px(basePx * multiplier * densityFactor), $type: 'dimension' };
  }
  return group;
}

/** DTCG `radius` primitive group; `full` is the pill radius (9999px convention). */
export function radiusScale(radius: {
  sm: number;
  md: number;
  lg: number;
  full: number;
}): TokenGroup {
  return {
    $type: 'dimension',
    none: { $value: px(0), $type: 'dimension' },
    sm: { $value: px(radius.sm), $type: 'dimension' },
    md: { $value: px(radius.md), $type: 'dimension' },
    lg: { $value: px(radius.lg), $type: 'dimension' },
    full: { $value: px(radius.full), $type: 'dimension' },
  };
}
