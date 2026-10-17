/**
 * build — compile a 3-tier token tree to CSS custom properties + Tailwind v4 `@theme`
 * via Style Dictionary v4 (programmatic, bundled; see templates/sd.config.json for shape).
 *
 * Usage: node ./scripts/build.mjs --tokens tokens --out build [--theme light|dark] [--prefix ds]
 */
import { existsSync } from 'node:fs';
import { relative } from 'node:path';
import { buildTokens } from '../../../shared/compiler.js';
import { fromCwd, getArg, hasFlag, templatePath } from '../../../shared/paths.js';

const argv = process.argv.slice(2);

if (hasFlag(argv, '--help')) {
  console.log('Usage: build.mjs --tokens <dir> --out <dir> [--theme light|dark] [--prefix <name>]');
  process.exit(0);
}

const tokensArg = getArg(argv, '--tokens', 'tokens') as string;
const outArg = getArg(argv, '--out', 'build') as string;
const theme = getArg(argv, '--theme', 'light') as string;
const prefix = getArg(argv, '--prefix');

if (theme !== 'light' && theme !== 'dark') {
  console.error(`--theme must be light|dark, got: ${theme}`);
  process.exit(1);
}

const tokensDir = fromCwd(tokensArg);
if (!existsSync(tokensDir)) {
  console.error(`tokens dir not found: ${tokensDir} (run token-math generate first)`);
  process.exit(1);
}

// Portable base-config template ships with the skill; compiler mirrors its shape.
const baseConfig = templatePath(import.meta.url, 'sd.config.json');
if (!existsSync(baseConfig)) {
  console.error(`bundled template missing: ${baseConfig} (skill package is incomplete)`);
  process.exit(1);
}

// Style Dictionary globs: forward slashes on every platform, and cwd-relative
// patterns (bundled glob engines mishandle absolute Windows drive paths).
const globBase = relative(process.cwd(), tokensDir).replaceAll('\\', '/');
const source = [
  `${globBase}/1-primitive/**/*.tokens.json`,
  `${globBase}/2-semantic/${theme}.tokens.json`,
  `${globBase}/3-component/**/*.tokens.json`,
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
  console.log(`built (${theme}) → ${outputs.join(', ')}`);
} catch (error) {
  console.error(`build failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
