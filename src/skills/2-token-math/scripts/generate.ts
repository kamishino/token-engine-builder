/**
 * generate — scaffold the 3-tier token tree from bundled templates and
 * populate Tier-1 primitives from a style-spec.json (skill 1-design-style output).
 *
 * Usage: node ./scripts/generate.mjs --spec style-spec.json --out tokens [--force]
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildRamp, dtcgColorValue } from '../../../shared/colors.js';
import { fromCwd, getArg, hasFlag, templatePath } from '../../../shared/paths.js';
import { radiusScale, spacingScale, typographyScale } from '../../../shared/scales.js';
import type { ColorRamp, StyleSpec, TokenGroup } from '../../../shared/types.js';

const argv = process.argv.slice(2);

if (hasFlag(argv, '--help')) {
  console.log('Usage: generate.mjs --spec <style-spec.json> --out <tokens-dir> [--force]');
  process.exit(0);
}

const specPath = fromCwd(getArg(argv, '--spec', 'style-spec.json') as string);
const outDir = fromCwd(getArg(argv, '--out', 'tokens') as string);
const force = hasFlag(argv, '--force');

if (!existsSync(specPath)) {
  console.error(`style-spec not found: ${specPath} (run skill 1-design-style first)`);
  process.exit(1);
}
if (existsSync(outDir) && !force) {
  console.error(`output exists: ${outDir} (pass --force to overwrite)`);
  process.exit(1);
}

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

writeTokenFile(['1-primitive', 'color.tokens.json'], {
  $description: `Tier 1 — OKLCH ramps for "${spec.name}". Anchor lands on brand.500. Generated; do not hand-edit hex.`,
  color: {
    $type: 'color',
    brand: rampGroup(buildRamp(anchor)),
    neutral: rampGroup(buildRamp({ l: 0.6, c: spec.neutralChroma, h: spec.neutralHue })),
  },
});

writeTokenFile(['1-primitive', 'typography.tokens.json'], {
  $description: `Tier 1 — modular type scale (base ${spec.typography.baseSizePx}px, ratio ${spec.typography.ratio}). Generated.`,
  fontFamily: { $type: 'fontFamily', sans: { $value: spec.typography.fontFamily } },
  fontSize: typographyScale(spec.typography.baseSizePx, spec.typography.ratio),
  fontWeight: {
    $type: 'fontWeight',
    regular: { $value: 400 },
    medium: { $value: 500 },
    semibold: { $value: 600 },
    bold: { $value: 700 },
  },
});

writeTokenFile(['1-primitive', 'spacing.tokens.json'], {
  $description: `Tier 1 — ${spec.spacingBasePx}px-base spacing (${spec.density}). Generated.`,
  spacing: spacingScale(spec.spacingBasePx, spec.density),
});

writeTokenFile(['1-primitive', 'radius.tokens.json'], {
  $description: 'Tier 1 — corner radii. Generated.',
  radius: radiusScale(spec.radius),
});

console.log(`generated 3-tier tokens for "${spec.name}" → ${outDir}`);
console.log(
  'next: node <3-token-audit>/scripts/audit.mjs --tokens ' + getArg(argv, '--out', 'tokens'),
);
