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
  const root = skillRoot(importMetaUrl);
  const direct = resolve(root, 'templates', ...segments);
  if (existsSync(direct)) return direct;
  const fromMath = resolve(root, 'token-math', 'templates', ...segments);
  if (existsSync(fromMath)) return fromMath;
  const fromSiblingMath = resolve(root, '..', 'token-math', 'templates', ...segments);
  if (existsSync(fromSiblingMath)) return fromSiblingMath;
  const fromSrc = resolve(root, 'src', 'skills', 'token-math', 'templates', ...segments);
  if (existsSync(fromSrc)) return fromSrc;
  return direct;
}

/** The installed folder of a sibling skill (`<skills-dir>/<skillName>`). */
export function siblingSkillRoot(importMetaUrl: string, skillName: string): string {
  return resolve(skillRoot(importMetaUrl), '..', skillName);
}

/** True if the directory belongs to a development/builder worktree. */
export function isDevelopmentPath(pathStr: string): boolean {
  const normalized = pathStr.replace(/\\/g, '/');
  if (
    normalized.includes('/token-engine-builder/dist') ||
    normalized.includes('/token-engine-builder/src')
  ) {
    return true;
  }
  if (/\/(dist|src\/skills)\/[a-z0-9-]+$/i.test(normalized)) {
    try {
      const grandParent = resolve(pathStr, normalized.includes('/dist/') ? '../..' : '../../..');
      const pkgPath = resolve(grandParent, 'package.json');
      if (existsSync(pkgPath)) return true;
    } catch {
      // ignore
    }
  }
  return false;
}

function invocationSkillRoot(): string | undefined {
  if (!process.argv[1]) return undefined;
  try {
    const scriptPath = resolve(process.argv[1]);
    const parent = dirname(scriptPath);
    if (parent.endsWith('scripts') || parent.endsWith('scripts/') || parent.endsWith('scripts\\')) {
      return resolve(parent, '..');
    }
  } catch {
    // ignore
  }
  return undefined;
}

/**
 * Replace `<skill-root>` with this skill's root and `<name-root>` with a
 * co-located sibling skill's root. Missing targets and development repo paths
 * stay as written so the agent or human can resolve them portably.
 */
export function resolveSkillPathPlaceholders(command: string, importMetaUrl: string): string {
  const invRoot = invocationSkillRoot();
  return command.replace(/<([a-z0-9-]+)-root>/g, (match, skillName: string) => {
    if (skillName === 'skill') {
      if (invRoot && !isDevelopmentPath(invRoot)) return invRoot;
      const root = skillRoot(importMetaUrl);
      return isDevelopmentPath(root) ? match : root;
    }
    if (invRoot) {
      const invSibling = resolve(invRoot, '..', skillName);
      if (existsSync(invSibling) && !isDevelopmentPath(invSibling)) {
        return invSibling;
      }
    }
    const dir = siblingSkillRoot(importMetaUrl, skillName);
    if (existsSync(dir) && !isDevelopmentPath(dir)) {
      return dir;
    }
    if (process.env.AGENT_SKILLS_DIR) {
      const envDir = resolve(process.env.AGENT_SKILLS_DIR, skillName);
      if (existsSync(envDir)) return envDir;
    }
    return match;
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
  if (extraSuffixes.length > 0) {
    const entry = process.argv[1].replace(/\\/g, '/');
    return extraSuffixes.some((suffix) => entry.endsWith(suffix));
  }
  try {
    const entry = resolve(process.argv[1]);
    const target = resolve(fileURLToPath(importMetaUrl));
    if (entry === target) return true;
  } catch {
    // ignore unparseable or relative file URL
  }
  return false;
}
