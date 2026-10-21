import { existsSync } from 'node:fs';
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

export interface SystemState {
  root: string;
  paths: SystemPaths;
  spec: SpecState;
  tokens: { status: 'missing' | 'present'; path: string; themes: string[] };
  provenance: TamperReport;
  auditStamp: 'pass' | 'stale' | 'fail' | 'missing' | 'unreadable';
  build: { status: 'missing' | 'present'; path: string; artifacts: string[] };
  cssProvenance: TamperReport;
  binding: SpecBinding | 'unverified';
}

export function resolveSystemPaths(
  root: string,
  overrides: Partial<SystemPaths> = {},
): SystemPaths {
  return {
    spec: overrides.spec ?? join(root, 'style-spec.json'),
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
    spec: specState,
    tokens: tokensState,
    provenance,
    auditStamp,
    build: buildState,
    cssProvenance,
    binding,
  };
}
