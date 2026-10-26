/**
 * generate — scaffold the 3-tier token tree from bundled templates and
 * populate Tier-1 primitives from a style-spec.json (skill token-style output).
 */
import { usageText } from '../../../shared/cli-flags.js';
import { generateTokens } from '../../../shared/generate.js';
import {
  fromCwd,
  getArg,
  hasFlag,
  isMainModule,
  resolveSkillPathPlaceholders,
} from '../../../shared/paths.js';

export function runGenerate(argv = process.argv.slice(2)): number {
  if (hasFlag(argv, '--help')) {
    console.log(usageText('token-math/scripts/generate.mjs'));
    return 0;
  }

  const specPath = fromCwd(getArg(argv, '--spec', 'style-spec.json'));
  const outDir = fromCwd(getArg(argv, '--out', 'tokens'));
  const force = hasFlag(argv, '--force');
  const dryRun = hasFlag(argv, '--dry-run');

  const result = generateTokens({
    specPath,
    outDir,
    force,
    dryRun,
    log: console.log,
  });

  if (result.error) {
    console.error(result.error);
    return 1;
  }

  if (!dryRun) {
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
  }

  return result.code === 0 ? 0 : 1;
}

if (isMainModule(import.meta.url, 'generate.mjs', 'generate.ts')) {
  process.exit(runGenerate());
}
