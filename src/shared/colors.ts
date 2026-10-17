/**
 * OKLCH + WCAG 2.1 / APCA color engine on tree-shaken `colorjs.io/fn` partial imports.
 *
 * Only `sRGB` and `OKLCH` spaces are registered — every other space in
 * colorjs.io is stripped by Rollup (`treeshake.moduleSideEffects: false`).
 * Registration runs inside `ensureSpaces()` so tree-shaking cannot drop it.
 */
import {
  ColorSpace,
  contrastAPCA,
  contrastWCAG21,
  OKLCH,
  parse,
  serialize,
  sRGB,
  to,
} from 'colorjs.io/fn';
import type { ColorRamp, ContrastResult, DtcgColorValue, OklchColor, RampStep } from './types.js';

let registered = false;

function ensureSpaces(): void {
  if (registered) return;
  ColorSpace.register(sRGB);
  ColorSpace.register(OKLCH);
  registered = true;
}

/** colorjs.io/fn plain-color shape (the object `parse()` returns). */
export interface PlainColor {
  spaceId: string;
  coords: [number | null, number | null, number | null];
  alpha: number;
}

function plain(color: OklchColor): PlainColor {
  ensureSpaces();
  return { spaceId: 'oklch', coords: [color.l, color.c, color.h], alpha: color.alpha ?? 1 };
}

/** Parse any CSS color string (`#hex`, `oklch(...)`, named) into OKLCH coords. */
export function parseToOklch(input: string): OklchColor {
  ensureSpaces();
  const converted = to(parse(input), OKLCH) as unknown as {
    coords: [number | null, number | null, number | null];
    alpha?: number;
  };
  const [l, c, h] = converted.coords;
  return { l: l ?? 0, c: c ?? 0, h: h ?? 0, alpha: converted.alpha ?? 1 };
}

/** Coerce a DTCG color token value (object or CSS string) to OKLCH coords. */
export function dtcgToOklch(value: DtcgColorValue | string): OklchColor {
  if (typeof value === 'string') return parseToOklch(value);
  const [a, b, c] = value.components;
  if (value.colorSpace === 'oklch') return { l: a, c: b, h: c, alpha: value.alpha ?? 1 };
  ensureSpaces();
  const converted = to(
    { spaceId: 'srgb', coords: [a, b, c], alpha: value.alpha ?? 1 } as PlainColor,
    OKLCH,
  ) as unknown as { coords: [number | null, number | null, number | null]; alpha?: number };
  return {
    l: converted.coords[0] ?? 0,
    c: converted.coords[1] ?? 0,
    h: converted.coords[2] ?? 0,
    alpha: converted.alpha ?? 1,
  };
}

/** `oklch(60% 0.15 250deg)` CSS serialization of OKLCH coords (explicit hue unit, alpha-safe). */
export function formatOklch(color: OklchColor): string {
  ensureSpaces();
  return serialize(plain(color))
    .replace(/ ([0-9.]+)(\)| \/)/, ' $1deg$2')
    .replace(
      /\/ ([0-9.]+)\)/,
      (_match, alpha: string) => `/ ${Number((Number(alpha) * 100).toFixed(2))}%)`,
    );
}

/** sRGB hex (`#rrggbb`) fallback for OKLCH coords, gamut-clipped by colorjs.io. */
export function oklchToHex(color: OklchColor): string {
  ensureSpaces();
  return serialize(to(plain(color), sRGB), { format: 'hex' });
}

/** DTCG `$value` object for an OKLCH color, with sRGB hex fallback recorded. */
export function dtcgColorValue(color: OklchColor): DtcgColorValue {
  return {
    colorSpace: 'oklch',
    components: [
      Number(color.l.toFixed(4)),
      Number(color.c.toFixed(4)),
      Number(color.h.toFixed(2)),
    ],
    alpha: color.alpha ?? 1,
    hex: oklchToHex(color),
  };
}

/** WCAG 2.1 contrast ratio (1–21) between two colors, order-independent. */
export function contrastRatio(foreground: OklchColor, background: OklchColor): number {
  ensureSpaces();
  return Number(contrastWCAG21(plain(foreground), plain(background)));
}

/**
 * Absolute APCA lightness contrast |Lc| (real algorithm via colorjs.io, not a
 * lightness-difference estimate). APCA is polarity-signed (dark text yields
 * negative Lc); floors compare the absolute value.
 */
export function apcaContrast(foreground: OklchColor, background: OklchColor): number {
  ensureSpaces();
  return Math.abs(Number(contrastAPCA(plain(foreground), plain(background))));
}

export function checkContrast(
  foregroundName: string,
  foreground: OklchColor,
  backgroundName: string,
  background: OklchColor,
  minRatio: number,
  minApcaLc = 60,
): ContrastResult {
  const ratio = contrastRatio(foreground, background);
  const apcaLc = apcaContrast(foreground, background);
  return {
    foreground: foregroundName,
    background: backgroundName,
    ratio: Number(ratio.toFixed(2)),
    apcaLc: Number(apcaLc.toFixed(1)),
    pass: ratio >= minRatio && apcaLc >= minApcaLc,
  };
}

const RAMP_STEPS: readonly RampStep[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/** Lightness offsets from the anchor (step 500), ascending step order. */
const LIGHTNESS_OFFSETS: readonly number[] = [
  0.42, 0.36, 0.28, 0.18, 0.09, 0, -0.08, -0.16, -0.24, -0.32, -0.4,
];

/**
 * Build an 11-step OKLCH ramp landing exactly on `anchor` at step 500.
 * Chroma tapers toward both ends so near-white/near-black steps stay in gamut.
 */
export function buildRamp(anchor: OklchColor): ColorRamp {
  const ramp = {} as ColorRamp;
  RAMP_STEPS.forEach((step, index) => {
    const offset = LIGHTNESS_OFFSETS[index] ?? 0;
    const l = Math.min(0.98, Math.max(0.05, anchor.l + offset));
    // Chroma tapers linearly with distance from the anchor step: 100% at 500 → 10% at the far ends.
    const taper = 1 - (Math.abs(offset) / 0.42) * 0.9;
    const c = step === 500 ? anchor.c : anchor.c * Math.max(0.1, taper);
    ramp[step] = {
      l: Number(l.toFixed(4)),
      c: Number(c.toFixed(4)),
      h: anchor.h,
      alpha: 1,
    };
  });
  return ramp;
}
