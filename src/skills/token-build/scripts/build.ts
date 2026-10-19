/**
 * build — compile a 3-tier token tree to CSS custom properties + Tailwind v4 `@theme`
 * via Style Dictionary v5 (programmatic, bundled; see templates/sd.config.json for shape).
 *
 * Usage: node ./scripts/build.mjs --tokens tokens --out build [--theme light|dark] [--prefix ds]
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { oklchToHex } from '../../../shared/colors.js';
import {
  buildTokens,
  buildUiProfile,
  UI_PROFILE_IDS,
  type UiProfileId,
} from '../../../shared/compiler.js';
import {
  assertSafeOutDir,
  checkTampered,
  collectHashes,
  sha256Hex,
  writeManifest,
} from '../../../shared/guard.js';
import { fromCwd, getArg, hasFlag, templatePath } from '../../../shared/paths.js';

const argv = process.argv.slice(2);

if (hasFlag(argv, '--help')) {
  console.log(
    'Usage: build.mjs --tokens <dir> --out <dir> [--theme <name>] [--prefix <name>] [--spec <style-spec.json>] [--profile <id>] [--allow-unaudited] [--force] [--dry-run]',
  );
  process.exit(0);
}

const tokensArg = getArg(argv, '--tokens', 'tokens') as string;
const outArg = getArg(argv, '--out', 'build') as string;
const theme = getArg(argv, '--theme', 'light') as string;
const prefix = getArg(argv, '--prefix');
const force = hasFlag(argv, '--force');
const dryRun = hasFlag(argv, '--dry-run');
const specArg = getArg(argv, '--spec');

interface SpecGuide {
  name: string;
  overview?: string;
  dos?: string[];
  donts?: string[];
  primaryHex?: string;
  secondaryHex?: string;
  scale?: number;
  density?: string;
}

let guide: SpecGuide | undefined;
if (specArg !== undefined) {
  const specPath = fromCwd(specArg);
  if (!existsSync(specPath)) {
    console.error(`style-spec not found: ${specPath}`);
    process.exit(1);
  }
  const spec = JSON.parse(readFileSync(specPath, 'utf8')) as {
    name: string;
    density?: string;
    typography?: { ratio?: number };
    palette?: Array<{ role: string; anchor: { l: number; c: number; h: number; alpha?: number } }>;
    guide?: { overview?: string; dos?: string[]; donts?: string[] };
  };
  const primary = spec.palette?.find((entry) => entry.role === 'primary');
  const secondary = spec.palette?.find((entry) => entry.role === 'secondary');
  guide = {
    name: spec.name,
    ...(spec.guide?.overview === undefined ? {} : { overview: spec.guide.overview }),
    ...(spec.guide?.dos === undefined ? {} : { dos: spec.guide.dos }),
    ...(spec.guide?.donts === undefined ? {} : { donts: spec.guide.donts }),
    ...(primary === undefined ? {} : { primaryHex: oklchToHex(primary.anchor) }),
    ...(secondary === undefined ? {} : { secondaryHex: oklchToHex(secondary.anchor) }),
    ...(spec.typography?.ratio === undefined ? {} : { scale: spec.typography.ratio }),
    ...(spec.density === undefined ? {} : { density: spec.density }),
  };
}
const tokensDir = fromCwd(tokensArg);
if (!existsSync(tokensDir)) {
  console.error(`tokens dir not found: ${tokensDir} (run token-math generate first)`);
  process.exit(1);
}

// Any theme with a semantic/<theme>.tokens.json file is buildable.
const semanticFile = `${tokensArg.replaceAll('\\', '/')}/semantic/${theme}.tokens.json`;
if (!existsSync(fromCwd(semanticFile))) {
  console.error(`theme not found: ${semanticFile}`);
  process.exit(1);
}

// Portable base-config template ships with the skill; compiler mirrors its shape.
const baseConfig = templatePath(import.meta.url, 'sd.config.json');
if (!existsSync(baseConfig)) {
  console.error(`bundled template missing: ${baseConfig} (skill package is incomplete)`);
  process.exit(1);
}

const profileArg = getArg(argv, '--profile');
if (profileArg !== undefined && !(UI_PROFILE_IDS as readonly string[]).includes(profileArg)) {
  console.error(`unknown profile "${profileArg}" (valid: ${UI_PROFILE_IDS.join(', ')})`);
  process.exit(1);
}
const profile = profileArg as UiProfileId | undefined;

const MANIFEST_NAME = '.token-engine-css-manifest.json';
const outDir = fromCwd(outArg);
const manifestPath = join(outDir, MANIFEST_NAME);
const outputPaths =
  profile === undefined
    ? [
        join(outDir, 'tokens.css'),
        join(outDir, 'theme.css'),
        join(outDir, 'components.md'),
        join(outDir, 'DESIGN.md'),
      ]
    : [join(outDir, `${profile}.css`)];
const outputsExist = outputPaths.some((path) => existsSync(path));
const tamper = checkTampered(manifestPath, outDir, [MANIFEST_NAME]);

if (dryRun) {
  console.log(
    profile === undefined
      ? `would build (${theme}) → ${outDir}`
      : `would build profile ${profile} (light + dark) → ${outDir}`,
  );
  if (outputsExist) console.log(`provenance: ${tamper.status}`);
  console.log(`audit stamp: ${auditStampStatus()}`);
  process.exit(0);
}

const safeError = assertSafeOutDir(outDir, process.cwd());
if (safeError !== null) {
  console.error(safeError);
  process.exit(1);
}

if (outputsExist && !force) {
  if (tamper.status === 'tampered' || tamper.status === 'unreadable') {
    console.error(`refusing to overwrite hand-edited CSS in ${outDir}:`);
    for (const path of tamper.changed) console.error(`  changed: ${path}`);
    for (const path of tamper.missing) console.error(`  missing: ${path}`);
    console.error('pass --force to overwrite deliberately');
  } else {
    console.error(`outputs exist in ${outDir} (pass --force to overwrite)`);
  }
  process.exit(1);
}
if (outputsExist && force && (tamper.status === 'tampered' || tamper.status === 'unreadable')) {
  console.log('overwriting hand-edited CSS (--force)');
}

/** Audit stamp status for this exact token tree: missing | fail | stale | pass. */
function auditStampStatus(): string {
  const stampPath = join(tokensDir, '.token-engine-audit.json');
  try {
    const stamp = JSON.parse(readFileSync(stampPath, 'utf8')) as {
      pass?: unknown;
      treeHash?: unknown;
    };
    if (stamp.pass !== true || typeof stamp.treeHash !== 'string') return 'fail';
    const hashes = collectHashes(tokensDir, [
      '.token-engine-audit.json',
      '.token-engine-tokens-manifest.json',
    ]);
    const current = sha256Hex(
      Object.entries(hashes)
        .map(([path, hash]) => `${path}:${hash}`)
        .join('\n'),
    );
    return current === stamp.treeHash ? 'pass' : 'stale';
  } catch {
    return 'missing';
  }
}

