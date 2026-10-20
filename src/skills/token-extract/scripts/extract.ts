/**
 * extract — scan an existing project (CSS/SCSS/JSON/JS/TS/HTML) for color,
 * font, and radius signals and write a candidate style-spec.json.
 *
 * Extraction is evidence, not migration: nothing scanned is modified, and
 * the candidate must pass token-style's read-back before token-math runs.
 *
 * Usage: node ./scripts/extract.mjs [--root <dir>] [--url <url>] [--html <file.html>] [--out <style-spec.json>] [--force] [--dry-run]
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';
import { nearestColorName } from '../../../shared/color-names.js';
import { buildHarmony, formatOklch, parseToOklch } from '../../../shared/colors.js';
import { fromCwd, getArg, hasFlag, isMainModule } from '../../../shared/paths.js';
import { validateStyleSpec } from '../../../shared/spec.js';
import type { OklchColor, StyleSpec } from '../../../shared/types.js';

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

function rememberRole(
  role: 'primary' | 'secondary' | 'accent',
  color: OklchColor,
  map: Map<string, { role: string; color: OklchColor }>,
): void {
  if (!map.has(role)) map.set(role, { role, color });
}

export function composeStyleSpec(evidence: ExtractionEvidence): ComposedSpec | null {
  const ranked = [...evidence.candidates].sort(
    (a, b) => b.score + b.count * 2 - (a.score + a.count * 2),
  );
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
  const PREFIXES = ['deep', 'soft', 'vibrant', 'rich', 'pale', 'bright', 'dark', 'pure'] as const;
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
  for (const derivedColor of buildHarmony(anchor, 'analogous')) {
    if (palette.length >= 3) break;
    palette.push({
      role: palette.length === 1 ? 'secondary' : 'accent',
      name: uniqueName(derivedColor),
      anchor: derivedColor,
    });
  }

  const spec: StyleSpec = {
    name: evidence.projectName,
    harmony: 'analogous',
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

type Candidate = ColorCandidate;

export async function runExtract(argv = process.argv.slice(2)): Promise<number> {
  if (hasFlag(argv, '--help')) {
    console.log(
      'Usage: extract.mjs [--root <dir>] [--url <url>] [--html <file.html>] [--out <style-spec.json>] [--force] [--dry-run]',
    );
    return 0;
  }

  const rootArg = getArg(argv, '--root', undefined) as string | undefined;
  const urlArg = getArg(argv, '--url', undefined) as string | undefined;
  const htmlArg = getArg(argv, '--html', undefined) as string | undefined;
  const outArg = getArg(argv, '--out', 'style-spec.json') as string;
  const force = hasFlag(argv, '--force');
  const dryRun = hasFlag(argv, '--dry-run');
  const outPath = fromCwd(outArg);
  if (rootArg === undefined && urlArg === undefined && htmlArg === undefined) {
    // Default to scanning current directory if no mode specified
  }
  const rootDir = fromCwd(rootArg ?? '.');
  if (rootArg !== undefined && !existsSync(rootDir)) {
    console.error(`root not found: ${rootDir}`);
    return 1;
  }
  if (htmlArg !== undefined && !existsSync(fromCwd(htmlArg))) {
    console.error(`html file not found: ${fromCwd(htmlArg)}`);
    return 1;
  }
  if (existsSync(outPath) && !force && !dryRun) {
    console.error(`output exists: ${outPath} (pass --force to overwrite)`);
    return 1;
  }

  const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'release', 'coverage', '.next']);
  const SCAN_EXTS = new Set([
    '.css',
    '.scss',
    '.json',
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.html',
    '.md',
  ]);

  function scanFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : scanFiles(path);
        return SCAN_EXTS.has(extname(entry.name)) ? [path] : [];
      });
  }

  const NAMED_COLOR =
    /([A-Za-z0-9_-]+)["']?\s*:\s*["']?(#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|oklch\([^)]*\)|rgba?\([^)]*\))/g;
  const BARE_COLOR = /(#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|oklch\([^)]*\))/g;

  const candidates = new Map<string, Candidate>();
  let fontFamily: string | undefined;
  const radiusCounts = new Map<number, number>();
  const tailwindColors = new Map<string, { role: string; color: OklchColor }>();

  function extractTailwindConfig(text: string, relSource: string): void {
    // Tailwind v3: colors: { primary: { 500: '#...' } or primary: '#...' }
    const colorBlockMatch = /colors\s*:\s*\{([^}]+(?:\{[^}]+\}[^}]+)*)\}/s.exec(text);
    if (colorBlockMatch?.[1] !== undefined) {
      const block = colorBlockMatch[1];
      // Look for roles or names with hex/oklch values
      const entryRegex = /([a-zA-Z0-9_-]+)\s*:\s*(?:\{([^}]+)\}|["']([^"']+)["'])/g;
      for (const match of block.matchAll(entryRegex)) {
        const roleOrName = (match[1] || '').toLowerCase();
        const nested = match[2];
        const direct = match[3];
        if (direct) {
          try {
            const col = parseToOklch(direct);
            record(direct, roleOrName, relSource);
            if (['primary', 'brand'].includes(roleOrName)) {
              rememberRole('primary', col, tailwindColors);
            } else if (['secondary', 'accent'].includes(roleOrName)) {
              rememberRole('secondary', col, tailwindColors);
            }
          } catch {
            /* skip */
          }
        } else if (nested) {
          // Look for 500 shade first, or any first valid shade
          const shade500 = /(?:500|DEFAULT)\s*:\s*["']([^"']+)["']/.exec(nested);
          const anyShade = /(?:[0-9]{2,3})\s*:\s*["']([^"']+)["']/.exec(nested);
          const target = shade500?.[1] || anyShade?.[1];
          if (target) {
            try {
              const col = parseToOklch(target);
              record(target, roleOrName, relSource);
              if (['primary', 'brand'].includes(roleOrName)) {
                rememberRole('primary', col, tailwindColors);
              } else if (['secondary', 'accent'].includes(roleOrName)) {
                rememberRole('secondary', col, tailwindColors);
              }
            } catch {
              /* skip */
            }
          }
        }
      }
    }
  }

  function extractTailwindV4Theme(text: string, relSource: string): void {
    // Tailwind v4: @theme { --color-primary: #...; --color-primary-500: #...; }
    const themeMatch = /@theme\s*\{([^}]+)\}/s.exec(text);
    if (themeMatch?.[1] !== undefined) {
      const block = themeMatch[1];
      for (const match of block.matchAll(/--color-([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g)) {
        const varName = (match[1] || '').toLowerCase();
        const val = (match[2] || '').trim();
        try {
          const col = parseToOklch(val);
          record(val, varName, relSource);
          if (varName === 'primary' || varName.startsWith('primary-500') || varName === 'brand') {
            rememberRole('primary', col, tailwindColors);
          } else if (varName === 'secondary' || varName.startsWith('secondary-500')) {
            rememberRole('secondary', col, tailwindColors);
          } else if (varName === 'accent' || varName.startsWith('accent-500')) {
            rememberRole('accent', col, tailwindColors);
          }
        } catch {
          /* skip */
        }
      }
    }
  }
  function nameScore(name: string): number {
    const n = name.toLowerCase();
    if (/(brand|primary|accent)/.test(n)) return 60;
    if (/(main|cta|link|button)/.test(n)) return 20;
    if (/(bg|background|surface|text|border|base)/.test(n)) return -40;
    return 0;
  }

  function record(raw: string, name: string, relSource: string): void {
    let color: OklchColor;
    try {
      color = parseToOklch(raw);
    } catch {
      return;
    }
    const key = formatOklch(color);
    const existing = candidates.get(key);
    const score =
      nameScore(name) +
      (color.c < 0.03 ? -50 : color.c * 100) +
      (color.l >= 0.35 && color.l <= 0.75 ? 20 : -20);
    if (existing === undefined) {
      candidates.set(key, { color, score, count: 1, source: relSource, name });
    } else {
      existing.count += 1;
      existing.score = Math.max(existing.score, score);
    }
  }

  let designFrontmatter: DesignFrontmatter | undefined;

  function parseDesignFrontmatter(text: string, rel: string): DesignFrontmatter | undefined {
    const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
    if (block?.[1] === undefined) return undefined;
    const fm = block[1];
    const pick = (pattern: RegExp): string | undefined => pattern.exec(fm)?.[1];
    const colorOf = (key: string): string | undefined =>
      pick(new RegExp(`"?${key}"?\\s*:\\s*"((?:#[0-9a-fA-F]{3,8})|oklch\\([^)]*\\))"`));
    const rounded: DesignFrontmatter['rounded'] = (() => {
      const sm = pick(/"?sm"?\s*:\s*"([0-9.]+)px"/);
      const md = pick(/"?md"?\s*:\s*"([0-9.]+)px"/);
      const lg = pick(/"?lg"?\s*:\s*"([0-9.]+)px"/);
      return sm !== undefined && md !== undefined && lg !== undefined
        ? { sm: Number(sm), md: Number(md), lg: Number(lg) }
        : undefined;
    })();
    const componentsRaw = pick(/components:\s*\[([^\]]*)\]/);
    const primary = colorOf('primary');
    const secondary = colorOf('secondary');
    const fontSans = pick(/"?fontSans"?\s*:\s*"([^"]+)"/);
    const scaleRaw = Number(pick(/"?scale"?\s*:\s*"?([0-9.]+)/)) || undefined;
    const density = pick(/"?density"?\s*:\s*"(\w+)"/);
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

  if (urlArg !== undefined || htmlArg !== undefined) {
    // Rendered mode: run headless browser or load HTML file to evaluate computed styles
    let htmlContent = '';
    let sourceName = 'rendered';
    if (htmlArg !== undefined) {
      const filePath = fromCwd(htmlArg);
      htmlContent = readFileSync(filePath, 'utf8');
      sourceName = basename(filePath);
    }
    try {
      // Dynamic import string interpolation avoids compile-time module resolution while allowing runtime import
      const pwModule = 'playwright';
      const { chromium } = (await import(pwModule)) as {
        chromium: {
          launch: (opts: { headless: boolean }) => Promise<{
            newPage: () => Promise<{
              goto: (url: string, opts: { waitUntil: string; timeout: number }) => Promise<void>;
              setContent: (html: string, opts: { waitUntil: string }) => Promise<void>;
              evaluate: <T>(fn: () => T) => Promise<T>;
            }>;
            close: () => Promise<void>;
          }>;
        };
      };
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      if (urlArg !== undefined) {
        sourceName = urlArg;
        await page.goto(urlArg, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } else {
        await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
      }
      const renderedData = await page.evaluate(() => {
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
      await browser.close();

      for (const [col] of renderedData.colors) {
        record(col, 'rendered', sourceName);
      }
      if (renderedData.fonts[0] !== undefined) {
        fontFamily = renderedData.fonts[0][0].replaceAll(/["']/g, '').trim();
      }
      for (const [rStr, count] of renderedData.radii) {
        const rVal = parseFloat(rStr);
        radiusCounts.set(rVal, (radiusCounts.get(rVal) || 0) + count);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // If Playwright is not installed or headless launch fails, fall back to regex scan of HTML text
      if (htmlContent) {
        for (const match of htmlContent.matchAll(NAMED_COLOR)) {
          if (match[1] !== undefined && match[2] !== undefined)
            record(match[2], match[1], sourceName);
        }
        for (const match of htmlContent.matchAll(BARE_COLOR)) {
          if (match[1] !== undefined) record(match[1], '', sourceName);
        }
        const fontMatch = /font-family\s*:\s*([^;}{]+)/i.exec(htmlContent);
        if (fontMatch?.[1] !== undefined) {
          fontFamily = fontMatch[1].replaceAll(/["']/g, '').trim();
        }
        for (const match of htmlContent.matchAll(/border-radius\s*:\s*([0-9.]+)px/g)) {
          if (match[1] !== undefined) {
            const value = Number(match[1]);
            radiusCounts.set(value, (radiusCounts.get(value) || 0) + 1);
          }
        }
      } else {
        console.error(`rendered extraction error: ${message}`);
        return 1;
      }
    }
  } else {
    for (const file of scanFiles(rootDir)) {
      const rel = relative(rootDir, file).replaceAll('\\', '/');
      let text: string;
      try {
        text = readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      if (file.includes('tailwind.config')) {
        extractTailwindConfig(text, rel);
      }
      if (file.endsWith('.css') || file.endsWith('.scss')) {
        extractTailwindV4Theme(text, rel);
      }
      if (file.endsWith('.md')) {
        const parsed = parseDesignFrontmatter(text, rel);
        if (parsed !== undefined && parsed.primary !== undefined) {
          if (designFrontmatter === undefined) designFrontmatter = parsed;
          continue; // frontmatter is the machine-readable contract; prose is not scanned for colors
        }
      }
      for (const match of text.matchAll(NAMED_COLOR)) {
        if (match[1] !== undefined && match[2] !== undefined) record(match[2], match[1], rel);
      }
      for (const match of text.matchAll(BARE_COLOR)) {
        if (match[1] !== undefined) record(match[1], '', rel);
      }
      if (fontFamily === undefined) {
        const font = /font-family\s*:\s*([^;}{]+)/i.exec(text);
        if (font?.[1] !== undefined) {
          fontFamily = font[1].replaceAll(/["']/g, '').trim();
        }
      }
      for (const match of text.matchAll(/border-radius\s*:\s*([0-9.]+)px/g)) {
        if (match[1] !== undefined) {
          const value = Number(match[1]);
          radiusCounts.set(value, (radiusCounts.get(value) ?? 0) + 1);
        }
      }
    }
  }

  const ranked = [...candidates.values()].sort(
    (a, b) => b.score + b.count * 2 - (a.score + a.count * 2),
  );
  const evidenceSummary = ranked.slice(0, 5).map((candidate) => ({
    value: formatOklch(candidate.color),
    source: candidate.source,
    name: candidate.name,
    score: Math.round(candidate.score + candidate.count * 2),
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
    candidates: [...candidates.values()],
    tailwindColors,
    ...(fontFamily === undefined ? {} : { fontFamily }),
    radiusCounts,
    ...(designFrontmatter === undefined ? {} : { frontmatter: designFrontmatter }),
    projectName,
  });
  if (composed === null) {
    console.error('no color signals found — fall back to the token-style interview');
    return 1;
  }
  const { spec, notes: frontmatterNotes } = composed;
  const anchor = spec.palette[0]?.anchor as OklchColor;
  const validation = validateStyleSpec(spec);
  if (!validation.valid) {
    console.error(`candidate style-spec validation failed: ${validation.errors.join('; ')}`);
    return 1;
  }
  for (const warning of validation.warnings) {
    console.log(`warning: ${warning}`);
  }
  if (dryRun) {
    console.log(
      JSON.stringify({ spec, evidence: evidenceSummary, notes: frontmatterNotes }, null, 2),
    );
    return 0;
  }

  writeFileSync(outPath, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');
  for (const note of frontmatterNotes) console.log(note);
  for (const entry of evidenceSummary) {
    console.log(`evidence: ${entry.value} (${entry.source}${entry.name ? `, ${entry.name}` : ''})`);
  }
  console.log(`extracted candidate anchor ${formatOklch(anchor)} → ${outPath}`);
  console.log('next: token-style read-back (confirm or veto), then token-math generate');
  return 0;
}

if (isMainModule(import.meta.url, 'extract.mjs', 'extract.ts')) {
  runExtract().then((code) => process.exit(code));
}
