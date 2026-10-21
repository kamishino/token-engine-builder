/**
 * audit — WCAG 2.1 gatekeeper over a 3-tier token tree.
 * Exit 0 = pass, 1 = contrast failure / unresolved alias / raw value above Tier 1.
 */
import { existsSync } from 'node:fs';
import { auditTokens } from '../../../shared/audit-report.js';
import { usageText } from '../../../shared/cli-flags.js';
import { removeAuditStamp, specInputHash, writeAuditStamp } from '../../../shared/guard.js';
import { fromCwd, getArg, hasFlag, isMainModule } from '../../../shared/paths.js';
import { loadStyleSpec } from '../../../shared/spec.js';
import { semanticDir } from '../../../shared/tokens.js';

export function runAudit(argv = process.argv.slice(2)): number {
  if (hasFlag(argv, '--help')) {
    console.log(usageText('token-audit/scripts/audit.mjs'));
    return 0;
  }

  const tokensDir = fromCwd(getArg(argv, '--tokens', 'tokens'));
  const theme = getArg(argv, '--theme', 'both');
  const specArg = getArg(argv, '--spec');
  let minRatio = Number(getArg(argv, '--min-ratio', '4.5'));
  let specHash: string | undefined;
  if (specArg !== undefined) {
    try {
      const spec = loadStyleSpec(fromCwd(specArg)).spec;
      if (!argv.includes('--min-ratio') && typeof spec.targets?.minWcagRatio === 'number') {
        minRatio = spec.targets.minWcagRatio;
      }
      specHash = specInputHash(spec);
    } catch {
      console.error(`style-spec not readable: ${specArg}`);
      return 1;
    }
  }
  const minApca = Number(getArg(argv, '--min-apca', '60'));
  const asJson = hasFlag(argv, '--json');

  if (!existsSync(tokensDir)) {
    console.error(`tokens dir not found: ${tokensDir}`);
    return 1;
  }

  const result = auditTokens(tokensDir, {
    theme,
    minRatio,
    minApca,
    ...(specHash === undefined ? {} : { specHash }),
  });
  const semanticDirectory = semanticDir(tokensDir);

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          pass: result.pass,
          minRatio: result.minRatio,
          minApca: result.minApca,
          provenance: result.provenance,
          ...(result.specBinding === undefined ? {} : { specBinding: result.specBinding }),
          themes: result.themes,
        },
        null,
        2,
      ),
    );
  } else {
    for (const [name, report] of Object.entries(result.themes)) {
      console.log(`\n[${name}] min WCAG ratio ${minRatio}:1`);
      for (const pair of report.pairs) {
        const suffix =
          pair.kind === 'border'
            ? ' (border)'
            : pair.kind === 'decorative'
              ? ' (border, decorative)'
              : '';
        console.log(
          `  ${pair.pass ? 'PASS' : 'FAIL'}  ${pair.ratio.toFixed(2)}:1  Lc ${pair.apcaLc.toFixed(1)}  ${pair.foreground} on ${pair.background}${suffix}`,
        );
      }
      for (const item of report.unresolvedAliases) console.log(`  FAIL  unresolved alias: ${item}`);
      for (const item of report.rawValueViolations) console.log(`  FAIL  ${item}`);
    }
    const provenanceFails =
      result.provenance.status === 'tampered' || result.provenance.status === 'unreadable';
    if (provenanceFails) {
      const parts = [
        ...result.provenance.changed.map((path) => `changed: ${path}`),
        ...result.provenance.missing.map((path) => `missing: ${path}`),
      ];
      console.log(`  FAIL  provenance: ${parts.join('; ') || result.provenance.status}`);
    } else if (result.provenance.status === 'absent') {
      console.log('  note: no provenance manifest (tree predates the guard)');
    }
    if (result.specBinding !== undefined && result.specBinding !== 'match') {
      console.log(
        `  FAIL  spec binding: ${result.specBinding} (tokens were generated from a different spec)`,
      );
    }
    if (Object.keys(result.themes).length === 0) {
      console.log(`  FAIL  no semantic themes found under ${semanticDirectory}`);
    }
    console.log(`\naudit ${result.pass ? 'PASS' : 'FAIL'}`);
  }

  // Audit stamp: token-build verifies this hash before building (verified gate).
  if (result.pass) {
    writeAuditStamp(tokensDir, { minRatio: result.minRatio, minApca: result.minApca });
  } else {
    removeAuditStamp(tokensDir);
  }

  return result.pass ? 0 : 1;
}

if (isMainModule(import.meta.url, 'audit.mjs', 'audit.ts')) {
  process.exit(runAudit());
}
