import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Portable skill-relative path resolution.
 *
 * Bundled scripts live at `<skill>/scripts/<name>.mjs`; `templates/` and
 * `assets/` sit beside `scripts/`. Resolving from `import.meta.url` keeps the
 * skill working after it is moved to `~/agents/skills/<skill-name>/` —
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

/** `--flag value` lookup; returns `fallback` when absent. */
export function getArg(argv: string[], flag: string, fallback?: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index === -1) return fallback;
  return argv[index + 1] ?? fallback;
}

export function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

/** Resolve a user-supplied path against cwd (outputs/specs are cwd-relative by design). */
export function fromCwd(path: string): string {
  return resolve(process.cwd(), path);
}
