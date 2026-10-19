/**
 * generate — scaffold the 3-tier token tree from bundled templates and
 * populate Tier-1 primitives from a style-spec.json (skill token-style output).
 *
 * Usage: node ./scripts/generate.mjs --spec style-spec.json --out tokens [--force]
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildFeedbackColors,
  buildRamp,
  clampToSrgb,
  dtcgColorValue,
} from '../../../shared/colors.js';
import {
  assertSafeOutDir,
  checkTampered,
  collectHashes,
  sha256Hex,
  writeManifest,
} from '../../../shared/guard.js';
import { fromCwd, getArg, hasFlag, templatePath } from '../../../shared/paths.js';
import {
  baselinePx,
  pairedLineHeights,
  radiusScale,
  rhythmScale,
  spacingScale,
  typographyScale,
} from '../../../shared/scales.js';
import type { ColorRamp, HarmonyMethod, StyleSpec, TokenGroup } from '../../../shared/types.js';

const argv = process.argv.slice(2);

if (hasFlag(argv, '--help')) {
  console.log(
    'Usage: generate.mjs --spec <style-spec.json> --out <tokens-dir> [--force] [--dry-run]',
  );
  process.exit(0);
}

const specPath = fromCwd(getArg(argv, '--spec', 'style-spec.json') as string);
const outDir = fromCwd(getArg(argv, '--out', 'tokens') as string);
const force = hasFlag(argv, '--force');
const dryRun = hasFlag(argv, '--dry-run');

if (!existsSync(specPath)) {
  console.error(`style-spec not found: ${specPath} (run skill token-style first)`);
  process.exit(1);
}
const MANIFEST_NAME = '.token-engine-tokens-manifest.json';
const manifestPath = join(outDir, MANIFEST_NAME);
const tamper = existsSync(outDir) ? checkTampered(manifestPath, outDir, [MANIFEST_NAME]) : null;

const spec = JSON.parse(readFileSync(specPath, 'utf8')) as StyleSpec;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
if (!Array.isArray(spec.palette) || spec.palette.length < 3 || spec.palette.length > 5) {
  console.error('invalid style-spec: palette must contain 3–5 colors');
  process.exit(1);
}
if (spec.palette.filter((entry) => entry.role === 'primary').length !== 1) {
  console.error('invalid style-spec: palette must contain exactly one primary color');
  process.exit(1);
}
const paletteNames = new Set<string>();
for (const entry of spec.palette) {
  if (!SLUG_PATTERN.test(entry.name) || paletteNames.has(entry.name)) {
    console.error(
      `invalid style-spec: palette name "${entry.name}" must be a unique kebab-case slug`,
    );
    process.exit(1);
  }
  paletteNames.add(entry.name);
  const a = entry.anchor;
  if (
    typeof a?.l !== 'number' ||
    a.l < 0 ||
    a.l > 1 ||
    typeof a.c !== 'number' ||
    typeof a.h !== 'number' ||
    a.h < 0 ||
    a.h > 360
  ) {
    console.error(
      `invalid style-spec: palette "${entry.name}" anchor must be OKLCH { l: 0–1, c: ≥0, h: 0–360 }`,
    );
    process.exit(1);
  }
}
if (spec.rampSteps !== undefined && ![5, 9, 11].includes(spec.rampSteps)) {
  console.error('invalid style-spec: rampSteps must be 5, 9, or 11');
  process.exit(1);
}
const stepCount = spec.rampSteps ?? 11;
for (const entry of spec.palette) {
  const clamped = clampToSrgb(entry.anchor);
  if (clamped.c !== entry.anchor.c) {
    console.log(
      `warning: anchor for ${entry.name} clamped to sRGB (chroma ${entry.anchor.c} → ${clamped.c})`,
    );
  }
}
if (!spec.typography || !(spec.typography.ratio > 1) || !(spec.typography.baseSizePx > 0)) {
  console.error('invalid style-spec: typography.baseSizePx > 0 and typography.ratio > 1 required');
  process.exit(1);
}

const HARMONY_METHODS: readonly HarmonyMethod[] = [
  'triadic',
  'analogous',
  'complementary',
  'split-complementary',
  'tetradic',
  'monochromatic',
];
if (spec.harmony !== undefined && !HARMONY_METHODS.includes(spec.harmony)) {
  console.error(`invalid style-spec: harmony must be one of ${HARMONY_METHODS.join(', ')}`);
  process.exit(1);
}

if (dryRun) {
  console.log(`would generate 3-tier tokens for "${spec.name}" → ${outDir}`);
  console.log('would copy: templates/tokens/** (semantic/component aliases, tier templates)');
  for (const file of [
    'primitive/color.tokens.json',
    'primitive/typography.tokens.json',
    'primitive/spacing.tokens.json',
    'primitive/radius.tokens.json',
  ]) {
    console.log(`would write: ${file} (anchor lands on brand.500)`);
  }
  if (tamper !== null && tamper.status !== 'absent') {
    console.log(`provenance: ${tamper.status}`);
    for (const path of tamper.changed) console.log(`  changed: ${path}`);
    for (const path of tamper.missing) console.log(`  missing: ${path}`);
  }
  process.exit(0);
}

const safeError = assertSafeOutDir(outDir, process.cwd());
if (safeError !== null) {
  console.error(safeError);
  process.exit(1);
}

if (existsSync(outDir)) {
  if (tamper !== null && (tamper.status === 'tampered' || tamper.status === 'unreadable')) {
    if (!force) {
      console.error(`refusing to overwrite hand-edited tokens in ${outDir}:`);
      for (const path of tamper.changed) console.error(`  changed: ${path}`);
      for (const path of tamper.missing) console.error(`  missing: ${path}`);
      console.error('pass --force to overwrite deliberately');
      process.exit(1);
    }
    console.log('overwriting hand-edited tokens (--force)');
  } else if (tamper !== null && tamper.status === 'absent' && force) {
    console.log('adopting existing tree: no manifest found, one will be created');
  }
  if (!force) {
    console.error(`output exists: ${outDir} (pass --force to overwrite)`);
    process.exit(1);
  }
}

console.log(`writing tokens → ${outDir}`);

// 1. Scaffold: copy bundled templates/tokens/** → --out (portable via import.meta.url).
mkdirSync(outDir, { recursive: true });
cpSync(templatePath(import.meta.url, 'tokens'), outDir, { recursive: true, force: true });

// 2. Populate Tier-1 primitives from the spec; tiers 2–3 stay alias-only templates.
function rampGroup(ramp: ColorRamp, description?: string): TokenGroup {
  const group: TokenGroup = {};
  for (const [step, color] of Object.entries(ramp)) {
    group[step] = {
      $value: dtcgColorValue(color),
      $type: 'color',
      ...(description === undefined ? {} : { $description: description }),
    };
  }
  return group;
}

const primaryEntry = spec.palette.find(
  (entry) => entry.role === 'primary',
) as (typeof spec.palette)[number];
const rampSteps = Object.keys(buildRamp(primaryEntry.anchor, stepCount)).map(Number);

/** Nearest available ramp step to a semantic target; ties choose the larger (darker) step. */
function pickStep(target: number): number {
  return rampSteps.reduce((best, step) =>
    Math.abs(step - target) < Math.abs(best - target) ||
    (Math.abs(step - target) === Math.abs(best - target) && step > best)
      ? step
      : best,
  );
}

