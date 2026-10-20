/**
 * build — compile a 3-tier token tree to CSS custom properties + Tailwind v4 `@theme`
 * via Style Dictionary v5 (programmatic, bundled; see templates/sd.config.json for shape).
 *
 * Usage: node ./scripts/build.mjs --tokens <dir> --out <dir> [--theme <name>] [--prefix <name>] [--spec <style-spec.json>] [--profile <id>] [--visualizer] [--allow-unaudited] [--force] [--dry-run]
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { oklchToHex } from '../../../shared/colors.js';
import { buildTokens, DEFAULT_ARTIFACTS } from '../../../shared/compiler.js';
import {
  assertSafeOutDir,
  checkAuditStamp,
  checkCssProvenance,
  computeTreeHash,
  sha256Hex,
  writeCssProvenance,
} from '../../../shared/guard.js';
import { fromCwd, getArg, hasFlag, isMainModule, templatePath } from '../../../shared/paths.js';
import { loadStyleSpec } from '../../../shared/spec.js';
import type { BuildTokensOptions } from '../../../shared/types.js';
import {
  buildUiProfile,
  profileFileName,
  UI_PROFILE_IDS,
  type UiProfileId,
} from '../../../shared/ui-profiles.js';

export async function runBuild(argv = process.argv.slice(2)): Promise<number> {
  if (hasFlag(argv, '--help')) {
    console.log(
      'Usage: build.mjs --tokens <dir> --out <dir> [--theme <name>] [--prefix <name>] [--spec <style-spec.json>] [--profile <id>] [--visualizer] [--allow-unaudited] [--force] [--dry-run]',
    );
    return 0;
  }

  const tokensArg = getArg(argv, '--tokens', 'tokens') as string;
  const outArg = getArg(argv, '--out', 'build') as string;
  const theme = getArg(argv, '--theme', 'light') as string;
  const prefix = getArg(argv, '--prefix');
  const force = hasFlag(argv, '--force');
  const dryRun = hasFlag(argv, '--dry-run');
  const visualizer = hasFlag(argv, '--visualizer');
  const specArg = getArg(argv, '--spec');

  let guide: BuildTokensOptions['guide'];
  if (specArg !== undefined) {
    const specPath = fromCwd(specArg);
    if (!existsSync(specPath)) {
      console.error(`style-spec not found: ${specPath}`);
      return 1;
    }
    let spec;
    try {
      spec = loadStyleSpec(specPath).spec;
    } catch (error) {
      console.error(
        `style-spec not readable: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 1;
    }
    const primary = spec.palette.find((entry) => entry.role === 'primary');
    const secondary = spec.palette.find((entry) => entry.role === 'secondary');
    guide = {
      name: spec.name,
      ...(spec.guide?.overview === undefined ? {} : { overview: spec.guide.overview }),
      ...(spec.guide?.dos === undefined ? {} : { dos: spec.guide.dos }),
      ...(spec.guide?.donts === undefined ? {} : { donts: spec.guide.donts }),
      ...(primary === undefined ? {} : { primaryHex: oklchToHex(primary.anchor) }),
      ...(secondary === undefined ? {} : { secondaryHex: oklchToHex(secondary.anchor) }),
      scale: spec.typography.ratio,
      density: spec.density,
    };
  }
  const tokensDir = fromCwd(tokensArg);
  if (!existsSync(tokensDir)) {
    console.error(`tokens dir not found: ${tokensDir} (run token-math generate first)`);
    return 1;
  }

  // Any theme with a semantic/<theme>.tokens.json file is buildable.
  const semanticFile = `${tokensArg.replaceAll('\\', '/')}/semantic/${theme}.tokens.json`;
  if (!existsSync(fromCwd(semanticFile))) {
    console.error(`theme not found: ${semanticFile}`);
    return 1;
  }

  // Portable base-config template ships with the skill; compiler mirrors its shape.
  const baseConfig = templatePath(import.meta.url, 'sd.config.json');
  if (!existsSync(baseConfig)) {
    console.error(`bundled template missing: ${baseConfig} (skill package is incomplete)`);
    return 1;
  }

  const profileArg = getArg(argv, '--profile');
  if (profileArg !== undefined && !(UI_PROFILE_IDS as readonly string[]).includes(profileArg)) {
    console.error(`unknown profile "${profileArg}" (valid: ${UI_PROFILE_IDS.join(', ')})`);
    return 1;
  }
  const profile = profileArg as UiProfileId | undefined;

  const outDir = fromCwd(outArg);
  const outputPaths =
    profile === undefined
      ? DEFAULT_ARTIFACTS.map((name) => join(outDir, name))
      : [join(outDir, profileFileName(profile))];
  const outputsExist = outputPaths.some((path) => existsSync(path));
  const tamper = checkCssProvenance(outDir);

  if (dryRun) {
    console.log(
      profile === undefined
        ? `would build (${theme}) → ${outDir}`
        : `would build profile ${profile} (light + dark) → ${outDir}`,
    );
    if (outputsExist) console.log(`provenance: ${tamper.status}`);
    console.log(`audit stamp: ${checkAuditStamp(tokensDir)}`);
    return 0;
  }

  const safeError = assertSafeOutDir(outDir, process.cwd());
  if (safeError !== null) {
    console.error(safeError);
    return 1;
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
    return 1;
  }
  if (outputsExist && force && (tamper.status === 'tampered' || tamper.status === 'unreadable')) {
    console.log('overwriting hand-edited CSS (--force)');
  }

  // Verified gate: refuse to build a tree without a fresh passing audit stamp.
  const allowUnaudited = hasFlag(argv, '--allow-unaudited');
  if (allowUnaudited) {
    console.log('warning: building without a fresh audit pass (--allow-unaudited)');
  } else if (checkAuditStamp(tokensDir) !== 'pass') {
    console.error(
      `refusing to build: no fresh audit pass for this exact tree (stamp: ${checkAuditStamp(tokensDir)}). Run token-audit first, or pass --allow-unaudited.`,
    );
    return 1;
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
    if (profile === undefined) {
      const outputs = await buildTokens({
        source,
        outDir: outArg.replaceAll('\\', '/'),
        label: theme,
        ...(guide === undefined ? {} : { guide }),
        ...(prefix === undefined ? {} : { prefix }),
        visualizer,
      });
      const outputList = Object.values(outputs);
      const missing = outputList.filter((path) => !existsSync(fromCwd(path)));
      if (missing.length > 0) {
        console.error(
          `build failed: Style Dictionary produced no tokens for ${missing.join(', ')}`,
        );
        return 1;
      }
      const inputHash = computeTreeHash(tokensDir);
      const files: Record<string, string> = {
        'DESIGN.md': sha256Hex(readFileSync(fromCwd(outputs.designMd))),
        'components.md': sha256Hex(readFileSync(fromCwd(outputs.componentsMd))),
        'theme.css': sha256Hex(readFileSync(fromCwd(outputs.themeCss))),
        'tokens.css': sha256Hex(readFileSync(fromCwd(outputs.tokensCss))),
        ...(outputs.visualizerHtml === undefined
          ? {}
          : { 'visualizer.html': sha256Hex(readFileSync(fromCwd(outputs.visualizerHtml))) }),
      };
      writeCssProvenance(outDir, inputHash, files);
      console.log(`built (${theme}) → ${outputList.join(', ')}`);
      return 0;
    }

    const profileOutputs = await buildUiProfile(profile, tokensDir, outArg.replaceAll('\\', '/'));
    const missing = profileOutputs.filter((path) => !existsSync(fromCwd(path)));
    if (missing.length > 0) {
      console.error(`build failed: Style Dictionary produced no tokens for ${missing.join(', ')}`);
      return 1;
    }
    const inputHash = computeTreeHash(tokensDir);
    const files: Record<string, string> = {
      [profileFileName(profile)]: sha256Hex(readFileSync(fromCwd(profileOutputs[0] as string))),
    };
    writeCssProvenance(outDir, inputHash, files);
    console.log(`built profile ${profile} → ${profileOutputs.join(', ')}`);
    return 0;
  } catch (error) {
    console.error(`build failed: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

if (isMainModule(import.meta.url, 'build.mjs', 'build.ts')) {
  runBuild().then((code) => process.exit(code));
}
