/**
 * route — detect design-system state and propose the next skill and command.
 */
import { usageText } from '../../../shared/cli-flags.js';
import { diagnoseDesignSystem } from '../../../shared/diagnose.js';
import { fromCwd, getArg, hasFlag, isMainModule } from '../../../shared/paths.js';
import { resolveSystemPaths } from '../../../shared/system-state.js';

export function runRoute(argv = process.argv.slice(2)): number {
  if (hasFlag(argv, '--help')) {
    console.log(usageText('ask-kami/scripts/route.mjs'));
    return 0;
  }

  const root = fromCwd(getArg(argv, '--root', '.'));
  const asJson = hasFlag(argv, '--json');
  const paths = resolveSystemPaths(root);
  const diagnosis = diagnoseDesignSystem(root, paths);

  if (asJson) {
    const errorCount = diagnosis.findings.filter((f) => f.severity === 'error').length;
    const warningCount = diagnosis.findings.filter((f) => f.severity === 'warning').length;
    const infoCount = diagnosis.findings.filter((f) => f.severity === 'info').length;
    console.log(
      JSON.stringify(
        {
          state: diagnosis.state,
          nextActions: diagnosis.nextActions,
          summary: { errors: errorCount, warnings: warningCount, infos: infoCount },
        },
        null,
        2,
      ),
    );
    return 0;
  }

  const s = diagnosis.state;
  console.log(
    `state: spec=${s.spec.status} tokens=${s.tokens.status} audit=${s.auditStamp} build=${s.build.status}`,
  );
  if (diagnosis.nextActions.length === 0) {
    console.log(
      'next: none — the design system is healthy; run improve-design-system for a full review',
    );
    return 0;
  }

  for (const action of diagnosis.nextActions.slice(0, 3)) {
    const suffix = action.command === undefined ? '' : ` — ${action.command}`;
    console.log(`next: ${action.skill}${suffix}`);
    console.log(`why:  ${action.reason}`);
  }
  return 0;
}

if (isMainModule(import.meta.url, 'route.mjs', 'route.ts')) {
  process.exit(runRoute());
}
