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
import { FEEDBACK_ROLES } from '../../../shared/roles.js';
import {
  baselinePx,
  pairedLineHeights,
  radiusScale,
  rhythmScale,
  spacingScale,
  typographyScale,
} from '../../../shared/scales.js';
import { GENERATED_THEMES, loadStyleSpec } from '../../../shared/spec.js';
import type { ColorRamp, StyleSpec, TokenGroup } from '../../../shared/types.js';

type ThemeName = (typeof GENERATED_THEMES)[number];
type ThemeTarget = readonly [string, number];
interface ThemeConfig {
  targets: Record<string, ThemeTarget>;
  feedback: readonly [number, number];
}

const THEME_REGISTRY: Record<ThemeName, ThemeConfig> = {
  light: {
    targets: {
      canvas: ['neutral', 50],
      surface: ['neutral', 100],
      subtle: ['neutral', 200],
      raised: ['primary', 50],
      textPrimary: ['neutral', 900],
      textSecondary: ['neutral', 700],
      textTertiary: ['neutral', 600],
      textDisabled: ['neutral', 400],
      textInverse: ['neutral', 50],
      textLink: ['primary', 800],
      action: ['primary', 800],
      actionHover: ['primary', 900],
      actionText: ['neutral', 50],
      borderSubtle: ['neutral', 200],
      borderDefault: ['neutral', 300],
      borderStrong: ['neutral', 500],
      borderFocus: ['primary', 700],
    },
    feedback: [100, 800],
  },
  dark: {
    targets: {
      canvas: ['neutral', 950],
      surface: ['neutral', 900],
      subtle: ['neutral', 800],
      raised: ['primary', 950],
      textPrimary: ['neutral', 50],
      textSecondary: ['neutral', 300],
      textTertiary: ['neutral', 300],
      textDisabled: ['neutral', 500],
      textInverse: ['neutral', 900],
      textLink: ['primary', 100],
      action: ['primary', 100],
      actionHover: ['primary', 50],
      actionText: ['neutral', 950],
      borderSubtle: ['neutral', 800],
      borderDefault: ['neutral', 700],
      borderStrong: ['neutral', 500],
      borderFocus: ['primary', 100],
    },
    feedback: [800, 100],
  },
  'high-contrast': {
    targets: {
      canvas: ['neutral', 50],
      surface: ['neutral', 50],
      subtle: ['neutral', 100],
      raised: ['primary', 100],
      textPrimary: ['neutral', 950],
      textSecondary: ['neutral', 900],
      textTertiary: ['neutral', 800],
      textDisabled: ['neutral', 600],
      textInverse: ['neutral', 50],
      textLink: ['primary', 800],
      action: ['primary', 800],
      actionHover: ['primary', 900],
      actionText: ['neutral', 50],
      borderSubtle: ['neutral', 500],
      borderDefault: ['neutral', 700],
      borderStrong: ['neutral', 900],
      borderFocus: ['primary', 800],
    },
    feedback: [100, 900],
  },
};

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
    console.log(`would generate 3-tier tokens for "${spec.name}" → ${outDir}`);
    console.log('would copy: templates/tokens/** (semantic/component aliases, tier templates)');
    for (const file of [
      'primitive/color.tokens.json',
      'primitive/typography.tokens.json',
      'primitive/spacing.tokens.json',
      'primitive/radius.tokens.json',
    ]) {
      console.log(`would write: ${file} (anchor lands on step 500)`);
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
  function colorAlias(family: string, targetStep: number): { $value: string; $type: 'color' } {
    return { $value: `{color.${family}.${pickStep(targetStep)}}`, $type: 'color' };
  }

  const allThemes: Record<string, ThemeConfig> = Object.fromEntries(
    GENERATED_THEMES.map((name) => [
      name,
      { targets: { ...THEME_REGISTRY[name].targets }, feedback: THEME_REGISTRY[name].feedback },
    ]),
  );

  if (spec.themes !== undefined) {
    for (const [customName, customConfig] of Object.entries(spec.themes)) {
      const baseMode = customConfig.mode as ThemeName;
      const base = THEME_REGISTRY[baseMode];
      if (base === undefined) throw new Error(`unknown theme mode: ${customConfig.mode}`);
      const baseTargets = { ...base.targets };
      const baseFeedback = base.feedback;

      if (customConfig.surfaceSteps !== undefined) {
        if (customConfig.surfaceSteps.canvas !== undefined)
          baseTargets['canvas'] = ['neutral', customConfig.surfaceSteps.canvas];
        if (customConfig.surfaceSteps.surface !== undefined)
          baseTargets['surface'] = ['neutral', customConfig.surfaceSteps.surface];
        if (customConfig.surfaceSteps.subtle !== undefined)
          baseTargets['subtle'] = ['neutral', customConfig.surfaceSteps.subtle];
        if (customConfig.surfaceSteps.raised !== undefined)
          baseTargets['raised'] = ['primary', customConfig.surfaceSteps.raised];
      }
      if (customConfig.actionStep !== undefined) {
        baseTargets['action'] = ['primary', customConfig.actionStep];
      }
      allThemes[customName] = { targets: baseTargets, feedback: baseFeedback };
    }
  }

  for (const [theme, config] of Object.entries(allThemes)) {
    const targets = config.targets;
    const resolveTarget = (key: string): { $value: string; $type: 'color' } => {
      const target = targets[key];
      if (target === undefined) throw new Error(`theme ${theme}: unknown semantic target "${key}"`);
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
            subtle: resolveTarget('subtle'),
            raised: resolveTarget('raised'),
          },
          text: {
            primary: resolveTarget('textPrimary'),
            secondary: resolveTarget('textSecondary'),
            tertiary: resolveTarget('textTertiary'),
            disabled: resolveTarget('textDisabled'),
            inverse: resolveTarget('textInverse'),
            link: resolveTarget('textLink'),
          },
          action: {
            primary: resolveTarget('action'),
            'primary-hover': resolveTarget('actionHover'),
            'primary-text': resolveTarget('actionText'),
          },
          border: {
            subtle: resolveTarget('borderSubtle'),
            default: resolveTarget('borderDefault'),
            strong: resolveTarget('borderStrong'),
            focus: resolveTarget('borderFocus'),
          },
          feedback: Object.fromEntries(
            FEEDBACK_ROLES.map((role) => {
              const fb = config.feedback;
              return [
                role,
                {
                  bg: colorAlias(`feedback.${role}`, fb[0]),
                  text: colorAlias(`feedback.${role}`, fb[1]),
                },
              ];
            }),
          ),
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

  // Durable remediation: spec overrides are applied into the generated semantic
  // files (before the provenance manifest is hashed, so they survive regeneration).
  if (spec.overrides !== undefined) {
    for (const [theme, paths] of Object.entries(spec.overrides)) {
      const filePath = join(outDir, 'semantic', `${theme}.tokens.json`);
      const json = JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
      for (const [path, alias] of Object.entries(paths)) {
        const segments = path.split('.');
        let node = json as Record<string, unknown>;
        for (const segment of segments.slice(0, -1)) {
          const next = node[segment];
          if (next === null || typeof next !== 'object') node[segment] = {};
          node = node[segment] as Record<string, unknown>;
        }
        node[segments[segments.length - 1] as string] = { $value: alias };
      }
      writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
      console.log(`applied ${Object.keys(paths).length} override(s) to semantic/${theme}`);
    }
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