// Verified gate: refuse to build a tree without a fresh passing audit stamp.
const allowUnaudited = hasFlag(argv, '--allow-unaudited');
if (allowUnaudited) {
  console.log('warning: building without a fresh audit pass (--allow-unaudited)');
} else if (auditStampStatus() !== 'pass') {
  console.error(
    `refusing to build: no fresh audit pass for this exact tree (stamp: ${auditStampStatus()}). Run token-audit first, or pass --allow-unaudited.`,
  );
  process.exit(1);
}

console.log(
  profile === undefined
    ? `writing CSS → ${outDir}`
    : `writing ${profile} profile → ${outDir} (theme flag ignored: profiles build light + dark)`,
);

// Style Dictionary globs: forward slashes on every platform, and cwd-relative
// patterns (bundled glob engines mishandle absolute Windows drive paths).
const globBase = relative(process.cwd(), tokensDir).replaceAll('\\', '/');
const source = [
  `${globBase}/primitive/**/*.tokens.json`,
  `${globBase}/semantic/${theme}.tokens.json`,
  `${globBase}/component/**/*.tokens.json`,
];

try {
  const outputs =
    profile === undefined
      ? await buildTokens({
          source,
          outDir: outArg.replaceAll('\\', '/'),
          label: theme,
          ...(guide === undefined ? {} : { guide }),
          ...(prefix === undefined ? {} : { prefix }),
        })
      : await buildUiProfile(profile, tokensDir, outArg.replaceAll('\\', '/'));
  const missing = outputs.filter((path) => !existsSync(fromCwd(path)));
  if (missing.length > 0) {
    console.error(`build failed: Style Dictionary produced no tokens for ${missing.join(', ')}`);
    process.exit(1);
  }
  const tokenHashes = collectHashes(tokensDir, []);
  const inputHash = sha256Hex(
    Object.entries(tokenHashes)
      .filter(([path]) => path.endsWith('.tokens.json'))
      .map(([path, hash]) => `${path}:${hash}`)
      .join('\n'),
  );
  writeManifest(manifestPath, {
    version: 1,
    kind: 'css',
    generator: 'token-engine-builder',
    inputHash,
    files:
      profile === undefined
        ? {
            'DESIGN.md': sha256Hex(readFileSync(fromCwd(outputs[3] as string))),
            'components.md': sha256Hex(readFileSync(fromCwd(outputs[2] as string))),
            'theme.css': sha256Hex(readFileSync(fromCwd(outputs[1] as string))),
            'tokens.css': sha256Hex(readFileSync(fromCwd(outputs[0] as string))),
          }
        : { [`${profile}.css`]: sha256Hex(readFileSync(fromCwd(outputs[0] as string))) },
  });
  console.log(
    profile === undefined
      ? `built (${theme}) → ${outputs.join(', ')}`
      : `built profile ${profile} → ${outputs.join(', ')}`,
  );
} catch (error) {
  console.error(`build failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
