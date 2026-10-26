/**
 * generate — Core 3-tier token tree generator from a StyleSpec.
 */
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { EXIT } from './exit-codes.js';
import {
  assertSafeOutDir,
  checkTokensProvenance,
  decideWrite,
  reportWriteRefusal,
  specInputHash,
  writeTokensProvenance,
} from './guard.js';
import { templatePath } from './paths.js';
import { loadSpecOrError } from './spec.js';
import { planTokenFiles, type PlannedTokenFile } from './token-plan.js';
import type { Logger } from './types.js';

export interface GenerateTokensOptions {
  specPath: string;
  outDir: string;
  force?: boolean;
  dryRun?: boolean;
  log?: Logger;
}

export interface GenerateTokensResult {
  code: number;
  error?: string;
  specName?: string;
}

export function generateTokens(opts: GenerateTokensOptions): GenerateTokensResult {
  const { specPath, outDir, force = false, dryRun = false, log = console.log } = opts;

  if (!existsSync(specPath)) {
    return {
      code: EXIT.USAGE,
      error: `style-spec not found: ${specPath} (run skill token-style or token-engine init first)`,
    };
  }

  const loaded = loadSpecOrError(specPath);
  if (!loaded.ok) {
    return { code: EXIT.VALIDATION, error: loaded.error };
  }
  const { spec, warnings } = loaded;
  for (const warning of warnings) {
    log(`warning: ${warning}`);
  }

  let planned: PlannedTokenFile[];
  try {
    planned = planTokenFiles(spec);
  } catch (error) {
    return {
      code: EXIT.VALIDATION,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const tamper = existsSync(outDir) ? checkTokensProvenance(outDir) : null;

  if (dryRun) {
    log(`would generate 3-tier tokens for "${spec.name}" → ${outDir}`);
    log('would copy: templates/tokens/** (primitive and component templates)');
    for (const { segments, note } of planned) {
      log(`would write: ${segments.join('/')}${note === undefined ? '' : ` (${note})`}`);
    }
    if (tamper !== null && tamper.status !== 'absent') {
      log(`provenance: ${tamper.status}`);
      for (const path of tamper.changed) log(`  changed: ${path}`);
      for (const path of tamper.missing) log(`  missing: ${path}`);
    }
    return { code: EXIT.OK, specName: spec.name };
  }

  const safeError = assertSafeOutDir(outDir, process.cwd());
  if (safeError !== null) {
    return { code: EXIT.REFUSAL, error: safeError };
  }

  const decision = decideWrite({ paths: [outDir], tamper, force });
  if (decision.kind === 'refuse') {
    return {
      code: EXIT.REFUSAL,
      error: reportWriteRefusal(decision, outDir, 'tokens'),
    };
  }
  if (decision.replaces && force && tamper?.status === 'absent') {
    log('adopting existing tree: no manifest found, one will be created');
  }

  log(`writing tokens → ${outDir}`);

  // 1. Scaffold: copy bundled templates/tokens/** → outDir
  mkdirSync(outDir, { recursive: true });
  cpSync(templatePath(import.meta.url, 'tokens'), outDir, { recursive: true, force: true });

  // 2. Populate Tier-1 primitives from the spec
  function writeTokenFile(segments: string[], data: unknown): void {
    const filePath = join(outDir, ...segments);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  }

  for (const { segments, data } of planned) {
    writeTokenFile(segments, data);
  }

  writeTokensProvenance(outDir, specInputHash(spec));
  log(`generated 3-tier tokens for "${spec.name}" → ${outDir}`);

  return { code: EXIT.OK, specName: spec.name };
}
