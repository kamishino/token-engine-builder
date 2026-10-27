/**
 * extract — scan an existing project (CSS/SCSS/JSON/JS/TS/HTML) for color,
 * font, and radius signals and write a candidate tokens.config.json.
 *
 * Extraction is evidence, not migration: nothing scanned is modified, and
 * the candidate must pass design-tokens read-back before generation runs.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';
import type { PreAuditBaseline, RawColorPair } from './audit-report.js';
import { usageText } from './cli-flags.js';
import { COLOR_NAME_PREFIXES, nearestColorName } from './color-names.js';
import {
  buildHarmony,
  checkContrast,
  clampToSrgb,
  formatOklch,
  oklchToHex,
  parseToOklch,
} from './colors.js';
import { decideWrite } from './guard.js';
import { fromCwd, getArg, hasFlag } from './paths.js';
import { validateStyleSpec } from './spec.js';
import { EXIT } from './exit-codes.js';
import type { Logger, OklchColor, StyleSpec } from './types.js';

export interface DesignFrontmatter {
  primary?: string;
  secondary?: string;
  fontSans?: string;
  scale?: number;
  rounded?: { sm: number; md: number; lg: number };
  density?: string;
  components: string[];
  source: string;
}

export interface ColorCandidate {
  color: OklchColor;
  score: number;
  count: number;
  source: string;
  name: string;
}

export interface ExtractionEvidence {
  candidates: ColorCandidate[];
  tailwindColors: Map<string, { role: string; color: OklchColor }>;
  fontFamily?: string;
  radiusCounts: Map<number, number>;
  frontmatter?: DesignFrontmatter;
  projectName: string;
}

export interface ComposedSpec {
  spec: StyleSpec;
  notes: string[];
}

export type ColorRole = 'primary' | 'secondary' | 'accent';

/** Classify a Tailwind colour name (v3 config key or v4 custom-property name) into a palette role. */
export function roleForColorName(name: string): ColorRole | undefined {
  const normalized = name
    .toLowerCase()
    .replace(/^--/, '')
    .replace(/^color-/, '')
    .replace(/-\d+$/, '');
  if (normalized === 'primary' || normalized === 'brand') return 'primary';
  if (normalized === 'secondary') return 'secondary';
  if (normalized === 'accent') return 'accent';
  return undefined;
}

function rememberRole(
  role: ColorRole,
  color: OklchColor,
  map: Map<string, { role: string; color: OklchColor }>,
): void {
  if (!map.has(role)) map.set(role, { role, color });
}

/** Aggregate candidate weight: score + 2× occurrence count. */
export function candidateWeight(candidate: ColorCandidate): number {
  return candidate.score + candidate.count * 2;
}

/** Rank candidates by weight: highest first. */
export function rankCandidates(candidates: Iterable<ColorCandidate>): ColorCandidate[] {
  return [...candidates].sort((a, b) => candidateWeight(b) - candidateWeight(a));
}

