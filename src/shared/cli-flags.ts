/**
 * The shipped CLI surface: one declaration per script entry. Flags drive the
 * `--help` usage line and the SKILL.md parity check in scripts/lint-skills.mjs.
 */
export interface FlagSpec {
  flag: string;
  /** Value placeholder rendered after the flag; omit for boolean flags. */
  arg?: string;
  /** Mandatory flag: rendered without brackets. */
  required?: true;
}

export interface ScriptSpec {
  /** Replaces the generated usage line (multi-command scripts). */
  usage?: string;
  flags: readonly FlagSpec[];
}

export const SCRIPT_KEYS = [
  'token-audit/scripts/audit.mjs',
  'token-build/scripts/build.mjs',
  'token-build/scripts/figma.mjs',
  'token-extract/scripts/extract.mjs',
  'token-math/scripts/generate.mjs',
] as const;

export type ScriptKey = (typeof SCRIPT_KEYS)[number];

export const SCRIPTS: Record<ScriptKey, ScriptSpec> = {
  'token-audit/scripts/audit.mjs': {
    flags: [
      { flag: '--tokens', arg: '<dir>', required: true },
      { flag: '--theme', arg: 'light|dark|both' },
      { flag: '--min-ratio', arg: '4.5' },
      { flag: '--min-apca', arg: '60' },
      { flag: '--spec', arg: '<style-spec.json>' },
      { flag: '--json' },
    ],
  },
  'token-build/scripts/build.mjs': {
    flags: [
      { flag: '--tokens', arg: '<dir>', required: true },
      { flag: '--out', arg: '<dir>', required: true },
      { flag: '--theme', arg: '<name>' },
      { flag: '--prefix', arg: '<name>' },
      { flag: '--spec', arg: '<style-spec.json>' },
      { flag: '--profile', arg: '<id>' },
      { flag: '--visualizer' },
      { flag: '--allow-unaudited' },
      { flag: '--force' },
      { flag: '--dry-run' },
    ],
  },
  'token-build/scripts/figma.mjs': {
    usage: `Usage:
  Export to Figma:
    node figma.mjs --to-figma <tokens-dir> --out <figma-variables.json> [--force]
  Import from Figma:
    node figma.mjs --from-figma <figma-variables.json> --out <tokens-dir> [--force]`,
    flags: [
      { flag: '--to-figma', arg: '<tokens-dir>' },
      { flag: '--from-figma', arg: '<figma-variables.json>' },
      { flag: '--out', arg: '<path>' },
      { flag: '--force' },
    ],
  },
  'token-extract/scripts/extract.mjs': {
    flags: [
      { flag: '--root', arg: '<dir>' },
      { flag: '--url', arg: '<url>' },
      { flag: '--html', arg: '<file.html>' },
      { flag: '--out', arg: '<style-spec.json>' },
      { flag: '--force' },
      { flag: '--dry-run' },
    ],
  },
  'token-math/scripts/generate.mjs': {
    flags: [
      { flag: '--spec', arg: '<style-spec.json>', required: true },
      { flag: '--out', arg: '<tokens-dir>', required: true },
      { flag: '--force' },
      { flag: '--dry-run' },
    ],
  },
};

export function usageText(key: ScriptKey): string {
  const spec = SCRIPTS[key];
  if (spec.usage !== undefined) return spec.usage;
  const script = key.slice(key.lastIndexOf('/') + 1);
  const rendered = spec.flags.map((flag) => {
    const body = flag.arg === undefined ? flag.flag : `${flag.flag} ${flag.arg}`;
    return flag.required === true ? body : `[${body}]`;
  });
  return `Usage: ${script} ${rendered.join(' ')}`;
}
