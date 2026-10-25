/**
 * token-engine — Unified deterministic CLI for W3C DTCG design tokens.
 *
 * Commands:
 *   sync      Run complete pipeline in one pass (extract → math → audit → build)
 *   init      Detect codebase context and initialize style-spec.json
 *   audit     Verify WCAG 2.1 & APCA contrast floors
 *   build     Compile tokens to CSS, Tailwind @theme, and typed TS/JS dictionaries
 *   extract   Extract color signals from raw CSS/code
 *   scaffold  Generate starter toolchain configs (Prettier, Stylelint, Tailwind)
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fromCwd, getArg, hasFlag, isMainModule } from '../shared/paths.js';
import { detectCodebaseContext } from '../shared/system-state.js';
import { runRoute } from '../skills/ask-kami/scripts/route.js';
import { runAudit } from '../skills/token-audit/scripts/audit.js';
import { runBuild } from '../skills/token-build/scripts/build.js';
import { runExtract } from '../skills/token-extract/scripts/extract.js';
import { runGenerate } from '../skills/token-math/scripts/generate.js';
function resolveSpecArg(argv: string[], root: string): string {
  const explicit = getArg(argv, '--spec');
  if (explicit) return explicit;
  if (existsSync(join(root, 'tokens.config.json'))) return 'tokens.config.json';
  if (existsSync(join(root, 'style-spec.json'))) return 'style-spec.json';
  return 'tokens.config.json';
}

export function usage(): string {
  return `Usage: token-engine <command> [options]

Deterministic design token pipeline for W3C DTCG, OKLCH scales, and Style Dictionary.

Commands:
  sync        Run complete pipeline in one pass (extract → math → audit → build)
  init        Detect codebase context and initialize tokens.config.json
  audit       Verify WCAG 2.1 and APCA contrast floors and check audit stamps
  build       Compile tokens to CSS, Tailwind @theme, and typed TS/JS dictionaries
  extract     Extract color and typography signals from existing CSS/code
  scaffold    Generate companion configs for Prettier, Biome, Stylelint, or Tailwind

Options:
  --spec <path>         Path to tokens.config.json (default: tokens.config.json or style-spec.json)
  --tokens <dir>        Tokens directory (default: tokens)
  --out <dir>           Build output directory (default: build)
  --selector <sel>      Custom CSS scope selector (e.g. ":host, :root", default: :root)
  --package [name]      Scaffold a monorepo workspace package.json
  --baseline <file>     Pre-audit baseline JSON for Before-vs-After scorecard
  --audit-baseline      Extract production CSS contrast baseline before generating
  --allow-unaudited     Compile CSS even without fresh passing audit stamp
  --force               Overwrite existing outputs deliberately
  --dry-run             Preview actions without writing to disk
  --help                Show this help message`;
}

export async function runSync(argv: string[]): Promise<number> {
  const root = process.cwd();
  const specArg = resolveSpecArg(argv, root);
  const tokensArg = getArg(argv, '--tokens', 'tokens');
  const outArg = getArg(argv, '--out', 'build');
  const themeArg = getArg(argv, '--theme', 'light');
  const selectorArg = getArg(argv, '--selector');
  const packageArg = getArg(argv, '--package');
  const hasPackage = hasFlag(argv, '--package');
  const baselineArg = getArg(argv, '--baseline');
  const force = hasFlag(argv, '--force');
  const dryRun = hasFlag(argv, '--dry-run');
  const specPath = fromCwd(specArg);
  const context = detectCodebaseContext(root);

  console.log(`[token-engine sync] context: ${context.maturity}, runtime: ${context.runtime}, pkg: ${context.packageManager}`);

  // Step 1: Ensure spec exists
  if (!existsSync(specPath)) {
    if (context.maturity === 'brownfield') {
      console.log(`[token-engine sync] ${specArg} missing; auto-extracting from codebase styling...`);
      const extractFlags = ['--root', root, '--out', specArg, '--audit-baseline'];
      if (force) extractFlags.push('--force');
      if (dryRun) extractFlags.push('--dry-run');
      const extractCode = await runExtract(extractFlags);
      if (extractCode !== 0) {
        console.error(`[token-engine sync] extraction failed; please create ${specArg} first.`);
        return extractCode;
      }
    } else {
      console.error(`[token-engine sync] ${specArg} not found. Run "token-engine init" first.`);
      return 1;
    }
  }

  // Step 2: Mathematical generation (token-math)
  console.log(`[token-engine sync] generating 3-tier DTCG tokens → ${tokensArg}...`);
  const generateFlags = ['--spec', specArg, '--out', tokensArg];
  if (force) generateFlags.push('--force');
  if (dryRun) generateFlags.push('--dry-run');
  const generateCode = runGenerate(generateFlags);
  if (generateCode !== 0) {
    console.error(`[token-engine sync] token generation failed.`);
    return generateCode;
  }

  if (dryRun) {
    console.log(`[token-engine sync] dry-run complete.`);
    return 0;
  }

  // Step 3: Accessibility & contrast gatekeeper (token-audit)
  console.log(`[token-engine sync] auditing contrast floors (WCAG 2.1 & APCA)...`);
  const auditFlags = ['--tokens', tokensArg, '--spec', specArg];
  if (baselineArg) {
    auditFlags.push('--baseline', baselineArg);
  } else if (existsSync(fromCwd('.pre-audit-baseline.json'))) {
    auditFlags.push('--baseline', '.pre-audit-baseline.json');
  }
  const auditCode = runAudit(auditFlags);
  if (auditCode !== 0) {
    console.error(`[token-engine sync] audit failed. Fix contrast shortfalls in ${specArg} or pass --allow-unaudited.`);
    return auditCode;
  }

  // Step 4: Zero-dependency compilation (token-build)
  console.log(`[token-engine sync] compiling tokens → ${outArg} (theme: ${themeArg})...`);
  const buildFlags = ['--tokens', tokensArg, '--out', outArg, '--theme', themeArg, '--spec', specArg];
  if (selectorArg) {
    buildFlags.push('--selector', selectorArg);
  } else if (context.runtime === 'shadow-dom') {
    buildFlags.push('--selector', ':host, :root');
  }
  if (hasPackage) {
    buildFlags.push('--package');
    if (packageArg) buildFlags.push(packageArg);
  }
  if (force) buildFlags.push('--force');

  const buildCode = await runBuild(buildFlags);
  if (buildCode !== 0) {
    console.error(`[token-engine sync] build failed.`);
    return buildCode;
  }

  console.log(`\n✔ [token-engine sync] pipeline complete! All tokens compiled and verified.`);
  return 0;
}

export async function runCli(argv = process.argv.slice(2)): Promise<number> {
  if (argv.length === 0 || hasFlag(argv, '--help') || argv[0] === 'help') {
    console.log(usage());
    return 0;
  }

  const command = argv[0] ?? '';
  const rest = argv.slice(1);

  switch (command) {
    case 'sync':
      return runSync(rest);
    case 'init': {
      const root = fromCwd(getArg(rest, '--root', '.'));
      const context = detectCodebaseContext(root);
      console.log(`codebase context: maturity=${context.maturity} runtime=${context.runtime} pkg=${context.packageManager}`);
      if (context.maturity === 'brownfield') {
        const outArg = resolveSpecArg(rest, root);
        console.log(`existing styling detected; extracting candidate ${outArg}...`);
        return runExtract(['--out', outArg, ...rest]);
      }
      return runRoute(rest);
    }
    case 'audit':
      return runAudit(rest);
    case 'build':
      return runBuild(rest);
    case 'extract':
      return runExtract(rest);
    case 'scaffold':
      return runRoute(['--scaffold', ...rest]);
    case 'route':
      return runRoute(rest);
    default:
      if (command.startsWith('-')) {
        // Default to sync if flags are passed directly
        return runSync(argv);
      }
      console.error(`unknown command "${command}"\n`);
      console.log(usage());
      return 1;
  }
}

if (isMainModule(import.meta.url, 'token-engine.mjs', 'token-engine.ts', 'index.ts', 'index.mjs')) {
  runCli().then((code) => process.exit(code));
}
