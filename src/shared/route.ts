/**
 * route — Core design system state detection, diagnosis, and starter scaffolding.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { usageText } from './cli-flags.js';
import { diagnoseDesignSystem } from './diagnose.js';
import { EXIT } from './exit-codes.js';
import { fromCwd, getArg, hasFlag, resolveSkillPathPlaceholders } from './paths.js';
import { resolveSystemPaths } from './system-state.js';
import type { Logger } from './types.js';

export interface RouteProjectOptions {
  root?: string;
  asJson?: boolean;
  scaffold?: boolean;
  formatter?: string;
  linter?: string;
  css?: string;
  force?: boolean;
  dryRun?: boolean;
  callerUrl?: string;
  log?: Logger;
}

export interface RouteProjectResult {
  code: number;
  error?: string;
}

export function routeProject(opts: RouteProjectOptions): RouteProjectResult {
  const root = opts.root ?? process.cwd();
  const {
    asJson = false,
    scaffold = false,
    formatter = 'prettier',
    linter = 'stylelint',
    css = 'native',
    force = false,
    dryRun = false,
    callerUrl = import.meta.url,
    log = console.log,
  } = opts;

  if (scaffold) {
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
              $schema: 'https://biomejs.dev/schemas/2.6.3/schema.json',
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

    let hadCollision = false;
    for (const item of scaffolds) {
      if (dryRun) {
        log(`would scaffold ${item.path}`);
      } else {
        if (existsSync(item.path) && !force) {
          console.error(`file exists: ${item.path} (pass --force to overwrite)`);
          hadCollision = true;
        } else {
          writeFileSync(item.path, item.content, 'utf8');
          log(`scaffolded: ${item.path}`);
        }
      }
    }
    return { code: hadCollision ? EXIT.REFUSAL : EXIT.OK };
  }

  const paths = resolveSystemPaths(root);
  const diagnosis = diagnoseDesignSystem(root, paths);

  if (asJson) {
    const errorCount = diagnosis.findings.filter((f) => f.severity === 'error').length;
    const warningCount = diagnosis.findings.filter((f) => f.severity === 'warning').length;
    const infoCount = diagnosis.findings.filter((f) => f.severity === 'info').length;
    log(
      JSON.stringify(
        {
          state: diagnosis.state,
          nextActions: diagnosis.nextActions.map((action) =>
            action.command === undefined
              ? action
              : {
                  ...action,
                  command: resolveSkillPathPlaceholders(action.command, callerUrl),
                },
          ),
          summary: { errors: errorCount, warnings: warningCount, infos: infoCount },
        },
        null,
        2,
      ),
    );
    return { code: EXIT.OK };
  }

  const s = diagnosis.state;
  log(
    `state: spec=${s.spec.status} tokens=${s.tokens.status} audit=${s.auditStamp} build=${s.build.status} context=${s.context.maturity} runtime=${s.context.runtime} pkg=${s.context.packageManager}`,
  );
  if (diagnosis.nextActions.length === 0) {
    log(
      'next: none — the design system is healthy; run token-engine diagnose for a full review',
    );
    return { code: EXIT.OK };
  }

  let unresolved = false;
  for (const action of diagnosis.nextActions.slice(0, 3)) {
    const command =
      action.command === undefined
        ? undefined
        : resolveSkillPathPlaceholders(action.command, callerUrl);
    unresolved ||= command?.includes('-root>') ?? false;
    const suffix = command === undefined ? '' : ` — ${command}`;
    log(`next: ${action.skill}${suffix}`);
    log(`why:  ${action.reason}`);
  }
  if (unresolved) {
    log(
      'note: replace any <...-root> placeholder in the command with the installed folder of that skill before running it.',
    );
  }
  return { code: EXIT.OK };
}

export function runRoute(argv = process.argv.slice(2)): number {
  if (hasFlag(argv, '--help')) {
    console.log(usageText('route'));
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
