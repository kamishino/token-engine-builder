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
  buildHarmony,
  buildRamp,
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
  lineHeightScale,
  radiusScale,
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
const anchor = spec.brandAnchor;
if (
  typeof anchor?.l !== 'number' ||
  anchor.l < 0 ||
  anchor.l > 1 ||
  typeof anchor.c !== 'number' ||
  typeof anchor.h !== 'number' ||
  anchor.h < 0 ||
  anchor.h > 360
) {
  console.error('invalid style-spec: brandAnchor must be OKLCH { l: 0–1, c: ≥0, h: 0–360 }');
  process.exit(1);
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
function rampGroup(ramp: ColorRamp): TokenGroup {
  const group: TokenGroup = {};
  for (const [step, color] of Object.entries(ramp)) {
    group[step] = { $value: dtcgColorValue(color), $type: 'color' };
  }
  return group;
}

function writeTokenFile(segments: string[], data: unknown): void {
  writeFileSync(join(outDir, ...segments), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

writeTokenFile(['primitive', 'color.tokens.json'], {
  $description: `Tier 1 — OKLCH ramps for "${spec.name}". Anchor lands on brand.500. Generated; do not hand-edit hex.`,
  color: {
    $type: 'color',
    brand: rampGroup(buildRamp(anchor)),
    neutral: rampGroup(buildRamp({ l: 0.6, c: spec.neutralChroma, h: spec.neutralHue })),
    ...(spec.harmony === undefined
      ? {}
      : Object.fromEntries(
          buildHarmony(anchor, spec.harmony).map((color, index) => [
            index === 0 ? 'secondary' : 'accent',
            rampGroup(buildRamp(color)),
          ]),
        )),
    feedback: Object.fromEntries(
      Object.entries(buildFeedbackColors()).map(([role, color]) => [
        role,
        { $value: dtcgColorValue(color), $type: 'color' },
      ]),
    ),
  },
});

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
  'line-height': lineHeightScale(),
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
