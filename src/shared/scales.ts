/**
 * Modular typography scale + 4px-base spacing math.
 * Every value emitted as a DTCG dimension (`{ value, unit: 'px' }`).
 */
import type { DtcgDimensionValue, TokenGroup } from './types.js';

const px = (value: number): DtcgDimensionValue => ({
  value: Number(value.toFixed(3)),
  unit: 'px',
});

/**
 * Modular scale: `base × ratioⁿ` for each step n.
 * The named non-obvious formula behind every type ramp in the engine.
 */
export function modularScale(base: number, ratio: number, steps: readonly number[]): number[] {
  return steps.map((step) => Number((base * ratio ** step).toFixed(3)));
}

const TYPE_STEPS: ReadonlyArray<readonly [string, number]> = [
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

/** Fluid `clamp()` between min/max viewport widths for one modular type step. */
export function fluidClamp(
  minSizePx: number,
  maxSizePx: number,
  minViewportPx = 360,
  maxViewportPx = 1280,
): string {
  const slope = (maxSizePx - minSizePx) / (maxViewportPx - minViewportPx);
  const intercept = minSizePx - slope * minViewportPx;
  return `clamp(${minSizePx / 16}rem, ${(slope * 100).toFixed(3)}vw + ${(intercept / 16).toFixed(3)}rem, ${maxSizePx / 16}rem)`;
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
