/**
 * generate — scaffold the 3-tier token tree from bundled templates and
 * populate Tier-1 primitives from a style-spec.json (skill token-style output).
 *
 * Usage: node ./scripts/generate.mjs --spec <style-spec.json> --out <tokens-dir> [--force] [--dry-run]
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildFeedbackColors, buildRamp, dtcgColorValue } from '../../../shared/colors.js';
import {
  assertSafeOutDir,
  checkTokensProvenance,
  sha256Hex,
  writeTokensProvenance,
} from '../../../shared/guard.js';
import { fromCwd, getArg, hasFlag, isMainModule, templatePath } from '../../../shared/paths.js';
import {
  baselinePx,
  pairedLineHeights,
  radiusScale,
  rhythmScale,
  spacingScale,
  typographyScale,
} from '../../../shared/scales.js';
import { loadStyleSpec } from '../../../shared/spec.js';
import { planThemes } from '../../../shared/theme-plan.js';
import type { ColorRamp, StyleSpec, TokenGroup } from '../../../shared/types.js';

export function runGenerate(argv = process.argv.slice(2)): number {
  if (hasFlag(argv, '--help')) {
    console.log(
      'Usage: generate.mjs --spec <style-spec.json> --out <tokens-dir> [--force] [--dry-run]',
    );
    return 0;
  }

  const specPath = fromCwd(getArg(argv, '--spec', 'style-spec.json') as string);
  const outDir = fromCwd(getArg(argv, '--out', 'tokens') as string);
  const force = hasFlag(argv, '--force');
  const dryRun = hasFlag(argv, '--dry-run');

  if (!existsSync(specPath)) {
    console.error(`style-spec not found: ${specPath} (run skill token-style first)`);
    return 1;
  }
  const tamper = existsSync(outDir) ? checkTokensProvenance(outDir) : null;

  let spec: StyleSpec;
  let warnings: string[];
  try {
    const loaded = loadStyleSpec(specPath);
    spec = loaded.spec;
    warnings = loaded.warnings;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
  for (const warning of warnings) {
    console.log(`warning: ${warning}`);
  }
  const stepCount = spec.rampSteps ?? 11;
  const baseLineHeight = spec.typography.baseLineHeight ?? 1.5;
  if (dryRun) {
    const planned = planThemes(spec);
    console.log(`would generate 3-tier tokens for "${spec.name}" → ${outDir}`);
    console.log('would copy: templates/tokens/** (primitive and component templates)');
    for (const file of [
      'primitive/color.tokens.json (palette ramps, anchors on step 500)',
      'primitive/typography.tokens.json',
      'primitive/spacing.tokens.json',
      'primitive/radius.tokens.json',
    ]) {
      console.log(`would write: ${file}`);
    }
    for (const { theme } of planned) {
      console.log(`would write: semantic/${theme}.tokens.json`);
    }
    if (tamper !== null && tamper.status !== 'absent') {
      console.log(`provenance: ${tamper.status}`);
      for (const path of tamper.changed) console.log(`  changed: ${path}`);
      for (const path of tamper.missing) console.log(`  missing: ${path}`);
    }
    return 0;
  }

  const safeError = assertSafeOutDir(outDir, process.cwd());
  if (safeError !== null) {
    console.error(safeError);
    return 1;
  }

  if (existsSync(outDir)) {
    if (tamper !== null && (tamper.status === 'tampered' || tamper.status === 'unreadable')) {
      if (!force) {
        console.error(`refusing to overwrite hand-edited tokens in ${outDir}:`);
        for (const path of tamper.changed) console.error(`  changed: ${path}`);
        for (const path of tamper.missing) console.error(`  missing: ${path}`);
        console.error('pass --force to overwrite deliberately');
        return 1;
      }
      console.log('overwriting hand-edited tokens (--force)');
    } else if (tamper !== null && tamper.status === 'absent' && force) {
      console.log('adopting existing tree: no manifest found, one will be created');
    }
    if (!force) {
      console.error(`output exists: ${outDir} (pass --force to overwrite)`);
      return 1;
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

  function writeTokenFile(segments: string[], data: unknown): void {
    const filePath = join(outDir, ...segments);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
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
      neutral: rampGroup(
        buildRamp({ l: 0.6, c: spec.neutralChroma, h: spec.neutralHue }, stepCount),
      ),
      feedback: Object.fromEntries(
        Object.entries(buildFeedbackColors()).map(([role, color]) => [
          role,
          rampGroup(buildRamp(color, stepCount)),
        ]),
      ),
    },
  });

  // 3. Semantic themes are generated from the palette role→slug mapping.
  for (const { theme, data } of planThemes(spec)) {
    writeTokenFile(['semantic', `${theme}.tokens.json`], data);
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
    'line-height': pairedLineHeights(
      spec.typography.baseSizePx,
      spec.typography.ratio,
      baseLineHeight,
    ),
    rhythm: rhythmScale(baselinePx(spec.typography.baseSizePx, baseLineHeight)),
  });

  writeTokenFile(['primitive', 'spacing.tokens.json'], {
    $description: `Tier 1 — ${spec.spacingBasePx}px-base spacing (${spec.density}). Generated.`,
    spacing: spacingScale(spec.spacingBasePx, spec.density),
  });

  writeTokenFile(['primitive', 'radius.tokens.json'], {
    $description: 'Tier 1 — corner radii. Generated.',
    radius: radiusScale(spec.radius),
  });

  writeTokensProvenance(outDir, sha256Hex(readFileSync(specPath)));
  console.log(`generated 3-tier tokens for "${spec.name}" → ${outDir}`);
  console.log(
    'next: node <token-audit>/scripts/audit.mjs --tokens ' + getArg(argv, '--out', 'tokens'),
  );
  return 0;
}

if (isMainModule(import.meta.url, 'generate.mjs', 'generate.ts')) {
  process.exit(runGenerate());
}
