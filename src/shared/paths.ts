import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Portable skill-relative path resolution.
 *
 * Bundled scripts live at `<skill>/scripts/<name>.mjs`; `templates/` and
 * `assets/` sit beside `scripts/`. Resolving from `import.meta.url` keeps the
 * skill working after it is moved to `~/.agents/skills/<skill-name>/` —
 * never resolve these from `process.cwd()`.
 */
export function scriptDir(importMetaUrl: string): string {
  return dirname(fileURLToPath(importMetaUrl));
}

/** `<skill>/` root, one level above `scripts/`. */
export function skillRoot(importMetaUrl: string): string {
  return resolve(scriptDir(importMetaUrl), '..');
}

export function templatePath(importMetaUrl: string, ...segments: string[]): string {
  return resolve(skillRoot(importMetaUrl), 'templates', ...segments);
}

/** The installed folder of a sibling skill (`<skills-dir>/<skillName>`). */
export function siblingSkillRoot(importMetaUrl: string, skillName: string): string {
  return resolve(skillRoot(importMetaUrl), '..', skillName);
}

/**
 * Replace `<skill-root>` with this skill's root and `<name-root>` with a
 * co-located sibling skill's root. Missing targets stay as written so the
 * agent or human can resolve them.
 */
export function resolveSkillPathPlaceholders(command: string, importMetaUrl: string): string {
  return command.replace(/<([a-z0-9-]+)-root>/g, (match, skillName: string) => {
    if (skillName === 'skill') return skillRoot(importMetaUrl);
    const dir = siblingSkillRoot(importMetaUrl, skillName);
    return existsSync(dir) ? dir : match;
  });
}

/** `--flag value` lookup; returns `fallback` when absent. */
export function getArg(argv: string[], flag: string): string | undefined;
export function getArg(argv: string[], flag: string, fallback: string): string;
export function getArg(argv: string[], flag: string, fallback?: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index === -1) return fallback;
  const next = argv[index + 1];
  if (next === undefined || next.startsWith('--')) return fallback;
  return next;
}

export function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

/** Resolve a user-supplied path against cwd (outputs/specs are cwd-relative by design). */
export function fromCwd(path: string): string {
  return resolve(process.cwd(), path);
}

/** True when the module is invoked directly from the CLI rather than imported. */
export function isMainModule(importMetaUrl: string, ...extraSuffixes: string[]): boolean {
  if (process.argv[1] === undefined) return false;
  try {
    const entry = resolve(process.argv[1]);
    const target = resolve(fileURLToPath(importMetaUrl));
    if (entry === target) return true;
  } catch {
    // ignore unparseable or relative file URL
  }
  for (const suffix of extraSuffixes) {
    if (process.argv[1].endsWith(suffix)) return true;
  }
  return false;
}
