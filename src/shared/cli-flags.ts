/**
 * The shipped CLI surface: one declaration per subcommand. Flags drive the
 * `--help` usage line and the SKILL.md parity check in scripts/lint-skills.mjs.
 */
export interface FlagSpec {
  flag: string;
  /** Value placeholder rendered after the flag; omit for boolean flags. */
  arg?: string;
  /** Mandatory flag: rendered without brackets. */
  required?: true;
}

export interface CommandSpec {
  /** Replaces the generated usage line (multi-command or bespoke scripts). */
  usage?: string;
  flags: readonly FlagSpec[];
}

export const COMMAND_KEYS = [
  'sync',
  'init',
  'audit',
  'build',
  'extract',
  'generate',
  'scaffold',
  'route',
  'diagnose',
  'figma',
] as const;

export type CommandKey = (typeof COMMAND_KEYS)[number];

export const COMMANDS: Record<CommandKey, CommandSpec> = {
  sync: {
    flags: [
      { flag: '--root', arg: '<dir>' },
      { flag: '--spec', arg: '<tokens.config.json>' },
      { flag: '--tokens', arg: '<dir>' },
      { flag: '--out', arg: '<dir>' },
      { flag: '--theme', arg: 'light|dark|all' },
      { flag: '--selector', arg: '<css-selector>' },
      { flag: '--package', arg: '[name]' },
      { flag: '--baseline', arg: '<pre-audit-baseline.json>' },
      { flag: '--force' },
      { flag: '--dry-run' },
      { flag: '--allow-unaudited' },
      { flag: '--json' },
      { flag: '--quiet' },
    ],
  },
  init: {
    flags: [
      { flag: '--root', arg: '<dir>' },
      { flag: '--force' },
      { flag: '--dry-run' },
      { flag: '--json' },
    ],
  },
  audit: {
    flags: [
      { flag: '--tokens', arg: '<dir>' },
      { flag: '--theme', arg: 'light|dark|both' },
      { flag: '--min-ratio', arg: '4.5' },
      { flag: '--min-apca', arg: '60' },
      { flag: '--spec', arg: '<tokens.config.json>' },
      { flag: '--baseline', arg: '<pre-audit-baseline.json>' },
      { flag: '--json' },
    ],
  },
  build: {
    flags: [
      { flag: '--tokens', arg: '<dir>' },
      { flag: '--out', arg: '<dir>' },
      { flag: '--theme', arg: '<name>' },
      { flag: '--selector', arg: '<css-selector>' },
      { flag: '--format', arg: '<css|ts|all>' },
      { flag: '--package', arg: '[name]' },
      { flag: '--prefix', arg: '<name>' },
      { flag: '--spec', arg: '<tokens.config.json>' },
      { flag: '--profile', arg: '<id>' },
      { flag: '--visualizer' },
      { flag: '--allow-unaudited' },
      { flag: '--force' },
      { flag: '--dry-run' },
    ],
  },
  extract: {
    flags: [
      { flag: '--root', arg: '<dir>' },
      { flag: '--url', arg: '<url>' },
      { flag: '--html', arg: '<file.html>' },
      { flag: '--out', arg: '<tokens.config.json>' },
      { flag: '--audit-baseline' },
      { flag: '--out-baseline', arg: '<path>' },
      { flag: '--force' },
      { flag: '--dry-run' },
    ],
  },
  generate: {
    flags: [
      { flag: '--spec', arg: '<tokens.config.json>' },
      { flag: '--out', arg: '<tokens-dir>' },
      { flag: '--force' },
      { flag: '--dry-run' },
    ],
  },
  scaffold: {
    flags: [
      { flag: '--root', arg: '<dir>' },
      { flag: '--formatter', arg: 'prettier|biome|none' },
      { flag: '--linter', arg: 'stylelint|eslint|none' },
      { flag: '--css', arg: 'native|tailwind' },
      { flag: '--force' },
      { flag: '--dry-run' },
    ],
  },
  route: {
    flags: [
      { flag: '--root', arg: '<dir>' },
      { flag: '--scaffold' },
      { flag: '--formatter', arg: 'prettier|biome|none' },
      { flag: '--linter', arg: 'stylelint|eslint|none' },
      { flag: '--css', arg: 'native|tailwind' },
      { flag: '--json' },
      { flag: '--force' },
      { flag: '--dry-run' },
    ],
  },
  diagnose: {
    flags: [
      { flag: '--root', arg: '<dir>' },
      { flag: '--spec', arg: '<tokens.config.json>' },
      { flag: '--tokens', arg: '<dir>' },
      { flag: '--build', arg: '<dir>' },
    ],
  },
  figma: {
    usage: `Usage:
  Export to Figma:
    token-engine figma --to-figma <tokens-dir> --out <figma-variables.json> [--force]
  Import from Figma:
    token-engine figma --from-figma <figma-variables.json> --out <tokens-dir> [--force]`,
    flags: [
      { flag: '--to-figma', arg: '<tokens-dir>' },
      { flag: '--from-figma', arg: '<figma-variables.json>' },
      { flag: '--out', arg: '<path>' },
      { flag: '--force' },
    ],
  },
};

export function usageText(key: CommandKey): string {
  const spec = COMMANDS[key];
  if (spec.usage !== undefined) return spec.usage;
  const rendered = spec.flags.map((flag) => {
    const val = flag.arg === undefined ? '' : ` ${flag.arg}`;
    return flag.required ? `${flag.flag}${val}` : `[${flag.flag}${val}]`;
  });
  return `Usage: token-engine ${key} ${rendered.join(' ')}`;
}
