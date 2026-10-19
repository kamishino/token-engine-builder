/**
 * extract — scan an existing project (CSS/SCSS/JSON/JS/TS/HTML) for color,
 * font, and radius signals and write a candidate style-spec.json.
 *
 * Extraction is evidence, not migration: nothing scanned is modified, and
 * the candidate must pass token-style's read-back before token-math runs.
 *
 * Usage: node ./scripts/extract.mjs --root <dir> --out style-spec.json [--force] [--dry-run]
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';
import { buildHarmony, formatOklch, parseToOklch } from '../../../shared/colors.js';
import { fromCwd, getArg, hasFlag } from '../../../shared/paths.js';
import type { OklchColor, StyleSpec } from '../../../shared/types.js';

const argv = process.argv.slice(2);

if (hasFlag(argv, '--help')) {
  console.log('Usage: extract.mjs --root <dir> --out <style-spec.json> [--force] [--dry-run]');
  process.exit(0);
}

const rootArg = getArg(argv, '--root', '.') as string;
const outArg = getArg(argv, '--out', 'style-spec.json') as string;
const force = hasFlag(argv, '--force');
const dryRun = hasFlag(argv, '--dry-run');
const rootDir = fromCwd(rootArg);
const outPath = fromCwd(outArg);

if (!existsSync(rootDir)) {
  console.error(`root not found: ${rootDir}`);
  process.exit(1);
}
if (existsSync(outPath) && !force && !dryRun) {
  console.error(`output exists: ${outPath} (pass --force to overwrite)`);
  process.exit(1);
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'release', 'coverage', '.next']);
const SCAN_EXTS = new Set(['.css', '.scss', '.json', '.ts', '.tsx', '.js', '.jsx', '.html']);

function scanFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : scanFiles(path);
      return SCAN_EXTS.has(extname(entry.name)) ? [path] : [];
    });
}

interface Candidate {
  color: OklchColor;
  score: number;
  count: number;
  source: string;
  name: string;
}

const NAMED_COLOR =
  /([A-Za-z0-9_-]+)["']?\s*:\s*["']?(#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|oklch\([^)]*\)|rgba?\([^)]*\))/g;
const BARE_COLOR = /(#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|oklch\([^)]*\))/g;

const candidates = new Map<string, Candidate>();
let fontFamily: string | undefined;
const radiusCounts = new Map<number, number>();

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

for (const file of scanFiles(rootDir)) {
  const rel = relative(rootDir, file).replaceAll('\\', '/');
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
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

const ranked = [...candidates.values()].sort(
  (a, b) => b.score + b.count * 2 - (a.score + a.count * 2),
);
const top = ranked[0];
if (top === undefined) {
  console.error('no color signals found — fall back to the token-style interview');
  process.exit(1);
}

const evidence = ranked.slice(0, 5).map((candidate) => ({
  value: formatOklch(candidate.color),
  source: candidate.source,
  name: candidate.name,
  score: Math.round(candidate.score + candidate.count * 2),
}));

let projectName = basename(rootDir);
try {
  const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8')) as { name?: string };
  if (typeof pkg.name === 'string' && pkg.name.length > 0)
    projectName = pkg.name.replace(/^@[^/]+\//, '');
} catch {
  // basename fallback already set
}

const radiusMd = [...radiusCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 8;
const anchor: OklchColor = {
  l: Number(top.color.l.toFixed(4)),
  c: Number(top.color.c.toFixed(4)),
  h: Number(top.color.h.toFixed(2)),
  alpha: 1,
};

const HUE_FAMILIES = [
  'red',
  'orange',
  'amber',
  'yellow',
  'green',
  'teal',
  'cyan',
  'blue',
  'indigo',
  'violet',
  'magenta',
  'pink',
] as const;

function hueFamily(h: number): string {
  return HUE_FAMILIES[Math.floor((((h % 360) + 360) % 360) / 30) % 12] as string;
}

const usedNames = new Set<string>();
function uniqueName(h: number): string {
  const base = hueFamily(h);
  const name = usedNames.has(base) ? `${base}-2` : base;
  usedNames.add(name);
  return name;
}

const derived = buildHarmony(anchor, 'analogous');
const spec: StyleSpec = {
  name: projectName,
  harmony: 'analogous',
  palette: [
    { role: 'primary', name: uniqueName(anchor.h), anchor },
    ...(derived[0] === undefined
      ? []
      : [{ role: 'secondary' as const, name: uniqueName(derived[0].h), anchor: derived[0] }]),
    ...(derived[1] === undefined
      ? []
      : [{ role: 'accent' as const, name: uniqueName(derived[1].h), anchor: derived[1] }]),
  ],
  rampSteps: 11,
  neutralHue: anchor.h,
  neutralChroma: 0.012,
  typography: {
    fontFamily: fontFamily ?? 'Inter, system-ui, sans-serif',
    baseSizePx: 16,
    ratio: 1.25,
  },
  spacingBasePx: 4,
  density: 'comfortable',
  radius: {
    sm: Math.max(0, Math.round(radiusMd / 2)),
    md: Math.round(radiusMd),
    lg: Math.round(radiusMd * 2),
    full: 9999,
  },
  targets: { minWcagRatio: 4.5 },
};

if (dryRun) {
  console.log(JSON.stringify({ spec, evidence }, null, 2));
  process.exit(0);
}

writeFileSync(outPath, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');
for (const entry of evidence) {
  console.log(`evidence: ${entry.value} (${entry.source}${entry.name ? `, ${entry.name}` : ''})`);
}
console.log(`extracted candidate anchor ${formatOklch(anchor)} → ${outPath}`);
console.log('next: token-style read-back (confirm or veto), then token-math generate');
