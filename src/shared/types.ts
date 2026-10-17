/**
 * W3C DTCG (Design Tokens Community Group) 3-tier token types.
 * Tier 1 primitive → Tier 2 semantic (alias only) → Tier 3 component (alias only).
 */

export type DtcgTokenType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'number'
  | 'string'
  | 'duration'
  | 'cubicBezier'
  | 'shadow';

/** DTCG color value: OKLCH is the only authoring space in this engine. */
export interface DtcgColorValue {
  colorSpace: 'oklch' | 'srgb';
  /** OKLCH: [lightness 0–1, chroma ≥0, hue 0–360]. sRGB: [r, g, b] each 0–1. */
  components: [number, number, number];
  alpha?: number;
  hex?: string;
}

export interface DtcgDimensionValue {
  value: number;
  unit: 'px' | 'rem';
}

export type DtcgValue = DtcgColorValue | DtcgDimensionValue | string | number;

export interface DesignToken {
  $value: DtcgValue;
  $type?: DtcgTokenType;
  $description?: string;
  $extensions?: Record<string, unknown>;
}

export type TokenNode = DesignToken | TokenGroup;

export interface TokenGroup {
  $type?: DtcgTokenType;
  $description?: string;
  [key: string]: TokenNode | DtcgTokenType | string | undefined;
}

/** A DTCG alias string, e.g. `"{color.brand.500}"`. */
export type TokenAlias = string;

export interface OklchColor {
  l: number;
  c: number;
  h: number;
  alpha?: number;
}

export type RampStep = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

export type ColorRamp = Record<RampStep, OklchColor>;

export type HarmonyMethod =
  'triadic' | 'analogous' | 'complementary' | 'split-complementary' | 'tetradic' | 'monochromatic';

export type FeedbackRole = 'success' | 'warning' | 'danger' | 'info' | 'help';

/** Output of skill `token-style`; input to `token-math/scripts/generate`. */
export interface StyleSpec {
  name: string;
  /** Kobayashi style cluster id the anchor was picked from, when resolved (see token-style/references/style-clusters.md). */
  cluster?: string;
  /** Optional harmony method; when set, token-math derives secondary/accent ramps. */
  harmony?: HarmonyMethod;
  brandAnchor: OklchColor;
  neutralHue: number;
  neutralChroma: number;
  typography: {
    fontFamily: string;
    baseSizePx: number;
    ratio: number;
  };
  spacingBasePx: number;
  density: 'comfortable' | 'compact';
  radius: { sm: number; md: number; lg: number; full: number };
  targets: { minWcagRatio: number };
}

export interface ContrastResult {
  foreground: string;
  background: string;
  ratio: number;
  /** Absolute APCA lightness contrast |Lc| (0–~108); polarity-independent floor value. */
  apcaLc: number;
  pass: boolean;
}

export interface AuditReport {
  pairs: ContrastResult[];
  unresolvedAliases: string[];
  rawValueViolations: string[];
  pass: boolean;
}

export interface BuildTokensOptions {
  /** Token source globs, e.g. `tokens/**\/*.tokens.json`. */
  source: string[];
  /** Output directory; trailing slash added. */
  outDir: string;
  prefix?: string;
}
