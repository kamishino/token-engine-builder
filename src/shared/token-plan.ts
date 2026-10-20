import { buildFeedbackColors, buildRamp, dtcgColorValue } from './colors.js';
import {
  baselinePx,
  pairedLineHeights,
  radiusScale,
  rhythmScale,
  spacingScale,
  typographyScale,
} from './scales.js';
import { planThemes } from './theme-plan.js';
import type { ColorRamp, StyleSpec, TokenGroup } from './types.js';

export interface PlannedTokenFile {
  segments: string[];
  data: unknown;
  note?: string;
}

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

export function planTokenFiles(spec: StyleSpec): PlannedTokenFile[] {
  const stepCount = spec.rampSteps ?? 11;
  const baseLineHeight = spec.typography.baseLineHeight ?? 1.5;
  const planned: PlannedTokenFile[] = [];

  planned.push({
    segments: ['primitive', 'color.tokens.json'],
    note: 'palette ramps, anchors on step 500',
    data: {
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
    },
  });

  for (const { theme, data } of planThemes(spec)) {
    planned.push({ segments: ['semantic', `${theme}.tokens.json`], data });
  }

  planned.push({
    segments: ['primitive', 'typography.tokens.json'],
    data: {
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
    },
  });

  planned.push({
    segments: ['primitive', 'spacing.tokens.json'],
    data: {
      $description: `Tier 1 — ${spec.spacingBasePx}px-base spacing (${spec.density}). Generated.`,
      spacing: spacingScale(spec.spacingBasePx, spec.density),
    },
  });

  planned.push({
    segments: ['primitive', 'radius.tokens.json'],
    data: {
      $description: 'Tier 1 — corner radii. Generated.',
      radius: radiusScale(spec.radius),
    },
  });

  return planned;
}
