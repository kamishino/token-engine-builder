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

/** A DTCG alias string, e.g. `"{color.cerulean.500}"`. */
export type TokenAlias = string;

export interface OklchColor {
  l: number;
  c: number;
  h: number;
  alpha?: number;
}

/** Ramp step label (numeric, e.g. 500); the anchor always lands on 500. */
export type RampStep = number;

export type ColorRamp = Record<number, OklchColor>;

export interface PaletteColor {
  role: 'primary' | 'secondary' | 'accent' | 'other';
  /** Color-name slug (meodai/color-names mapping), kebab-case, unique in the palette. */
  name: string;
  anchor: OklchColor;
}

export type RampStepCount = 5 | 9 | 11;

export type HarmonyMethod =
  'triadic' | 'analogous' | 'complementary' | 'split-complementary' | 'tetradic' | 'monochromatic';
export type FeedbackRole = 'success' | 'warning' | 'danger' | 'info' | 'help';

export interface CustomThemeConfig {
  /** Polarity mode: 'light' or 'dark' base mapping. */
  mode: 'light' | 'dark';
  /** Optional custom background surface step overrides (e.g. canvas: 100, surface: 200). */
  surfaceSteps?: {
    canvas?: number;
    surface?: number;
    subtle?: number;
    raised?: number;
  };
  /** Optional primary action step override. */
  actionStep?: number;
}
/** Output of design-tokens interview / token-engine init; input to token-engine generate. */
export interface StyleSpec {
  name: string;
  /** Kobayashi style cluster id the anchor was picked from, when resolved (see references/palette.md in the design-tokens skill). */
  cluster?: string;
  /** Provenance only: guidance method the agent used when picking the palette. Generate does not derive colors from it. */
  harmony?: HarmonyMethod;
  /** Creative palette (3–5 colors); token-engine generate expands each anchor to a ramp. */
  palette: PaletteColor[];
  /** Kobayashi bounds the palette was picked inside (copied from the cluster table at record time). */
  clusterBounds?: { h: [number, number]; c: [number, number]; l: [number, number] };
  /** Ramp steps per color (5, 9, or 11). Absent = 11. */
  rampSteps?: RampStepCount;
  neutralHue: number;
  neutralChroma: number;
  typography: {
    fontFamily: string;
    baseSizePx: number;
    ratio: number;
    /** Base line-height multiplier the vertical-rhythm baseline derives from. Default 1.5. */
    baseLineHeight?: number;
  };
  /** Optional guide prose recorded at spec creation time, rendered into DESIGN.md. */
  guide?: {
    overview?: string;
    dos?: string[];
    donts?: string[];
  };
  /** Durable remediation: theme → semantic dotted path → alias, applied by generate after semantic writes. */
  overrides?: Record<string, Record<string, string>>;
  /** Optional custom named themes (e.g. sepia, solarized) mapped onto light/dark polarity. */
  themes?: Record<string, CustomThemeConfig>;
  spacingBasePx: number;
  density: 'comfortable' | 'compact';
  radius: { sm: number; md: number; lg: number; full: number };
  targets: { minWcagRatio: number };
}
export type ContrastKind = 'text' | 'border' | 'decorative';

export interface RemedySuggestion {
  /** Semantic override path to change; always starts with `semantic.`. */
  path: string;
  /** Proposed alias value, e.g. `{color.neutral.700}`. */
  alias: string;
  ratio: number;
  apcaLc: number;
  side: 'foreground' | 'background';
}

export interface ContrastResult {
  foreground: string;
  background: string;
  kind: ContrastKind;
  ratio: number;
  /** Absolute APCA lightness contrast |Lc| (0–~108); polarity-independent floor value. */
  apcaLc: number;
  pass: boolean;
  suggestion?: RemedySuggestion;
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
  prefix?: string | undefined;
  /** Custom CSS selector for variable scoping (defaults to :root). */
  selector?: string | undefined;
  /** Artifact format subset: 'all' (default), 'css' (CSS/docs), or 'ts' (JS/DTS). */
  format?: 'all' | 'css' | 'ts' | undefined;
  /** Resolved theme dictionaries to include in JS/DTS output when multi-theme. */
  themeDictionaries?: Record<string, Record<string, string>> | undefined;
  /** Theme label written into the generated component specifications. */
  label?: string | undefined;
  guide?:
    | {
        name: string;
        overview?: string | undefined;
        dos?: string[] | undefined;
        donts?: string[] | undefined;
        primaryHex?: string | undefined;
        secondaryHex?: string | undefined;
        scale?: number | undefined;
        density?: string | undefined;
      }
    | undefined;
  /** Whether to emit visualizer.html for interactive visual inspection. */
  /** Suppress Style Dictionary stdout logging. */
  silent?: boolean | undefined;
  visualizer?: boolean | undefined;
}

/** Common logging sink callback for CLI and core execution. */
export type Logger = (msg: string) => void;
