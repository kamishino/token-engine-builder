import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ARTIFACT_NAMES } from './compiler.js';
import {
  checkAuditStamp,
  checkCssProvenance,
  checkSpecBinding,
  checkTokensProvenance,
  specInputHash,
  type SpecBinding,
  type TamperReport,
} from './guard.js';
import { loadStyleSpec } from './spec.js';
import { semanticThemes } from './tokens.js';

export interface SystemPaths {
  spec: string;
  tokens: string;
  build: string;
}

export interface SpecState {
  status: 'missing' | 'invalid' | 'valid';
  path: string;
  warnings: string[];
  error?: string;
  name?: string;
  hash?: string;
  minWcagRatio?: number;
}

export interface CodebaseContext {
  maturity: 'greenfield' | 'brownfield';
  runtime: 'shadow-dom' | 'dom';
  packageManager: 'pnpm' | 'npm' | 'yarn' | 'bun';
}

export interface SystemState {
  root: string;
  paths: SystemPaths;
  context: CodebaseContext;
  spec: SpecState;
  tokens: { status: 'missing' | 'present'; path: string; themes: string[] };
  provenance: TamperReport;
  auditStamp: 'pass' | 'stale' | 'fail' | 'missing' | 'unreadable';
  build: { status: 'missing' | 'present'; path: string; artifacts: string[] };
  cssProvenance: TamperReport;
  binding: SpecBinding | 'unverified';
}

export function detectCodebaseContext(root: string): CodebaseContext {
  let packageManager: CodebaseContext['packageManager'] = 'npm';
  if (existsSync(join(root, 'pnpm-lock.yaml'))) packageManager = 'pnpm';
  else if (existsSync(join(root, 'yarn.lock'))) packageManager = 'yarn';
  else if (existsSync(join(root, 'bun.lockb')) || existsSync(join(root, 'bun.lock'))) packageManager = 'bun';

  let maturity: CodebaseContext['maturity'] = 'greenfield';
  let runtime: CodebaseContext['runtime'] = 'dom';
  const styleExtensions = ['.css', '.scss', '.sass', '.less'];

  function scanDir(dir: string, depth = 0): void {
    if (depth > 4 || !existsSync(dir)) return;
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') {
          continue;
        }
        if (entry.isDirectory()) {
          scanDir(join(dir, entry.name), depth + 1);
        } else if (entry.isFile()) {
          const lower = entry.name.toLowerCase();
          if (styleExtensions.some((ext) => lower.endsWith(ext))) {
            maturity = 'brownfield';
          }
          if (lower.endsWith('.ts') || lower.endsWith('.js') || lower.endsWith('.tsx') || lower.endsWith('.jsx') || lower.endsWith('.css')) {
            try {
              const sample = readFileSync(join(dir, entry.name), 'utf8').slice(0, 4000);
              if (sample.includes(':host') || sample.includes('attachShadow') || sample.includes('ShadowRoot')) {
                runtime = 'shadow-dom';
              }
              if (sample.includes('oklch(') || sample.includes('#') || sample.includes('rgb(')) {
                maturity = 'brownfield';
              }
            } catch {
              // ignore unreadable
            }
          }
        }
      }
    } catch {
      // ignore unreadable dir
    }
  }

  scanDir(root, 0);

  const pkgPath = join(root, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps['lit'] || deps['@lit/reactive-element'] || deps['stencil']) {
        runtime = 'shadow-dom';
      }
      if (deps['tailwindcss'] || deps['sass'] || deps['styled-components']) {
        maturity = 'brownfield';
      }
    } catch {
      // ignore unreadable package.json
    }
  }

  return { maturity, runtime, packageManager };
}
export function resolveSystemPaths(
  root: string,
  overrides: Partial<SystemPaths> = {},
): SystemPaths {
  let defaultSpec = join(root, 'tokens.config.json');
  if (!existsSync(defaultSpec) && existsSync(join(root, 'style-spec.json'))) {
    defaultSpec = join(root, 'style-spec.json');
  }
  return {
    spec: overrides.spec ?? defaultSpec,
    tokens: overrides.tokens ?? join(root, 'tokens'),
    build: overrides.build ?? join(root, 'build'),
  };
}

export function inspectSystem(root: string, paths: SystemPaths): SystemState {
  let specState: SpecState;
  if (!existsSync(paths.spec)) {
    specState = {
      status: 'missing',
      path: paths.spec,
      warnings: [],
    };
  } else {
    try {
      const loaded = loadStyleSpec(paths.spec);
      specState = {
        status: 'valid',
        path: paths.spec,
        warnings: loaded.warnings,
        name: loaded.spec.name,
        hash: specInputHash(loaded.spec),
        ...(loaded.spec.targets?.minWcagRatio !== undefined
          ? { minWcagRatio: loaded.spec.targets.minWcagRatio }
          : {}),
      };
    } catch (error) {
      specState = {
        status: 'invalid',
        path: paths.spec,
        warnings: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const tokensExist = existsSync(paths.tokens);
  const themes = tokensExist ? semanticThemes(paths.tokens) : [];
  const tokensState = {
    status: tokensExist ? ('present' as const) : ('missing' as const),
    path: paths.tokens,
    themes,
  };

  const provenance = checkTokensProvenance(paths.tokens);
  const auditStamp = checkAuditStamp(paths.tokens);

  const buildExist = existsSync(paths.build);
  const artifacts = buildExist
    ? ARTIFACT_NAMES.filter((name) => existsSync(join(paths.build, name)))
    : [];
  const buildState = {
    status: buildExist ? ('present' as const) : ('missing' as const),
    path: paths.build,
    artifacts,
  };
  const cssProvenance = checkCssProvenance(paths.build);

  let binding: SpecBinding | 'unverified' = 'unverified';
  if (specState.status === 'valid' && specState.hash !== undefined && tokensExist) {
    binding = checkSpecBinding(paths.tokens, specState.hash);
  }

  return {
    root,
    paths,
    context: detectCodebaseContext(root),
    spec: specState,
    tokens: tokensState,
    provenance,
    auditStamp,
    build: buildState,
    cssProvenance,
    binding,
  };
}
