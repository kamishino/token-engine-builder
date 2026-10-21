/**
 * diagnose — inspect design-system state and emit structured JSON findings.
 */
import { usageText } from '../../../shared/cli-flags.js';
import { diagnoseDesignSystem } from '../../../shared/diagnose.js';
import {
  fromCwd,
  getArg,
  hasFlag,
  isMainModule,
  resolveSkillPathPlaceholders,
} from '../../../shared/paths.js';
import { resolveSystemPaths, type SystemPaths } from '../../../shared/system-state.js';

export function runDiagnose(argv = process.argv.slice(2)): number {
  if (hasFlag(argv, '--help')) {
    console.log(usageText('improve-design-system/scripts/diagnose.mjs'));
    return 0;
  }

  const root = fromCwd(getArg(argv, '--root', '.'));
  const specArg = getArg(argv, '--spec');
  const tokensArg = getArg(argv, '--tokens');
  const buildArg = getArg(argv, '--build');

  const overrides: Partial<SystemPaths> = {
    ...(specArg !== undefined ? { spec: fromCwd(specArg) } : {}),
    ...(tokensArg !== undefined ? { tokens: fromCwd(tokensArg) } : {}),
    ...(buildArg !== undefined ? { build: fromCwd(buildArg) } : {}),
  };

  const paths = resolveSystemPaths(root, overrides);
  const diagnosis = diagnoseDesignSystem(root, paths);
  const nextActions = diagnosis.nextActions.map((action) =>
    action.command === undefined
      ? action
      : { ...action, command: resolveSkillPathPlaceholders(action.command, import.meta.url) },
  );
  console.log(JSON.stringify({ ...diagnosis, nextActions }, null, 2));
  return 0;
}

if (isMainModule(import.meta.url, 'diagnose.mjs', 'diagnose.ts')) {
  process.exit(runDiagnose());
}