export function composeStyleSpec(evidence: ExtractionEvidence): ComposedSpec | null {
  const ranked = rankCandidates(evidence.candidates);
  const top = ranked[0];
  const designFrontmatter = evidence.frontmatter;
  if (top === undefined && designFrontmatter?.primary === undefined) {
    return null;
  }

  function toAnchor(color: OklchColor): OklchColor {
    return {
      l: Number(color.l.toFixed(4)),
      c: Number(color.c.toFixed(4)),
      h: Number(color.h.toFixed(2)),
      alpha: 1,
    };
  }

  const notes: string[] = [];
  let fmPrimary: OklchColor | undefined;
  let fmSecondary: OklchColor | undefined;
  if (designFrontmatter !== undefined) {
    try {
      if (designFrontmatter.primary !== undefined)
        fmPrimary = toAnchor(parseToOklch(designFrontmatter.primary));
      if (designFrontmatter.secondary !== undefined)
        fmSecondary = toAnchor(parseToOklch(designFrontmatter.secondary));
    } catch {
      fmPrimary = undefined;
      fmSecondary = undefined;
    }
    if (fmPrimary !== undefined) {
      notes.push(
        `frontmatter: colors.primary (${designFrontmatter.primary}) from ${designFrontmatter.source}`,
      );
      if (fmSecondary !== undefined)
        notes.push(`frontmatter: colors.secondary (${designFrontmatter.secondary})`);
      if (designFrontmatter.components.length > 0)
        notes.push(
          `frontmatter: components noted, not ingested (${designFrontmatter.components.join(', ')})`,
        );
    }
  }

  const radiusMd = [...evidence.radiusCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 8;
  const primaryCand = evidence.tailwindColors.get('primary')?.color;
  const secondaryCand = evidence.tailwindColors.get('secondary')?.color;
  const accentCand = evidence.tailwindColors.get('accent')?.color;
  const anchor: OklchColor =
    fmPrimary ?? (primaryCand ? toAnchor(primaryCand) : toAnchor((top as ColorCandidate).color));
  const resolvedSecondary: OklchColor | undefined =
    fmSecondary ?? (secondaryCand ? toAnchor(secondaryCand) : undefined);
  const resolvedAccent: OklchColor | undefined = accentCand ? toAnchor(accentCand) : undefined;
  const usedNames = new Set<string>();
  const PREFIXES = COLOR_NAME_PREFIXES;
  function uniqueName(color: OklchColor): string {
    const base = nearestColorName(color);
    if (!usedNames.has(base)) {
      usedNames.add(base);
      return base;
    }
    for (const prefix of PREFIXES) {
      const candidate = `${prefix}-${base}`;
      if (!usedNames.has(candidate)) {
        usedNames.add(candidate);
        return candidate;
      }
    }
    let counter = 2;
    while (usedNames.has(`${base}-${counter}`)) {
      counter++;
    }
    const fallback = `${base}-${counter}`;
    usedNames.add(fallback);
    return fallback;
  }

  type PaletteEntry = StyleSpec['palette'][number];
  const palette: PaletteEntry[] = [{ role: 'primary', name: uniqueName(anchor), anchor }];
  if (resolvedSecondary !== undefined)
    palette.push({
      role: 'secondary',
      name: uniqueName(resolvedSecondary),
      anchor: resolvedSecondary,
    });
  if (resolvedAccent !== undefined && palette.length < 3) {
    palette.push({
      role: 'accent',
      name: uniqueName(resolvedAccent),
      anchor: resolvedAccent,
    });
  }
  let usedHarmony = false;
  for (const derivedColor of buildHarmony(anchor, 'analogous')) {
    if (palette.length >= 3) break;
    usedHarmony = true;
    palette.push({
      role: palette.length === 1 ? 'secondary' : 'accent',
      name: uniqueName(derivedColor),
      anchor: derivedColor,
    });
  }

  const spec: StyleSpec = {
    name: evidence.projectName,
    ...(usedHarmony ? { harmony: 'analogous' as const } : {}),
    palette,
    rampSteps: 11,
    neutralHue: anchor.h,
    neutralChroma: 0.012,
    typography: {
      fontFamily:
        designFrontmatter?.fontSans ?? evidence.fontFamily ?? 'Inter, system-ui, sans-serif',
      baseSizePx: 16,
      ratio: designFrontmatter?.scale ?? 1.25,
    },
    spacingBasePx: 4,
    density:
      designFrontmatter?.density === 'compact' || designFrontmatter?.density === 'comfortable'
        ? designFrontmatter.density
        : 'comfortable',
    radius:
      designFrontmatter?.rounded === undefined
        ? {
            sm: Math.max(0, Math.round(radiusMd / 2)),
            md: Math.round(radiusMd),
            lg: Math.round(radiusMd * 2),
            full: 9999,
          }
        : { ...designFrontmatter.rounded, full: 9999 },
    targets: { minWcagRatio: 4.5 },
  };

  return { spec, notes };
}

export interface ScanState {
  candidates: Map<string, ColorCandidate>;
  fontFamily: string | undefined;
  radiusCounts: Map<number, number>;
  tailwindColors: Map<string, { role: string; color: OklchColor }>;
  frontmatter: DesignFrontmatter | undefined;
}

export function createScanState(): ScanState {
  return {
    candidates: new Map(),
    fontFamily: undefined,
    radiusCounts: new Map(),
    tailwindColors: new Map(),
    frontmatter: undefined,
  };
}

const NAMED_COLOR =
  /([A-Za-z0-9_-]+)["']?\s*:\s*["']?(#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|oklch\([^)]*\)|rgba?\([^)]*\))/g;
const BARE_COLOR = /(#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|oklch\([^)]*\))/g;

export function nameScore(name: string): number {
  const n = name.toLowerCase();
  if (/(brand|primary|accent)/.test(n)) return 60;
  if (/(main|cta|link|button)/.test(n)) return 20;
  if (/(bg|background|surface|text|border|base)/.test(n)) return -40;
  return 0;
}

export function parseDesignFrontmatter(text: string, rel: string): DesignFrontmatter | undefined {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (block?.[1] === undefined) return undefined;
  const fm = block[1];
  const pick = (pattern: RegExp): string | undefined => pattern.exec(fm)?.[1];
  const colorOf = (key: string): string | undefined =>
    pick(new RegExp(`"?${key}"?\\s*:\\s*["']((?:#[0-9a-fA-F]{3,8})|oklch\\([^)]*\\))["']`));
  const rounded: DesignFrontmatter['rounded'] = (() => {
    const sm = pick(/"?sm"?\s*:\s*["']([0-9.]+)px["']/);
    const md = pick(/"?md"?\s*:\s*["']([0-9.]+)px["']/);
    const lg = pick(/"?lg"?\s*:\s*["']([0-9.]+)px["']/);
    return sm !== undefined && md !== undefined && lg !== undefined
      ? { sm: Number(sm), md: Number(md), lg: Number(lg) }
      : undefined;
  })();
  const componentsRaw = pick(/components:\s*\[([^\]]*)\]/);
  const primary = colorOf('primary');
  const secondary = colorOf('secondary');
  const fontSans = pick(/"?fontSans"?\s*:\s*["']([^"']+)["']/);
  const scaleRaw = Number(pick(/"?scale"?\s*:\s*["']?([0-9.]+)["']?/)) || undefined;
  const density = pick(/"?density"?\s*:\s*["'](\w+)["']/);
  return {
    ...(primary === undefined ? {} : { primary }),
    ...(secondary === undefined ? {} : { secondary }),
    ...(fontSans === undefined ? {} : { fontSans }),
    ...(scaleRaw === undefined ? {} : { scale: scaleRaw }),
    ...(rounded === undefined ? {} : { rounded }),
    ...(density === undefined ? {} : { density }),
    components:
      componentsRaw === undefined
        ? []
        : componentsRaw
            .split(',')
            .map((s) => s.trim().replaceAll(/["']/g, ''))
            .filter(Boolean),
    source: rel,
  };
}

export function recordCandidate(
  state: ScanState,
  raw: string,
  name: string,
  relSource: string,
): void {
  let color: OklchColor;
  try {
    color = parseToOklch(raw);
  } catch {
    return;
  }
  const key = formatOklch(color);
  const existing = state.candidates.get(key);
  const score =
    nameScore(name) +
    (color.c < 0.03 ? -50 : color.c * 100) +
    (color.l >= 0.35 && color.l <= 0.75 ? 20 : -20);
  if (existing === undefined) {
    state.candidates.set(key, { color, score, count: 1, source: relSource, name });
  } else {
    existing.count += 1;
    existing.score = Math.max(existing.score, score);
  }
}

export function captureTypographySignals(state: ScanState, text: string): void {
  if (state.fontFamily === undefined) {
    const font = /font-family\s*:\s*([^;}{]+)/i.exec(text);
    if (font?.[1] !== undefined) state.fontFamily = font[1].replaceAll(/["']/g, '').trim();
  }
  for (const match of text.matchAll(/border-radius\s*:\s*([0-9.]+)px/g)) {
    if (match[1] !== undefined) {
      const value = Number(match[1]);
      state.radiusCounts.set(value, (state.radiusCounts.get(value) ?? 0) + 1);
    }
  }
}

function recordRoleColor(state: ScanState, roleOrName: string, color: OklchColor): void {
  const role = roleForColorName(roleOrName);
  if (role !== undefined) rememberRole(role, color, state.tailwindColors);
}

function extractTailwindConfig(text: string, relSource: string, state: ScanState): void {
  const colorBlockMatch = /colors\s*:\s*\{((?:[^{}]|\{[^{}]*\})*)\}/s.exec(text);
  if (colorBlockMatch?.[1] !== undefined) {
    const block = colorBlockMatch[1];
    const entryRegex = /([a-zA-Z0-9_-]+)\s*:\s*(?:\{([^}]+)\}|["']([^"']+)["'])/g;
    for (const match of block.matchAll(entryRegex)) {
      const roleOrName = (match[1] || '').toLowerCase();
      const nested = match[2];
      const direct = match[3];
      if (direct) {
        try {
          const col = parseToOklch(direct);
          recordCandidate(state, direct, roleOrName, relSource);
          recordRoleColor(state, roleOrName, col);
        } catch {
          /* skip */
        }
      } else if (nested) {
        const shade500 = /(?:500|DEFAULT)\s*:\s*["']([^"']+)["']/.exec(nested);
        const anyShade = /(?:[0-9]{2,3})\s*:\s*["']([^"']+)["']/.exec(nested);
        const target = shade500?.[1] || anyShade?.[1];
        if (target) {
          try {
            const col = parseToOklch(target);
            recordCandidate(state, target, roleOrName, relSource);
            recordRoleColor(state, roleOrName, col);
          } catch {
            /* skip */
          }
        }
      }
    }
  }
}

function extractCssColorVariables(text: string, relSource: string, state: ScanState): void {
  for (const match of text.matchAll(/--color-([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g)) {
    const varName = `--color-${match[1]}`;
    const val = (match[2] || '').trim();
    try {
      const col = parseToOklch(val);
      recordCandidate(state, val, varName, relSource);
      recordRoleColor(state, varName, col);
    } catch {
      /* skip */
    }
  }
}

export function scanTextColors(text: string, relSource: string, state: ScanState): void {
  for (const match of text.matchAll(NAMED_COLOR)) {
    if (match[1] !== undefined && match[2] !== undefined)
      recordCandidate(state, match[2], match[1], relSource);
  }
  for (const match of text.matchAll(BARE_COLOR)) {
    if (match[1] !== undefined) recordCandidate(state, match[1], '', relSource);
  }
  captureTypographySignals(state, text);
}

export function scanFile(text: string, relSource: string, state: ScanState): void {
  if (relSource.includes('tailwind.config')) extractTailwindConfig(text, relSource, state);
  if (relSource.endsWith('.css') || relSource.endsWith('.scss'))
    extractCssColorVariables(text, relSource, state);
  if (relSource.endsWith('.md')) {
    const parsed = parseDesignFrontmatter(text, relSource);
    if (parsed !== undefined && parsed.primary !== undefined) {
      if (state.frontmatter === undefined) state.frontmatter = parsed;
      return;
    }
  }
  scanTextColors(text, relSource, state);
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'release', 'coverage', '.next']);
const SCAN_EXTS = new Set(['.css', '.scss', '.json', '.ts', '.tsx', '.js', '.jsx', '.html', '.md']);

/** Deterministic source walk: skips build dirs and non-source extensions. */
export function findSourceFiles(rootDir: string): string[] {
  return readdirSync(rootDir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const path = join(rootDir, entry.name);
      if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : findSourceFiles(path);
      return SCAN_EXTS.has(extname(entry.name)) ? [path] : [];
    });
}

export interface RenderedCapture {
  colors: Array<[string, number]>;
  fonts: Array<[string, number]>;
  radii: Array<[string, number]>;
}

export type CapturePage = (target: { url?: string; html?: string }) => Promise<RenderedCapture>;

export interface RenderedTarget {
  url?: string;
  /** File contents when `--html` is used; also the fallback text source. */
  html?: string;
  sourceName?: string;
}

interface PlaywrightPage {
  goto: (url: string, options: { waitUntil: string; timeout: number }) => Promise<void>;
  setContent: (html: string, options: { waitUntil: string }) => Promise<void>;
  evaluate: <T>(fn: () => T) => Promise<T>;
}

interface PlaywrightChromium {
  launch: (options: { headless: boolean }) => Promise<{
    newPage: () => Promise<PlaywrightPage>;
    close: () => Promise<void>;
  }>;
}

/** Production capture: headless Chromium via the externally-bundled playwright package. */
export async function captureWithPlaywright(target: {
  url?: string;
  html?: string;
}): Promise<RenderedCapture> {
  // Dynamic import string interpolation avoids compile-time module resolution while allowing runtime import
  const playwrightModule = 'playwright';
  let chromium: PlaywrightChromium;
  try {
    const mod = (await import(playwrightModule)) as { chromium: PlaywrightChromium };
    chromium = mod.chromium;
  } catch (error) {
    const msg = (error as Error).message;
    if (msg.includes('Cannot find module') || (error as { code?: string }).code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error(
        'URL extraction requires Playwright in the target project: npm i -D playwright (then re-run), or pass local files instead of --url',
        { cause: error },
      );
    }
    throw error;
  }
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    if (target.url !== undefined) {
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } else {
      await page.setContent(target.html ?? '', { waitUntil: 'domcontentloaded' });
    }
    return await page.evaluate(() => {
      const colorCounts = new Map<string, number>();
      const fontCounts = new Map<string, number>();
      const radiusCountsMap = new Map<string, number>();
      const elements = Array.from(document.querySelectorAll('*'));
      for (const el of elements) {
        const cs = window.getComputedStyle(el);
        for (const prop of ['color', 'background-color', 'border-color']) {
          const val = cs.getPropertyValue(prop);
          if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent') {
            colorCounts.set(val, (colorCounts.get(val) || 0) + 1);
          }
        }
        const ff = cs.getPropertyValue('font-family');
        if (ff) fontCounts.set(ff, (fontCounts.get(ff) || 0) + 1);
        const br = cs.getPropertyValue('border-radius');
        if (br && br.endsWith('px')) {
          const px = parseFloat(br);
          if (px > 0) radiusCountsMap.set(String(px), (radiusCountsMap.get(String(px)) || 0) + 1);
        }
      }
      return {
        colors: Array.from(colorCounts.entries()),
        fonts: Array.from(fontCounts.entries()).sort((a, b) => b[1] - a[1]),
        radii: Array.from(radiusCountsMap.entries()).sort((a, b) => b[1] - a[1]),
      };
    });
  } finally {
    await browser.close();
  }
}

/**
 * Capture a rendered page into the scan state. A capture failure falls back to
 * scanning the supplied HTML text; with no HTML it reports the failure.
 */
export async function scanRenderedTarget(
  target: RenderedTarget,
  state: ScanState,
  capture: CapturePage = captureWithPlaywright,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sourceName = target.sourceName ?? target.url ?? 'rendered';
  try {
    const captured = await capture({
      ...(target.url === undefined ? {} : { url: target.url }),
      ...(target.html === undefined ? {} : { html: target.html }),
    });
    for (const [color] of captured.colors) {
      recordCandidate(state, color, 'rendered', sourceName);
    }
    const topFont = captured.fonts[0];
    if (topFont !== undefined) {
      state.fontFamily = topFont[0].replaceAll(/["']/g, '').trim();
    }
    for (const [radius, count] of captured.radii) {
      const value = Number.parseFloat(radius);
      state.radiusCounts.set(value, (state.radiusCounts.get(value) ?? 0) + count);
    }
    return { ok: true };
  } catch (error) {
    if (target.html !== undefined && target.html.length > 0) {
      scanTextColors(target.html, sourceName, state);
      return { ok: true };
    }
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function extractColorPairs(files: Array<{ text: string; file: string }>): PreAuditBaseline {
  const pairs: RawColorPair[] = [];
  const standaloneFg: Array<{ selector: string; file: string; color: OklchColor; roleTag: string }> =
    [];
  const detectedBg: OklchColor[] = [];

  const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
  const fgColorRegex = /(?:^|[^-])color\s*:\s*([^;!]+)/i;
  const bgColorRegex = /(?:background-color|background)\s*:\s*([^;!]+)/i;

  function determineRoleTag(selector: string): string {
    const s = selector.toLowerCase();
    if (s.includes('button') || s.includes('btn')) return 'button';
    if (s.includes('card')) return 'card';
    if (s.includes('input') || s.includes('field') || s.includes('textbox')) return 'input';
    if (s.includes('dialog') || s.includes('modal')) return 'dialog';
    if (s.includes('badge') || s.includes('pill') || s.includes('tag')) return 'badge';
    if (s.includes('table') || s.includes('th') || s.includes('td')) return 'table';
    if (s.includes('alert') || s.includes('warning') || s.includes('error')) return 'alert';
    if (s.includes('muted') || s.includes('secondary') || s.includes('subdued'))
      return 'text.secondary';
    return 'text.primary';
  }

  for (const { text, file } of files) {
    for (const match of text.matchAll(ruleRegex)) {
      const selector = match[1]?.trim() ?? '';
      const body = match[2] ?? '';
      const fgMatch = body.match(fgColorRegex);
      const bgMatch = body.match(bgColorRegex);

      let fgColor: OklchColor | null = null;
      let bgColor: OklchColor | null = null;
      if (fgMatch?.[1]) {
        try {
          fgColor = parseToOklch(fgMatch[1].trim());
        } catch {
          // unparseable color string
        }
      }
      if (bgMatch?.[1]) {
        try {
          bgColor = parseToOklch(bgMatch[1].trim());
        } catch {
          // unparseable color string
        }
      }
      if (bgColor) {
        detectedBg.push(bgColor);
      }

      const roleTag = determineRoleTag(selector);

      if (fgColor && bgColor) {
        const fgHex = oklchToHex(clampToSrgb(fgColor));
        const bgHex = oklchToHex(clampToSrgb(bgColor));
        const check = checkContrast(selector, fgColor, selector, bgColor, 4.5, 60);
        pairs.push({
          id: `${file}::${selector}`,
          selector,
          file,
          fgHex,
          bgHex,
          wcagRatio: check.ratio,
          apcaLc: check.apcaLc,
          passWcag: check.ratio >= 4.5,
          passApca: check.apcaLc >= 60,
          roleTag,
        });
      } else if (fgColor) {
        standaloneFg.push({ selector, file, color: fgColor, roleTag });
      }
    }
  }

  const dominantBg: OklchColor =
    detectedBg.length > 0 ? detectedBg[0]! : (parseToOklch('#ffffff') as OklchColor);

  for (const item of standaloneFg) {
    const fgHex = oklchToHex(clampToSrgb(item.color));
    const bgHex = oklchToHex(clampToSrgb(dominantBg));
    const check = checkContrast(item.selector, item.color, 'canvas', dominantBg, 4.5, 60);
    pairs.push({
      id: `${item.file}::${item.selector}`,
      selector: item.selector,
      file: item.file,
      fgHex,
      bgHex,
      wcagRatio: check.ratio,
      apcaLc: check.apcaLc,
      passWcag: check.ratio >= 4.5,
      passApca: check.apcaLc >= 60,
      roleTag: item.roleTag,
    });
  }

  const total = pairs.length;
  const passWcag = pairs.filter((p) => p.passWcag).length;
  const failWcag = total - passWcag;
  const passApca = pairs.filter((p) => p.passApca).length;
  const failApca = total - passApca;
  const avgRatio =
    total > 0
      ? Number((pairs.reduce((sum, p) => sum + p.wcagRatio, 0) / total).toFixed(2))
      : 0;

  return {
    timestamp: new Date().toISOString(),
    pairs,
    summary: { total, passWcag, failWcag, passApca, failApca, avgRatio },
  };
}

export function renderPreAuditMarkdown(baseline: PreAuditBaseline): string {
  const lines = [
    '# Pre-Audit Baseline Report (Production Contrast Debt)',
    '',
    '## Executive Summary',
    `- Evaluated Production Pairs: ${baseline.summary.total}`,
    `- WCAG 2.1 AA (≥ 4.5:1): ${baseline.summary.passWcag} PASS, ${baseline.summary.failWcag} FAIL`,
    `- APCA (|Lc| ≥ 60): ${baseline.summary.passApca} PASS, ${baseline.summary.failApca} FAIL`,
    `- Average Contrast Ratio: ${baseline.summary.avgRatio}:1`,
    '',
    '## Evaluated Production Pairs',
    '| Selector | File | Foreground | Background | WCAG Ratio | APCA | Status |',
    '| :--- | :--- | :--- | :--- | :--- | :--- | :--- |',
  ];
  for (const p of baseline.pairs) {
    const status = p.passWcag ? 'PASS' : '**FAIL**';
    lines.push(
      `| \`${p.selector}\` | \`${p.file}\` | \`${p.fgHex}\` | \`${p.bgHex}\` | ${p.wcagRatio}:1 | ${p.apcaLc} | ${status} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

export interface ExtractSpecOptions {
  rootArg?: string | undefined;
  urlArg?: string | undefined;
  htmlArg?: string | undefined;
  outArg?: string | undefined;
  auditBaseline?: boolean | undefined;
  outBaselineArg?: string | undefined;
  force?: boolean | undefined;
  dryRun?: boolean | undefined;
  log?: Logger | undefined;
}

export interface ExtractSpecResult {
  code: number;
  error?: string | undefined;
  spec?: StyleSpec | undefined;
}

export async function extractSpec(opts: ExtractSpecOptions): Promise<ExtractSpecResult> {
  const {
    rootArg,
    urlArg,
    htmlArg,
    outArg = 'tokens.config.json',
    auditBaseline = false,
    outBaselineArg,
    force = false,
    dryRun = false,
    log = console.log,
  } = opts;

  const outPath = fromCwd(outArg);
  const rootDir = fromCwd(rootArg ?? '.');
  if (rootArg !== undefined && !existsSync(rootDir)) {
    return { code: EXIT.USAGE, error: `root not found: ${rootDir}` };
  }
  if (htmlArg !== undefined && !existsSync(fromCwd(htmlArg))) {
    return { code: EXIT.USAGE, error: `html file not found: ${fromCwd(htmlArg)}` };
  }
  if (!dryRun) {
    const decision = decideWrite({ paths: [outPath], tamper: null, force });
    if (decision.kind === 'refuse') {
      return { code: EXIT.REFUSAL, error: `output exists: ${outPath} (pass --force to overwrite)` };
    }
  }
  const state = createScanState();
  const scannedFiles: Array<{ text: string; file: string }> = [];

  if (urlArg !== undefined || htmlArg !== undefined) {
    const htmlContent = htmlArg === undefined ? undefined : readFileSync(fromCwd(htmlArg), 'utf8');
    const sourceName = htmlArg === undefined ? (urlArg ?? 'rendered') : basename(fromCwd(htmlArg));
    const rendered = await scanRenderedTarget(
      {
        ...(urlArg === undefined ? {} : { url: urlArg }),
        ...(htmlContent === undefined ? {} : { html: htmlContent }),
        sourceName,
      },
      state,
    );
    if (!rendered.ok) {
      return { code: EXIT.GENERIC, error: `rendered extraction error: ${rendered.error}` };
    }
  } else {
    for (const file of findSourceFiles(rootDir)) {
      const rel = relative(rootDir, file).replaceAll('\\', '/');
      let text: string;
      try {
        text = readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      scannedFiles.push({ text, file: rel });
      scanFile(text, rel, state);
    }
  }

  const ranked = rankCandidates(state.candidates.values());
  const evidenceSummary = ranked.slice(0, 5).map((candidate) => ({
    value: formatOklch(candidate.color),
    source: candidate.source,
    name: candidate.name,
    score: Math.round(candidateWeight(candidate)),
  }));

  let projectName = basename(rootDir);
  try {
    const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8')) as {
      name?: string;
    };
    if (typeof pkg.name === 'string' && pkg.name.length > 0)
      projectName = pkg.name.replace(/^@[^/]+\//, '');
  } catch {
    // basename fallback already set
  }

  const composed = composeStyleSpec({
    candidates: [...state.candidates.values()],
    tailwindColors: state.tailwindColors,
    ...(state.fontFamily === undefined ? {} : { fontFamily: state.fontFamily }),
    radiusCounts: state.radiusCounts,
    ...(state.frontmatter === undefined ? {} : { frontmatter: state.frontmatter }),
    projectName,
  });
  if (composed === null) {
    return {
      code: EXIT.GENERIC,
      error: 'no color signals found — fall back to the design-tokens interview',
    };
  }
  const { spec, notes: frontmatterNotes } = composed;
  const anchor = spec.palette[0]?.anchor as OklchColor;
  const validation = validateStyleSpec(spec);
  if (!validation.valid) {
    return {
      code: EXIT.VALIDATION,
      error: `candidate tokens config validation failed: ${validation.errors.join('; ')}`,
    };
  }
  for (const warning of validation.warnings) {
    log(`warning: ${warning}`);
  }
  if (dryRun) {
    log(
      JSON.stringify({ spec, evidence: evidenceSummary, notes: frontmatterNotes }, null, 2),
    );
    return { code: EXIT.OK, spec };
  }

  writeFileSync(outPath, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');
  for (const note of frontmatterNotes) log(note);
  for (const entry of evidenceSummary) {
    log(`evidence: ${entry.value} (${entry.source}${entry.name ? `, ${entry.name}` : ''})`);
  }
  log(`extracted candidate anchor ${formatOklch(anchor)} → ${outPath}`);

  if (auditBaseline) {
    const baseline = extractColorPairs(scannedFiles);
    const baselineJsonPath = outBaselineArg
      ? fromCwd(outBaselineArg)
      : join(dirname(outPath), '.pre-audit-baseline.json');
    const baselineMdPath = outBaselineArg
      ? outBaselineArg.replace(/\.json$/, '.md')
      : join(dirname(outPath), 'pre-audit-baseline.md');

    if (!dryRun) {
      writeFileSync(baselineJsonPath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
      writeFileSync(baselineMdPath, renderPreAuditMarkdown(baseline), 'utf8');
      log(
        `pre-audit baseline: ${baseline.summary.total} pair(s) evaluated (${baseline.summary.passWcag} pass, ${baseline.summary.failWcag} fail) → ${basename(baselineJsonPath)}`,
      );
    } else {
      log(
        JSON.stringify({ baseline: baseline.summary, pairs: baseline.pairs.length }, null, 2),
      );
    }
  }

  log('next: design-tokens read-back (confirm or veto), then token-engine generate');
  return { code: EXIT.OK, spec };
}

export async function runExtract(argv = process.argv.slice(2)): Promise<number> {
  if (hasFlag(argv, '--help')) {
    console.log(usageText('extract'));
    return 0;
  }

  const rootArg = getArg(argv, '--root');
  const urlArg = getArg(argv, '--url');
  const htmlArg = getArg(argv, '--html');
  const outArg = getArg(argv, '--out', 'tokens.config.json');
  const auditBaseline = hasFlag(argv, '--audit-baseline');
  const outBaselineArg = getArg(argv, '--out-baseline');
  const force = hasFlag(argv, '--force');
  const dryRun = hasFlag(argv, '--dry-run');

  const result = await extractSpec({
    rootArg,
    urlArg,
    htmlArg,
    outArg,
    auditBaseline,
    outBaselineArg,
    force,
    dryRun,
    log: console.log,
  });

  if (result.error && result.code !== 0) {
    console.error(result.error);
  }

  return result.code;
}
