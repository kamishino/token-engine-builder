/**
 * build — Compile DTCG token trees to CSS variables, Tailwind v4 @theme, and UI-library profiles.
 */
import { compileTokens } from '../../../shared/build.js';
import { usageText } from '../../../shared/cli-flags.js';
import { fromCwd, getArg, hasFlag, isMainModule } from '../../../shared/paths.js';

export async function runBuild(argv = process.argv.slice(2)): Promise<number> {
  if (hasFlag(argv, '--help')) {
    console.log(usageText('token-build/scripts/build.mjs'));
    return 0;
  }

  const tokensArg = getArg(argv, '--tokens', 'tokens');
  const outArg = getArg(argv, '--out', 'build');
  const theme = getArg(argv, '--theme', 'light');
  const selector = getArg(argv, '--selector', ':root');
  const formatArg = getArg(argv, '--format', 'all') as 'all' | 'css' | 'ts';
  const hasPackage = hasFlag(argv, '--package');
  const packageName = hasPackage ? getArg(argv, '--package') || 'tokens' : undefined;
  const prefix = getArg(argv, '--prefix');
  const force = hasFlag(argv, '--force');
  const dryRun = hasFlag(argv, '--dry-run');
  const visualizer = hasFlag(argv, '--visualizer');
  const specArg = getArg(argv, '--spec');
  const specPath = specArg !== undefined ? fromCwd(specArg) : undefined;
  const profile = getArg(argv, '--profile');
  const allowUnaudited = hasFlag(argv, '--allow-unaudited');

  const result = await compileTokens({
    tokensDir: fromCwd(tokensArg),
    outDir: fromCwd(outArg),
    theme,
    selector,
    format: formatArg,
    packageName,
    prefix,
    profile,
    force,
    dryRun,
    visualizer,
    specPath,
    allowUnaudited,
    log: console.log,
  });

  if (result.error && result.code !== 0) {
    console.error(result.error);
  }

  return result.code === 0 ? 0 : 1;
}

if (isMainModule(import.meta.url, 'build.mjs', 'build.ts')) {
  runBuild().then((code) => process.exit(code));
}
