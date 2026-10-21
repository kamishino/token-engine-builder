/**
 * generate — scaffold the 3-tier token tree from bundled templates and
 * populate Tier-1 primitives from a style-spec.json (skill token-style output).
 */
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { usageText } from '../../../shared/cli-flags.js';
import {
  assertSafeOutDir,
  checkTokensProvenance,
  decideWrite,
  specInputHash,
  writeTokensProvenance,
} from '../../../shared/guard.js';
import {
  fromCwd,
  getArg,
  hasFlag,
  isMainModule,
  resolveSkillPathPlaceholders,
  templatePath,
} from '../../../shared/paths.js';
import { loadStyleSpec } from '../../../shared/spec.js';
import { planTokenFiles } from '../../../shared/token-plan.js';
import type { StyleSpec } from '../../../shared/types.js';

export function runGenerate(argv = process.argv.slice(2)): number {
  if (hasFlag(argv, '--help')) {
    console.log(usageText('token-math/scripts/generate.mjs'));
    return 0;
  }

  const specPath = fromCwd(getArg(argv, '--spec', 'style-spec.json'));
  const outDir = fromCwd(getArg(argv, '--out', 'tokens'));
  const force = hasFlag(argv, '--force');
  const dryRun = hasFlag(argv, '--dry-run');

  if (!existsSync(specPath)) {
    console.error(`style-spec not found: ${specPath} (run skill token-style first)`);
    return 1;
  }
  const tamper = existsSync(outDir) ? checkTokensProvenance(outDir) : null;

  let spec: StyleSpec;
  let warnings: string[];
  try {
    const loaded = loadStyleSpec(specPath);
    spec = loaded.spec;
    warnings = loaded.warnings;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
  for (const warning of warnings) {
    console.log(`warning: ${warning}`);
  }
  let planned: ReturnType<typeof planTokenFiles>;
  try {
    planned = planTokenFiles(spec);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
  if (dryRun) {
    console.log(`would generate 3-tier tokens for "${spec.name}" → ${outDir}`);
    console.log('would copy: templates/tokens/** (primitive and component templates)');
    for (const { segments, note } of planned) {
      console.log(`would write: ${segments.join('/')}${note === undefined ? '' : ` (${note})`}`);
    }
    if (tamper !== null && tamper.status !== 'absent') {
      console.log(`provenance: ${tamper.status}`);
      for (const path of tamper.changed) console.log(`  changed: ${path}`);
      for (const path of tamper.missing) console.log(`  missing: ${path}`);
    }
    return 0;
  }

  const safeError = assertSafeOutDir(outDir, process.cwd());
  if (safeError !== null) {
    console.error(safeError);
    return 1;
  }

  const decision = decideWrite({ paths: [outDir], tamper, force });
  if (decision.kind === 'refuse') {
    if (decision.reason === 'tampered') {
      console.error(`refusing to overwrite hand-edited tokens in ${outDir}:`);
      for (const path of decision.changed) console.error(`  changed: ${path}`);
      for (const path of decision.missing) console.error(`  missing: ${path}`);
      console.error('pass --force to overwrite deliberately');
    } else {
      console.error(`output exists: ${outDir} (pass --force to overwrite)`);
    }
    return 1;
  }
  if (decision.replaces && force && tamper?.status === 'absent') {
    console.log('adopting existing tree: no manifest found, one will be created');
  }

  console.log(`writing tokens → ${outDir}`);

  // 1. Scaffold: copy bundled templates/tokens/** → --out (portable via import.meta.url).
  mkdirSync(outDir, { recursive: true });
  cpSync(templatePath(import.meta.url, 'tokens'), outDir, { recursive: true, force: true });

  // 2. Populate Tier-1 primitives from the spec; tiers 2–3 stay alias-only templates.

  function writeTokenFile(segments: string[], data: unknown): void {
    const filePath = join(outDir, ...segments);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  }

  for (const { segments, data } of planned) {
    writeTokenFile(segments, data);
  }

  writeTokensProvenance(outDir, specInputHash(spec));
  console.log(`generated 3-tier tokens for "${spec.name}" → ${outDir}`);
  const auditCommand = resolveSkillPathPlaceholders(
    `node <token-audit-root>/scripts/audit.mjs --tokens ${getArg(argv, '--out', 'tokens')} --min-ratio 4.5`,
    import.meta.url,
  );
  console.log(`next: ${auditCommand}`);
  if (auditCommand.includes('-root>')) {
    console.log(
      'note: install token-audit or replace <token-audit-root> with its installed folder.',
    );
  }
  return 0;
}

if (isMainModule(import.meta.url, 'generate.mjs', 'generate.ts')) {
  process.exit(runGenerate());
}
