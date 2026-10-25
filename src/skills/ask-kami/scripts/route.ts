/**
 * route — detect design-system state and propose the next skill and command.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { usageText } from '../../../shared/cli-flags.js';
import { diagnoseDesignSystem } from '../../../shared/diagnose.js';
import {
  fromCwd,
  getArg,
  hasFlag,
  isMainModule,
  resolveSkillPathPlaceholders,
} from '../../../shared/paths.js';
import { resolveSystemPaths } from '../../../shared/system-state.js';

export function runRoute(argv = process.argv.slice(2)): number {
  if (hasFlag(argv, '--help')) {
    console.log(usageText('ask-kami/scripts/route.mjs'));
    return 0;
  }
  const root = fromCwd(getArg(argv, '--root', '.'));
  const asJson = hasFlag(argv, '--json');

  if (hasFlag(argv, '--scaffold')) {
    const formatter = getArg(argv, '--formatter', 'prettier');
    const linter = getArg(argv, '--linter', 'stylelint');
    const css = getArg(argv, '--css', 'native');
    const force = hasFlag(argv, '--force');
    const dryRun = hasFlag(argv, '--dry-run');

    const scaffolds: Array<{ path: string; content: string }> = [];

    if (formatter === 'prettier') {
      scaffolds.push({
        path: join(root, '.prettierrc.json'),
        content:
          JSON.stringify({ semi: true, singleQuote: true, trailingComma: 'all' }, null, 2) + '\n',
      });
    } else if (formatter === 'biome') {
      scaffolds.push({
        path: join(root, 'biome.json'),
        content:
          JSON.stringify(
            {
              $schema: 'https://biomejs.dev/schemas/1.8.3/schema.json',
              formatter: { enabled: true, indentStyle: 'space', lineWidth: 100 },
            },
            null,
            2,
          ) + '\n',
      });
    }

    if (linter === 'stylelint') {
      scaffolds.push({
        path: join(root, '.stylelintrc.json'),
        content: JSON.stringify({ rules: { 'color-no-hex': true } }, null, 2) + '\n',
      });
    } else if (linter === 'eslint') {
      scaffolds.push({
        path: join(root, '.eslintrc.json'),
        content:
          JSON.stringify(
            {
              rules: {
                'no-restricted-properties': [
                  'error',
                  {
                    property: 'style',
                    message: 'Use design tokens custom properties instead of inline styles.',
                  },
                ],
              },
            },
            null,
            2,
          ) + '\n',
      });
    }

    if (css === 'tailwind') {
      scaffolds.push({
        path: join(root, 'theme.import.css'),
        content: '@import "tailwindcss";\n@import "./build/theme.css";\n',
      });
    } else if (css === 'native') {
      scaffolds.push({
        path: join(root, 'tokens.import.css'),
        content: '@import "./build/tokens.css";\n',
      });
    }

    for (const item of scaffolds) {
      if (dryRun) {
        console.log(`would scaffold ${item.path}`);
      } else {
        if (existsSync(item.path) && !force) {
          console.error(`file exists: ${item.path} (pass --force to overwrite)`);
        } else {
          writeFileSync(item.path, item.content, 'utf8');
          console.log(`scaffolded: ${item.path}`);
        }
      }
    }
    return 0;
  }

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
          nextActions: diagnosis.nextActions.map((action) =>
            action.command === undefined
              ? action
              : {
                  ...action,
                  command: resolveSkillPathPlaceholders(action.command, import.meta.url),
                },
          ),
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
    `state: spec=${s.spec.status} tokens=${s.tokens.status} audit=${s.auditStamp} build=${s.build.status} context=${s.context.maturity} runtime=${s.context.runtime} pkg=${s.context.packageManager}`,
  );
  if (diagnosis.nextActions.length === 0) {
    console.log(
      'next: none — the design system is healthy; run improve-design-system for a full review',
    );
    return 0;
  }

  let unresolved = false;
  for (const action of diagnosis.nextActions.slice(0, 3)) {
    const command =
      action.command === undefined
        ? undefined
        : resolveSkillPathPlaceholders(action.command, import.meta.url);
    unresolved ||= command?.includes('-root>') ?? false;
    const suffix = command === undefined ? '' : ` — ${command}`;
    console.log(`next: ${action.skill}${suffix}`);
    console.log(`why:  ${action.reason}`);
  }
  if (unresolved) {
    console.log(
      'note: replace any <...-root> placeholder in the command with the installed folder of that skill before running it.',
    );
  }
  return 0;
}

if (isMainModule(import.meta.url, 'route.mjs', 'route.ts')) {
  process.exit(runRoute());
}
