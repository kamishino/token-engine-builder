/**
 * build — compile a 3-tier token tree to CSS custom properties + Tailwind v4 `@theme`
 * via Style Dictionary v5 (programmatic, bundled; see templates/sd.config.json for shape).
 *
 * Usage: node ./scripts/build.mjs --tokens tokens --out build [--theme light|dark] [--prefix ds]
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { buildTokens } from '../../../shared/compiler.js';
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
    'Usage: build.mjs --tokens <dir> --out <dir> [--theme <name>] [--prefix <name>] [--force] [--dry-run]',
  );
  process.exit(0);
}

const tokensArg = getArg(argv, '--tokens', 'tokens') as string;
const outArg = getArg(argv, '--out', 'build') as string;
const theme = getArg(argv, '--theme', 'light') as string;
const prefix = getArg(argv, '--prefix');
const force = hasFlag(argv, '--force');
const dryRun = hasFlag(argv, '--dry-run');

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

const MANIFEST_NAME = '.token-engine-css-manifest.json';
const outDir = fromCwd(outArg);
const manifestPath = join(outDir, MANIFEST_NAME);
const outputPaths = [join(outDir, 'tokens.css'), join(outDir, 'theme.css')];
const outputsExist = outputPaths.some((path) => existsSync(path));
const tamper = checkTampered(manifestPath, outDir, [MANIFEST_NAME]);

if (dryRun) {
  console.log(`would build (${theme}) → ${outDir}`);
  if (outputsExist) console.log(`provenance: ${tamper.status}`);
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

console.log(`writing CSS → ${outDir}`);

// Style Dictionary globs: forward slashes on every platform, and cwd-relative
// patterns (bundled glob engines mishandle absolute Windows drive paths).
const globBase = relative(process.cwd(), tokensDir).replaceAll('\\', '/');
const source = [
  `${globBase}/primitive/**/*.tokens.json`,
  `${globBase}/semantic/${theme}.tokens.json`,
  `${globBase}/component/**/*.tokens.json`,
];

try {
  const outputs = await buildTokens({
    source,
    outDir: outArg.replaceAll('\\', '/'),
    ...(prefix === undefined ? {} : { prefix }),
  });
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
    files: {
      'theme.css': sha256Hex(readFileSync(fromCwd(outputs[1] as string))),
      'tokens.css': sha256Hex(readFileSync(fromCwd(outputs[0] as string))),
    },
  });
  console.log(`built (${theme}) → ${outputs.join(', ')}`);
} catch (error) {
  console.error(`build failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
