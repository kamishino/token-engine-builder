/**
 * token-engine — Unified deterministic CLI for W3C DTCG design tokens.
 *
 * Commands:
 *   sync        Run complete pipeline in one pass (extract → math → audit → build)
 *   init        Detect codebase context and initialize tokens.config.json
 *   audit       Verify WCAG 2.1 & APCA contrast floors and check audit stamps
 *   build       Compile tokens to CSS, Tailwind @theme, and typed TS/JS dictionaries
 *   extract     Extract color and typography signals from existing CSS/code
 *   generate    Scaffold 3-tier token tree and populate primitives from spec
 *   scaffold    Generate companion configs for Prettier, Biome, Stylelint, or Tailwind
 *   diagnose    Evaluate design system health, find holes, and report next actions
 *   figma       Import from or export to Figma Variables REST format
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { auditTokens, runAudit } from '../shared/audit.js';
import { compileTokens, runBuild } from '../shared/build.js';
import { usageText } from '../shared/cli-flags.js';
import { runDiagnose } from '../shared/diagnose.js';
import { EXIT } from '../shared/exit-codes.js';
import { runExtract } from '../shared/extract.js';
import { runFigma } from '../shared/figma.js';
import { generateTokens, runGenerate } from '../shared/generate.js';
import { fromCwd, getArg, hasFlag, isMainModule } from '../shared/paths.js';
import { runRoute } from '../shared/route.js';
import { detectCodebaseContext } from '../shared/system-state.js';
import type { Logger } from '../shared/types.js';

function resolveSpecArg(argv: string[]): string {
  return getArg(argv, '--spec', 'tokens.config.json');
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
  generate    Scaffold 3-tier token tree and populate primitives from spec
  scaffold    Generate companion configs for Prettier, Biome, Stylelint, or Tailwind
  diagnose    Evaluate design system health, find holes, and report next actions
  figma       Import from or export to Figma Variables REST format

Options:
  --spec <path>         Path to tokens.config.json (default: tokens.config.json)
  --tokens <dir>        Tokens directory (default: tokens)
  --out <dir>           Build output directory (default: build)
  --theme <name>        Theme to compile: 'all' (default for multi-theme) or theme name (default: light)
  --selector <sel>      Custom CSS scope selector (e.g. ":host, :root", default: :root)
  --package [name]      Scaffold a monorepo workspace package.json
  --root <dir>          Target project root directory (default: current working directory)
  --baseline <file>     Pre-audit baseline JSON for Before-vs-After scorecard
  --allow-unaudited     Compile CSS even without fresh passing audit stamp
  --force               Overwrite existing outputs deliberately
  --dry-run             Preview actions without writing to disk
  --json                Emit machine-readable JSON output
  --quiet               Suppress progress logs and non-error banners
  --help                Show this help message

Exit codes:
  0  Success
  1  Generic or unexpected runtime failure
  2  Usage error (unknown command, missing argument, or invalid CLI flag)
  3  Guard refusal (destination exists, tampered files, unsafe path, missing audit stamp)
  4  Audit failure (contrast floor or unresolved alias gatekeeper shortfall)
  5  Validation failure (tokens.config.json schema validation, syntax, or JSON parse error)`;
}

const SYNC_USAGE = `Usage: token-engine sync [options]

Run complete token pipeline in one pass (extract → math → audit → build).

Options:
  --spec <path>         Path to tokens.config.json (default: tokens.config.json)
  --tokens <dir>        Tokens directory (default: tokens)
  --out <dir>           Build output directory (default: build)
  --theme <name>        Theme to compile: 'all' (default for multi-theme) or theme name (default: light)
  --selector <sel>      Custom CSS scope selector (e.g. ":host, :root", default: :root)
  --package [name]      Scaffold a monorepo workspace package.json
  --root <dir>          Root directory for scanning and output resolution (default: .)
  --baseline <file>     Pre-audit baseline JSON for Before-vs-After delta scorecard
  --allow-unaudited     Proceed to build even if contrast audit fails
  --force               Overwrite existing tokens and outputs
  --dry-run             Preview actions without writing to disk
  --json                Emit structured JSON completion payload
  --quiet               Suppress progress output
  --help                Show this help message`;

const INIT_USAGE = `Usage: token-engine init [options]

Detect codebase context and initialize tokens.config.json.

Options:
  --spec <path>         Path to tokens.config.json (default: tokens.config.json)
  --root <dir>          Root directory to scan (default: .)
  --force               Overwrite existing spec file
  --dry-run             Preview extraction without writing
  --json                Emit machine-readable JSON output
  --help                Show this help message`;

const SCAFFOLD_USAGE = `Usage: token-engine scaffold [options]

Generate starter companion configs for formatter, linter, and CSS setup.

Options:
  --root <dir>          Target project directory (default: .)
  --formatter <name>    Formatter config to generate: prettier (default), biome, or none
  --linter <name>       Style linter config to generate: stylelint (default), eslint, or none
  --css <name>          CSS import file to generate: native (default) or tailwind
  --dry-run             Preview scaffolding without writing
  --json                Emit machine-readable JSON output
  --help                Show this help message`;

export async function runSync(argv: string[]): Promise<number> {
  const rootArg = getArg(argv, '--root');
  const root = rootArg !== undefined ? fromCwd(rootArg) : process.cwd();
  const specArg = resolveSpecArg(argv);
  const specPath = resolve(root, specArg);
  const tokensArg = getArg(argv, '--tokens', 'tokens');
  const tokensDir = resolve(root, tokensArg);
  const outArg = getArg(argv, '--out', 'build');
  const outDir = resolve(root, outArg);
  const themeArg = getArg(argv, '--theme', 'light');
  const selectorArg = getArg(argv, '--selector');
  const packageArg = getArg(argv, '--package');
  const hasPackage = hasFlag(argv, '--package');
  const packageName = hasPackage ? packageArg || 'tokens' : undefined;
  const baselineArg = getArg(argv, '--baseline');
  const baselinePath = baselineArg
    ? resolve(root, baselineArg)
    : existsSync(resolve(root, '.pre-audit-baseline.json'))
      ? resolve(root, '.pre-audit-baseline.json')
      : undefined;
  const force = hasFlag(argv, '--force');
  const dryRun = hasFlag(argv, '--dry-run');
  const allowUnaudited = hasFlag(argv, '--allow-unaudited');
  const asJson = hasFlag(argv, '--json');
  const quiet = hasFlag(argv, '--quiet') || asJson;
  const log: Logger = quiet ? () => {} : console.log;

  const context = detectCodebaseContext(root);
  log(`[token-engine sync] context: ${context.maturity}, runtime: ${context.runtime}, pkg: ${context.packageManager}`);

  // Step 1: Ensure spec exists
  if (!existsSync(specPath)) {
    if (context.maturity === 'brownfield') {
      log(`[token-engine sync] ${specArg} missing; auto-extracting from codebase styling...`);
      const extractFlags = ['--root', root, '--out', specPath, '--audit-baseline'];
      if (force) extractFlags.push('--force');
      if (dryRun) extractFlags.push('--dry-run');
      const extractRes = await runExtract(extractFlags);
      if (extractRes !== 0) {
        const error = `[token-engine sync] extraction failed; please create ${specArg} first.`;
        if (asJson) console.error(JSON.stringify({ error, code: extractRes }));
        else console.error(error);
        return extractRes;
      }
    } else {
      const error = `[token-engine sync] ${specArg} not found. Run "token-engine init" first.`;
      if (asJson) console.error(JSON.stringify({ error, code: EXIT.USAGE }));
      else console.error(error);
      return EXIT.USAGE;
    }
  }

  // Step 2: Mathematical generation (generateTokens core)
  log(`[token-engine sync] generating 3-tier DTCG tokens → ${tokensDir}...`);
  const genResult = generateTokens({
    specPath,
    outDir: tokensDir,
    force,
    dryRun,
    log,
  });
  if (genResult.code !== EXIT.OK) {
    const error = `[token-engine sync] token generation failed: ${genResult.error ?? 'unknown error'}`;
    if (asJson) console.error(JSON.stringify({ error, code: genResult.code }));
    else console.error(error);
    return genResult.code;
  }

  if (dryRun) {
    log(`[token-engine sync] dry-run complete.`);
    return EXIT.OK;
  }

  // Step 3: Accessibility & contrast gatekeeper (auditTokens core with cache)
  log(`[token-engine sync] auditing contrast floors (WCAG 2.1 & APCA)...`);
  const treeCache = new Map<string, unknown>();
  const auditResult = auditTokens({
    tokensDir,
    specPath,
    theme: themeArg === 'all' ? 'both' : themeArg,
    baselinePath,
    treeCache,
    log,
  });

  if (auditResult.code !== EXIT.OK) {
    if (allowUnaudited) {
      log(`[token-engine sync] warning: audit failed, proceeding anyway (--allow-unaudited)`);
    } else {
      const error = `[token-engine sync] audit failed. Fix contrast shortfalls in ${specArg} or pass --allow-unaudited.`;
      if (asJson) console.error(JSON.stringify({ error, code: auditResult.code, audit: auditResult.report }));
      else console.error(error);
      return auditResult.code;
    }
  }

  // Step 4: Zero-dependency compilation (compileTokens core with knownTreeHash)
  log(`[token-engine sync] compiling tokens → ${outDir} (theme: ${themeArg})...`);
  const buildResult = await compileTokens({
    tokensDir,
    outDir,
    theme: themeArg,
    specPath,
    selector: selectorArg ?? (context.runtime === 'shadow-dom' ? ':host, :root' : ':root'),
    packageName,
    force,
    allowUnaudited,
    knownTreeHash: auditResult.treeHash,
    silent: asJson,
    log,
  });

  if (buildResult.code !== EXIT.OK) {
    const error = `[token-engine sync] build failed: ${buildResult.error ?? 'unknown error'}`;
    if (asJson) console.error(JSON.stringify({ error, code: buildResult.code }));
    else console.error(error);
    return buildResult.code;
  }

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          status: 'success',
          spec: specArg,
          tokensDir,
          outDir,
          themes: themeArg === 'all' ? ['light', 'dark', 'high-contrast'] : [themeArg],
          audit: {
            pass: auditResult.code === EXIT.OK,
            minRatio: auditResult.report?.minRatio ?? 4.5,
            minApca: auditResult.report?.minApca ?? 60,
          },
          artifacts: buildResult.artifacts ?? [],
        },
        null,
        2,
      ),
    );
  } else {
    log(`\n✔ [token-engine sync] pipeline complete! All tokens compiled and verified.`);
  }

  return EXIT.OK;
}

export async function runCli(argv = process.argv.slice(2)): Promise<number> {
  // Bare invocation or global help request
  if (argv.length === 0 || ((argv[0] === '--help' || argv[0] === 'help') && argv.length === 1)) {
    console.log(usage());
    return EXIT.OK;
  }

  const command = argv[0] ?? '';
  const rest = argv.slice(1);

  // Per-command help routing
  if (hasFlag(rest, '--help')) {
    switch (command) {
      case 'sync':
        console.log(SYNC_USAGE);
        return EXIT.OK;
      case 'init':
        console.log(INIT_USAGE);
        return EXIT.OK;
      case 'scaffold':
        console.log(SCAFFOLD_USAGE);
        return EXIT.OK;
      case 'audit':
        console.log(usageText('audit'));
        return EXIT.OK;
      case 'build':
        console.log(usageText('build'));
        return EXIT.OK;
      case 'extract':
        console.log(usageText('extract'));
        return EXIT.OK;
      case 'generate':
        console.log(usageText('generate'));
        return EXIT.OK;
      case 'figma':
        console.log(usageText('figma'));
        return EXIT.OK;
      case 'diagnose':
        console.log(usageText('diagnose'));
        return EXIT.OK;
      case 'route':
        console.log(usageText('route'));
        return EXIT.OK;
      default:
        console.error(`unknown command "${command}"\n`);
        console.log(usage());
        return EXIT.USAGE;
    }
  }

  switch (command) {
    case 'sync':
      return runSync(rest);
    case 'init': {
      const root = fromCwd(getArg(rest, '--root', '.'));
      const context = detectCodebaseContext(root);
      console.log(`codebase context: maturity=${context.maturity} runtime=${context.runtime} pkg=${context.packageManager}`);
      if (context.maturity === 'brownfield') {
        const outArg = resolveSpecArg(rest);
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
    case 'generate':
      return runGenerate(rest);
    case 'scaffold':
      return runRoute(['--scaffold', ...rest]);
    case 'route':
      return runRoute(rest);
    case 'diagnose':
      return runDiagnose(rest);
    case 'figma':
      return runFigma(rest);
    default:
      if (command.startsWith('-')) {
        // Flag-first invocation with no command defaults to sync
        return runSync(argv);
      }
      console.error(`unknown command "${command}"\n`);
      console.log(usage());
      return EXIT.USAGE;
  }
}

if (isMainModule(import.meta.url, 'token-engine.mjs', 'token-engine.ts', 'index.ts', 'index.mjs')) {
  runCli().then((code) => process.exit(code));
}
