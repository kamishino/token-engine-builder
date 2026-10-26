/**
 * route — detect design-system state and propose the next skill and command.
 */
import { usageText } from '../../../shared/cli-flags.js';
import { fromCwd, getArg, hasFlag, isMainModule } from '../../../shared/paths.js';
import { routeProject } from '../../../shared/route.js';

export function runRoute(argv = process.argv.slice(2)): number {
  if (hasFlag(argv, '--help')) {
    console.log(usageText('ask-kami/scripts/route.mjs'));
    return 0;
  }
  const root = fromCwd(getArg(argv, '--root', '.'));
  const asJson = hasFlag(argv, '--json');
  const scaffold = hasFlag(argv, '--scaffold');
  const formatter = getArg(argv, '--formatter', 'prettier');
  const linter = getArg(argv, '--linter', 'stylelint');
  const css = getArg(argv, '--css', 'native');
  const force = hasFlag(argv, '--force');
  const dryRun = hasFlag(argv, '--dry-run');

  const result = routeProject({
    root,
    asJson,
    scaffold,
    formatter,
    linter,
    css,
    force,
    dryRun,
    callerUrl: import.meta.url,
    log: console.log,
  });

  if (result.error) {
    console.error(result.error);
  }

  return result.code;
}

if (isMainModule(import.meta.url, 'route.mjs', 'route.ts')) {
  process.exit(runRoute());
}
