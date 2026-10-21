import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { auditTokens } from './audit-report.js';
import { verifyGeneratedFiles } from './compiler.js';
import type { SpecBinding } from './guard.js';
import { profileFileName, UI_PROFILE_IDS } from './profile-registry.js';
import { AUDIT_PAIRS } from './roles.js';
import { inspectSystem, type SystemPaths, type SystemState } from './system-state.js';
import { findTokenFiles, semanticDir } from './tokens.js';
import type { ContrastResult } from './types.js';

export interface Finding {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  detail: string;
  evidence: string[];
  next: string;
}

export interface NextAction {
  skill:
    | 'token-extract'
    | 'token-style'
    | 'token-math'
    | 'token-audit'
    | 'token-build'
    | 'improve-design-system';
  command?: string;
  reason: string;
}

export interface Diagnosis {
  state: SystemState;
  findings: Finding[];
  nextActions: NextAction[];
  audit?: {
    pass: boolean;
    minRatio: number;
    minApca: number;
    themes: Record<string, { pass: boolean; totalPairs: number; failing: ContrastResult[] }>;
    specBinding?: SpecBinding;
  };
}

const REQUIRED_BUILD_ARTIFACTS = ['tokens.css', 'theme.css', 'components.md', 'DESIGN.md'];

export function diagnoseDesignSystem(root: string, paths: SystemPaths): Diagnosis {
  const state = inspectSystem(root, paths);
  const findings: Finding[] = [];

  // 1. Spec findings
  if (state.spec.status === 'missing') {
    findings.push({
      id: 'spec-missing',
      severity: 'error',
      title: 'Missing style-spec.json',
      detail: 'No design token specification was found in the project.',
      evidence: [paths.spec],
      next: 'token-style: interview for brand aesthetic or token-extract from existing CSS',
    });
  } else if (state.spec.status === 'invalid') {
    findings.push({
      id: 'spec-invalid',
      severity: 'error',
      title: 'Invalid style-spec.json',
      detail: state.spec.error ?? 'style-spec.json failed validation',
      evidence: [state.spec.error ?? paths.spec],
      next: 'token-style: review and correct style-spec.json schema errors',
    });
  } else if (state.spec.warnings.length > 0) {
    findings.push({
      id: 'spec-warnings',
      severity: 'warning',
      title: 'style-spec.json contains design warnings',
      detail: 'The specification carries warnings (e.g. out-of-gamut anchor or non-catalog name).',
      evidence: state.spec.warnings,
      next: 'token-math: review printed warnings during token generation',
    });
  }

  // 2. Tokens findings
  if (state.tokens.status === 'missing') {
    findings.push({
      id: 'tokens-missing',
      severity: 'error',
      title: 'Missing tokens directory',
      detail: 'No 3-tier DTCG token tree found on disk.',
      evidence: [paths.tokens],
      next: 'token-math: run generate.mjs --spec style-spec.json --out tokens',
    });
  } else if (state.tokens.themes.length === 0) {
    findings.push({
      id: 'no-semantic-themes',
      severity: 'error',
      title: 'No semantic theme files found in tokens directory',
      detail: 'The tokens directory exists but contains no semantic theme definitions.',
      evidence: [semanticDir(paths.tokens)],
      next: 'token-math: run generate.mjs --spec style-spec.json --out tokens --force',
    });
  }

  // 3. Provenance findings
  if (state.provenance.status === 'tampered' || state.provenance.status === 'unreadable') {
    findings.push({
      id: `provenance-${state.provenance.status}`,
      severity: 'error',
      title: `Tokens directory provenance is ${state.provenance.status}`,
      detail: 'Generated token files have been hand-edited or are unreadable.',
      evidence: [...state.provenance.changed, ...state.provenance.missing],
      next: 'token-math: run generate.mjs --spec style-spec.json --out tokens --force',
    });
  } else if (state.tokens.status === 'present' && state.provenance.status === 'absent') {
    findings.push({
      id: 'provenance-absent',
      severity: 'info',
      title: 'Tokens directory has no provenance manifest',
      detail:
        'The token tree predates the anti-tampering guard or was imported from an external tool.',
      evidence: [paths.tokens],
      next: 'token-audit: audit to inspect contrast and verify integrity',
    });
  }

  // 4. Audit & contrast findings
  let auditSummary: Diagnosis['audit'];
  if (state.tokens.status === 'present' && state.tokens.themes.length > 0) {
    try {
      const minRatio = state.spec.minWcagRatio ?? 4.5;
      const auditRes = auditTokens(paths.tokens, {
        theme: 'both',
        minRatio,
        minApca: 60,
        ...(state.spec.status === 'valid' && state.spec.hash !== undefined
          ? { specHash: state.spec.hash }
          : {}),
      });

      const themesSummary: Record<
        string,
        { pass: boolean; totalPairs: number; failing: ContrastResult[] }
      > = {};
      for (const [tName, tReport] of Object.entries(auditRes.themes)) {
        const failing = tReport.pairs.filter((p) => !p.pass);
        themesSummary[tName] = {
          pass: tReport.pass,
          totalPairs: tReport.pairs.length,
          failing,
        };

        if (!tReport.pass) {
          const evidence = failing.map((p) =>
            p.suggestion !== undefined
              ? `${p.foreground} on ${p.background}: ${p.ratio.toFixed(2)}:1 (remedy: ${p.suggestion.alias})`
              : `${p.foreground} on ${p.background}: ${p.ratio.toFixed(2)}:1`,
          );
          evidence.push(...tReport.unresolvedAliases, ...tReport.rawValueViolations);
          findings.push({
            id: `audit-fail-${tName}`,
            severity: 'error',
            title: `Contrast audit failure in "${tName}" theme`,
            detail: `${failing.length} pair(s) failed WCAG 2.1 or APCA contrast thresholds.`,
            evidence,
            next: 'token-audit: record suggested remedies in style-spec.json overrides',
          });
        }
      }

      auditSummary = {
        pass: auditRes.pass,
        minRatio: auditRes.minRatio,
        minApca: auditRes.minApca,
        themes: themesSummary,
        ...(auditRes.specBinding !== undefined ? { specBinding: auditRes.specBinding } : {}),
      };
    } catch (err) {
      findings.push({
        id: 'audit-execution-error',
        severity: 'error',
        title: 'Audit execution error',
        detail: err instanceof Error ? err.message : String(err),
        evidence: [paths.tokens],
        next: 'token-audit: inspect token tree syntax and aliases',
      });
    }
  }

  // 5. Audit stamp finding
  if (state.tokens.status === 'present' && state.auditStamp !== 'pass') {
    findings.push({
      id: `audit-stamp-${state.auditStamp}`,
      severity: 'error',
      title: `Audit stamp is ${state.auditStamp}`,
      detail: 'No fresh passing audit stamp for this exact token tree.',
      evidence: [paths.tokens],
      next: 'token-audit: run audit.mjs --tokens tokens --min-ratio 4.5',
    });
  }

  // 6. Spec binding finding
  if (
    state.spec.status === 'valid' &&
    state.tokens.status === 'present' &&
    state.binding !== 'match' &&
    state.binding !== 'unverified'
  ) {
    findings.push({
      id: `binding-${state.binding}`,
      severity: 'error',
      title: `Token tree does not match style-spec.json (${state.binding})`,
      detail: 'The tokens were generated from a different or stale style-spec.json.',
      evidence: [paths.spec, paths.tokens],
      next: 'token-math: run generate.mjs --spec style-spec.json --out tokens --force',
    });
  }

  // 7. Component coverage
  if (state.tokens.status === 'present') {
    const requiredComponents = new Set(
      AUDIT_PAIRS.flatMap(({ fg, bg }) => {
        const res: string[] = [];
        if (fg.startsWith('component.')) res.push(fg.split('.')[1] as string);
        if (bg.startsWith('component.')) res.push(bg.split('.')[1] as string);
        return res;
      }),
    );
    const componentDir = join(paths.tokens, 'component');
    const existingFiles = findTokenFiles(componentDir).map((p) =>
      p.slice(componentDir.length + 1).replace(/\.tokens\.json$/, ''),
    );
    const missing = [...requiredComponents].filter((c) => !existingFiles.includes(c));
    if (missing.length > 0) {
      findings.push({
        id: 'component-coverage',
        severity: 'warning',
        title: 'Incomplete component token coverage',
        detail: `${missing.length} component(s) defined in audit pairs are missing from the component tier.`,
        evidence: missing,
        next: 'token-math: re-scaffold tokens from templates via generate.mjs',
      });
    }
  }

  // 8. Build findings
  if (state.build.status === 'missing') {
    findings.push({
      id: 'build-missing',
      severity: 'warning',
      title: 'Missing build directory',
      detail: 'Design tokens have not been compiled to CSS variables or Tailwind theme.',
      evidence: [paths.build],
      next: 'token-build: run build.mjs --tokens tokens --out build --theme light',
    });
  } else {
    const missingArtifacts = REQUIRED_BUILD_ARTIFACTS.filter(
      (name) => !state.build.artifacts.includes(name),
    );
    if (missingArtifacts.length > 0) {
      findings.push({
        id: 'build-incomplete',
        severity: 'warning',
        title: 'Incomplete build outputs',
        detail: `${missingArtifacts.length} standard artifact(s) are missing from the build directory.`,
        evidence: missingArtifacts,
        next: 'token-build: run build.mjs --tokens tokens --out build --theme light --force',
      });
    }

    if (state.cssProvenance.status === 'tampered' || state.cssProvenance.status === 'unreadable') {
      findings.push({
        id: 'css-provenance-tampered',
        severity: 'warning',
        title: `Build output provenance is ${state.cssProvenance.status}`,
        detail: 'Generated CSS or Markdown files in build/ have been hand-edited.',
        evidence: [...state.cssProvenance.changed, ...state.cssProvenance.missing],
        next: 'token-build: run build.mjs --tokens tokens --out build --theme light --force',
      });
    }

    const tokensCss = join(paths.build, 'tokens.css');
    const themeCss = join(paths.build, 'theme.css');
    const designMd = join(paths.build, 'DESIGN.md');
    if (existsSync(tokensCss) && existsSync(themeCss)) {
      const css = readFileSync(tokensCss, 'utf8');
      const theme = readFileSync(themeCss, 'utf8');
      const design = existsSync(designMd) ? readFileSync(designMd, 'utf8') : undefined;
      const problems = verifyGeneratedFiles({
        css,
        theme,
        ...(design !== undefined ? { design } : {}),
      });
      if (problems.length > 0) {
        findings.push({
          id: 'design-drift',
          severity: 'error',
          title: 'Build artifact verification failures',
          detail: 'Emitted CSS or documentation files failed internal consistency assertions.',
          evidence: problems,
          next: 'token-build: run build.mjs --tokens tokens --out build --theme light --force',
        });
      }
    }

    // Profiles check
    const missingProfiles: string[] = [];
    for (const id of UI_PROFILE_IDS) {
      const pFile = join(paths.build, 'profiles', profileFileName(id));
      if (!existsSync(pFile)) missingProfiles.push(id);
    }
    if (missingProfiles.length > 0) {
      findings.push({
        id: 'profile-coverage',
        severity: 'info',
        title: 'UI-library profiles not built',
        detail: `${missingProfiles.length} UI profile(s) have not been compiled in build/profiles.`,
        evidence: missingProfiles,
        next: 'token-build: run build.mjs --tokens tokens --out build/profiles --profile <id>',
      });
    }

    // Visualizer check
    const visPath = join(paths.build, 'visualizer.html');
    if (!existsSync(visPath)) {
      findings.push({
        id: 'visualizer-missing',
        severity: 'info',
        title: 'Visualizer inspection surface not generated',
        detail: 'visualizer.html is not present in the build directory.',
        evidence: [visPath],
        next: 'token-build: run build.mjs --tokens tokens --out build --theme light --visualizer',
      });
    }
  }

  // Sort findings: error -> warning -> info, then id
  const severityRank = { error: 0, warning: 1, info: 2 };
  findings.sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity] || a.id.localeCompare(b.id),
  );

  // Determine nextActions
  const nextActions: NextAction[] = [];
  if (state.spec.status === 'missing') {
    nextActions.push(
      {
        skill: 'token-extract',
        command: 'node ./scripts/extract.mjs --root . --out style-spec.json',
        reason: 'existing project with colors or fonts in code: extract a candidate spec',
      },
      {
        skill: 'token-style',
        reason: 'greenfield project: interview for brand personality and choose palette',
      },
    );
  } else if (state.spec.status === 'invalid') {
    nextActions.push({
      skill: 'token-style',
      reason: `style-spec.json is invalid: ${state.spec.error ?? 'validation error'}`,
    });
  } else if (state.tokens.status === 'missing' || state.tokens.themes.length === 0) {
    nextActions.push({
      skill: 'token-math',
      command: 'node ./scripts/generate.mjs --spec style-spec.json --out tokens',
      reason: 'generate the 3-tier DTCG token tree from style-spec.json',
    });
  } else if (state.auditStamp !== 'pass' || (auditSummary && !auditSummary.pass)) {
    nextActions.push({
      skill: 'token-audit',
      command: 'node ./scripts/audit.mjs --tokens tokens --spec style-spec.json',
      reason: 'verify WCAG 2.1 and APCA contrast floors and record passing audit stamp',
    });
  } else if (state.binding !== 'match' && state.binding !== 'unverified') {
    nextActions.push({
      skill: 'token-math',
      command: 'node ./scripts/generate.mjs --spec style-spec.json --out tokens --force',
      reason: 're-generate tokens to match the updated style-spec.json',
    });
  } else if (state.build.status === 'missing' || state.build.artifacts.length < 4) {
    nextActions.push({
      skill: 'token-build',
      command:
        'node ./scripts/build.mjs --tokens tokens --out build --theme light --spec style-spec.json',
      reason: 'compile audited tokens to CSS variables, Tailwind @theme, and DESIGN.md',
    });
  } else {
    nextActions.push({
      skill: 'improve-design-system',
      command: 'node ./scripts/diagnose.mjs --root .',
      reason: 'pipeline is healthy; run full design system review for holes and optimizations',
    });
  }

  return {
    state,
    findings,
    nextActions,
    ...(auditSummary !== undefined ? { audit: auditSummary } : {}),
  };
}