function writeTokenFile(segments: string[], data: unknown): void {
  writeFileSync(join(outDir, ...segments), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

writeTokenFile(['primitive', 'color.tokens.json'], {
  $description: `Tier 1 — palette ramps for "${spec.name}" (${stepCount} steps, anchors on step 500). Generated; do not hand-edit hex.`,
  color: {
    $type: 'color',
    white: { $value: dtcgColorValue({ l: 1, c: 0, h: 0, alpha: 1 }), $type: 'color' },
    black: { $value: dtcgColorValue({ l: 0, c: 0, h: 0, alpha: 1 }), $type: 'color' },
    ...Object.fromEntries(
      spec.palette.map((entry) => [
        entry.name,
        rampGroup(buildRamp(entry.anchor, stepCount), `${entry.role} — ${entry.name}`),
      ]),
    ),
    neutral: rampGroup(buildRamp({ l: 0.6, c: spec.neutralChroma, h: spec.neutralHue }, stepCount)),
    feedback: Object.fromEntries(
      Object.entries(buildFeedbackColors()).map(([role, color]) => [
        role,
        rampGroup(buildRamp(color, stepCount)),
      ]),
    ),
  },
});

// 3. Semantic themes are generated from the palette role→slug mapping.
function colorAlias(family: string, targetStep: number): { $value: string; $type: 'color' } {
  return { $value: `{color.${family}.${pickStep(targetStep)}}`, $type: 'color' };
}

const SEMANTIC_TARGETS: Record<string, Record<string, readonly [string, number]>> = {
  light: {
    canvas: ['neutral', 50],
    surface: ['neutral', 100],
    raised: ['primary', 50],
    textPrimary: ['neutral', 900],
    textSecondary: ['neutral', 700],
    textInverse: ['neutral', 50],
    action: ['primary', 700],
    actionHover: ['primary', 800],
    actionText: ['neutral', 50],
    borderDefault: ['neutral', 300],
    borderStrong: ['neutral', 500],
  },
  dark: {
    canvas: ['neutral', 950],
    surface: ['neutral', 900],
    raised: ['primary', 950],
    textPrimary: ['neutral', 50],
    textSecondary: ['neutral', 300],
    textInverse: ['neutral', 900],
    action: ['primary', 100],
    actionHover: ['primary', 50],
    actionText: ['neutral', 950],
    borderDefault: ['neutral', 700],
    borderStrong: ['neutral', 500],
  },
  'high-contrast': {
    canvas: ['neutral', 50],
    surface: ['neutral', 50],
    raised: ['primary', 100],
    textPrimary: ['neutral', 950],
    textSecondary: ['neutral', 900],
    textInverse: ['neutral', 50],
    action: ['primary', 800],
    actionHover: ['primary', 900],
    actionText: ['neutral', 50],
    borderDefault: ['neutral', 700],
    borderStrong: ['neutral', 900],
  },
};

for (const [theme, targets] of Object.entries(SEMANTIC_TARGETS)) {
  const resolveTarget = (key: string): { $value: string; $type: 'color' } => {
    const target = targets[key] as readonly [string, number];
    return colorAlias(target[0] === 'primary' ? primaryEntry.name : target[0], target[1]);
  };
  writeTokenFile(['semantic', `${theme}.tokens.json`], {
    $description: `Tier 2 — semantic roles, ${theme.toUpperCase()} theme. Generated from the spec palette; aliases only.`,
    semantic: {
      color: {
        $type: 'color',
        bg: {
          canvas: resolveTarget('canvas'),
          surface: resolveTarget('surface'),
          raised: resolveTarget('raised'),
        },
        text: {
          primary: resolveTarget('textPrimary'),
          secondary: resolveTarget('textSecondary'),
          inverse: resolveTarget('textInverse'),
        },
        action: {
          primary: resolveTarget('action'),
          'primary-hover': resolveTarget('actionHover'),
          'primary-text': resolveTarget('actionText'),
        },
        border: {
          default: resolveTarget('borderDefault'),
          strong: resolveTarget('borderStrong'),
        },
      },
    },
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
  });
}

writeTokenFile(['primitive', 'typography.tokens.json'], {
  $description: `Tier 1 — modular type scale (base ${spec.typography.baseSizePx}px, ratio ${spec.typography.ratio}). Generated.`,
  'font-family': { $type: 'fontFamily', sans: { $value: spec.typography.fontFamily } },
  'font-size': typographyScale(spec.typography.baseSizePx, spec.typography.ratio),
  'font-weight': {
    $type: 'fontWeight',
    regular: { $value: 400 },
    medium: { $value: 500 },
    semibold: { $value: 600 },
    bold: { $value: 700 },
  },
  'line-height': pairedLineHeights(spec.typography.baseSizePx, spec.typography.ratio),
  rhythm: rhythmScale(baselinePx(spec.typography.baseSizePx)),
});

writeTokenFile(['primitive', 'spacing.tokens.json'], {
  $description: `Tier 1 — ${spec.spacingBasePx}px-base spacing (${spec.density}). Generated.`,
  spacing: spacingScale(spec.spacingBasePx, spec.density),
});

writeTokenFile(['primitive', 'radius.tokens.json'], {
  $description: 'Tier 1 — corner radii. Generated.',
  radius: radiusScale(spec.radius),
});

writeManifest(manifestPath, {
  version: 1,
  kind: 'tokens',
  generator: 'token-engine-builder',
  inputHash: sha256Hex(readFileSync(specPath)),
  files: collectHashes(outDir, [MANIFEST_NAME]),
});
console.log(`generated 3-tier tokens for "${spec.name}" → ${outDir}`);
console.log(
  'next: node <token-audit>/scripts/audit.mjs --tokens ' + getArg(argv, '--out', 'tokens'),
);
