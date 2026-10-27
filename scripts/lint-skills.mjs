#!/usr/bin/env node
/**
 * Guard SKILL.md frontmatter, prose consistency, and flag parity:
 * - Every src/skills/<skill>/SKILL.md must conform to the canonical skeleton:
 *   - Frontmatter allowlist: name, description, license (MIT), compatibility (>=node-22.12), allowed-tools, disable-model-invocation.
 *   - Any value containing ": " must be quoted.
 *   - H2 headings exactly in order: Architecture: Seams and Decoupling, Process, Pre-Yield Checklist.
 *   - Process steps match /^### \d+\. / and contain "**Done when**:".
 *   - Pre-Yield Checklist contains at least one "- [ ]" item.
 *   - All relative links exist on disk.
 *   - agents/openai.yaml exists.
 *   - No README.md in skill directory; child entries ⊆ {scripts, templates, assets, examples, references, agents}.
 * - Plugin.json skills match src/skills directories.
 * - Flags documented in CLI COMMANDS appear in design-tokens documentation.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMMANDS } from '../src/shared/cli-flags.ts';
import { isMainModule } from '../src/shared/paths.ts';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const FORBIDDEN_LITERALS = [
  'color.brand.500',
  '{color.brand.500}',
  'Respect the tiers in any manual edit',
  '7 fg/bg role pairs',
  'style-spec',
];

const ALLOWED_FRONTMATTER_KEYS = new Set([
  'name',
  'description',
  'license',
  'compatibility',
  'allowed-tools',
  'disable-model-invocation',
]);

const EXPECTED_H2_HEADINGS = [
  'Architecture: Seams and Decoupling',
  'Process',
  'Pre-Yield Checklist',
];

const ALLOWED_SKILL_SUBDIRS = new Set([
  'scripts',
  'templates',
  'assets',
  'examples',
  'references',
  'agents',
]);

export function runLint({ root = rootDir } = {}) {
  const skillsDir = join(root, 'src', 'skills');
  const failures = [];
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillDir = join(skillsDir, entry.name);
      const skillFile = join(skillDir, 'SKILL.md');
      const readmeFile = join(skillDir, 'README.md');

      if (!existsSync(skillFile)) {
        failures.push(`${entry.name}: missing SKILL.md`);
        continue;
      }

      const fail = (reason) => failures.push(`${entry.name}: ${reason}`);
      const skillContent = readFileSync(skillFile, 'utf8');

      // Check prohibited stale literals across SKILL.md, README.md, and references/**/*.md
      const docFiles = [skillFile, readmeFile];
      const refsDir = join(skillDir, 'references');
      if (existsSync(refsDir)) {
        for (const sub of readdirSync(refsDir, { recursive: true, withFileTypes: true })) {
          if (sub.isFile() && sub.name.endsWith('.md')) {
            const parent = sub.parentPath ?? sub.path;
            docFiles.push(join(parent, sub.name));
          }
        }
      }
      for (const docFile of docFiles) {
        if (!existsSync(docFile)) continue;
        const content = readFileSync(docFile, 'utf8');
        for (const forbidden of FORBIDDEN_LITERALS) {
          if (content.includes(forbidden)) {
            const label =
              docFile === skillFile
                ? 'SKILL.md'
                : docFile === readmeFile
                  ? 'README.md'
                  : relative(skillDir, docFile).replaceAll('\\', '/');
            fail(`${label} contains forbidden stale literal "${forbidden}"`);
          }
        }
      }

      // Orphan references guard: every references/*.md must be linked in SKILL.md
      if (existsSync(refsDir)) {
        for (const sub of readdirSync(refsDir, { recursive: true, withFileTypes: true })) {
          if (sub.isFile() && sub.name.endsWith('.md')) {
            const parent = sub.parentPath ?? sub.path;
            const fullPath = join(parent, sub.name);
            const relPath = relative(skillDir, fullPath).replaceAll('\\', '/');
            if (!skillContent.includes(relPath)) {
              fail(`orphan reference file not linked in SKILL.md: "${relPath}"`);
            }
          }
        }
      }
      // Prohibit README.md in skill package and check child entries
      for (const sub of readdirSync(skillDir, { withFileTypes: true })) {
        if (sub.name === 'SKILL.md') continue;
        if (sub.name === 'README.md') {
          fail('README.md in skill directory is forbidden (per-skill READMEs are not packaged)');
          continue;
        }
        if (!sub.isDirectory() || !ALLOWED_SKILL_SUBDIRS.has(sub.name)) {
          fail(`unexpected entry in skill directory: "${sub.name}"`);
        }
      }

      // Check agents/openai.yaml existence
      const openaiYaml = join(skillDir, 'agents', 'openai.yaml');
      if (!existsSync(openaiYaml)) {
        fail('agents/openai.yaml is missing');
      }

      if (
        /<([a-z0-9-]+)-root>\/scripts\//.test(skillContent) &&
        !skillContent.includes('Never run a command containing literal')
      ) {
        fail('command uses a <...-root> placeholder without the literal-execution guard');
      }

      const match = skillContent.match(/^---\n([\s\S]*?)\n---/);
      if (match?.[1] === undefined) {
        fail('missing frontmatter block');
        continue;
      }

      const fields = new Map();
      for (const line of match[1].split('\n')) {
        const colon = line.indexOf(':');
        if (colon === -1 || line.startsWith(' ') || line.startsWith('\t')) continue;
        fields.set(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
      }

      for (const key of fields.keys()) {
        if (!ALLOWED_FRONTMATTER_KEYS.has(key)) {
          fail(
            `frontmatter key "${key}" is not in the allowed keys: ${[...ALLOWED_FRONTMATTER_KEYS].join(', ')}`,
          );
        }
      }

      if (fields.get('name') !== entry.name) fail(`name is ${JSON.stringify(fields.get('name'))}`);
      if (!fields.get('description')) fail('description is missing or empty');
      if (!fields.get('license')) {
        fail('license is missing (Agent Skills spec optional field, required here)');
      } else if (fields.get('license') !== 'MIT') {
        fail(`license must be "MIT", got ${JSON.stringify(fields.get('license'))}`);
      }
      if (!fields.get('compatibility')) {
        fail('compatibility is missing (Agent Skills spec optional field, required here)');
      } else {
        const rawComp = fields.get('compatibility');
        if (rawComp !== '">=node-22.12"' && rawComp !== "'>=node-22.12'") {
          fail(`compatibility must be ">=node-22.12", got ${JSON.stringify(rawComp)}`);
        }
      }
      if (!fields.get('allowed-tools')) {
        fail('allowed-tools is missing (Agent Skills spec space-separated string, required here)');
      }
      for (const [key, value] of fields) {
        const quoted =
          value.length >= 2 &&
          ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'")));
        if (value.includes(': ') && !quoted) fail(`${key} contains an unquoted ": "`);
      }

      // H2 Headings validation
      const h2Matches = [...skillContent.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
      if (
        h2Matches.length !== EXPECTED_H2_HEADINGS.length ||
        !h2Matches.every((h, i) => h === EXPECTED_H2_HEADINGS[i])
      ) {
        fail(
          `H2 headings must be exactly in order [${EXPECTED_H2_HEADINGS.join(', ')}], got [${h2Matches.join(', ')}]`,
        );
      }

      // Process steps and Done when validation
      const processStart = skillContent.indexOf('## Process');
      const processEnd = skillContent.indexOf('## Pre-Yield Checklist');
      if (processStart !== -1 && processEnd !== -1) {
        const processContent = skillContent.slice(processStart, processEnd);
        const h3Headings = [...processContent.matchAll(/^###\s+(.+)$/gm)];
        for (let i = 0; i < h3Headings.length; i++) {
          const title = h3Headings[i][1].trim();
          if (!/^### \d+\. /.test(h3Headings[i][0])) {
            fail(`process step heading "${title}" must match /^### \\d+\\. /`);
          }
          const startIdx = h3Headings[i].index;
          const nextIdx =
            i + 1 < h3Headings.length ? h3Headings[i + 1].index : processContent.length;
          const sectionBody = processContent.slice(startIdx, nextIdx);
          if (!sectionBody.includes('**Done when**:')) {
            fail(`process step "${title}" must contain "**Done when**:"`);
          }
        }
      }

      // Pre-Yield Checklist validation
      if (processEnd !== -1) {
        const checklistContent = skillContent.slice(processEnd);
        if (!checklistContent.includes('- [ ]')) {
          fail('Pre-Yield Checklist must contain at least one "- [ ]" item');
        }
      }

      // Relative links validation (strip code blocks first)
      const contentWithoutCode = skillContent
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`\n]+`/g, '');
      const linkMatches = [...contentWithoutCode.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)];
      for (const [, target] of linkMatches) {
        if (
          target.startsWith('http://') ||
          target.startsWith('https://') ||
          target.startsWith('#')
        ) {
          continue;
        }
        const cleanTarget = target.split('#')[0].split('?')[0];
        const resolvedTarget = resolve(skillDir, cleanTarget);
        if (!existsSync(resolvedTarget)) {
          fail(`relative link target "${target}" does not exist on disk`);
        }
      }
    }
  }

  // Flag parity: every declared CLI flag must appear in design-tokens SKILL.md or references/engine-and-build.md
  const dtSkillMd = join(skillsDir, 'design-tokens', 'SKILL.md');
  const dtEngineRef = join(skillsDir, 'design-tokens', 'references', 'engine-and-build.md');
  if (existsSync(dtSkillMd)) {
    const combinedDocs = [
      readFileSync(dtSkillMd, 'utf8'),
      existsSync(dtEngineRef) ? readFileSync(dtEngineRef, 'utf8') : '',
    ].join('\n');

    for (const [command, spec] of Object.entries(COMMANDS)) {
      for (const { flag } of spec.flags) {
        if (!new RegExp(`${flag}(?![\\w-])`).test(combinedDocs)) {
          failures.push(
            `design-tokens: missing documentation for CLI flag "${flag}" (command "${command}")`,
          );
        }
      }
    }
  }

  // Reverse flag parity: every flag documented on a token-engine invocation in design-tokens docs must exist in COMMANDS
  const dtSkillDir = join(skillsDir, 'design-tokens');
  if (existsSync(dtSkillDir)) {
    const docPaths = [join(dtSkillDir, 'SKILL.md')];
    const dtRefsDir = join(dtSkillDir, 'references');
    if (existsSync(dtRefsDir)) {
      for (const sub of readdirSync(dtRefsDir, { recursive: true, withFileTypes: true })) {
        if (sub.isFile() && sub.name.endsWith('.md')) {
          const parent = sub.parentPath ?? sub.path;
          docPaths.push(join(parent, sub.name));
        }
      }
    }

    for (const docPath of docPaths) {
      if (!existsSync(docPath)) continue;
      const content = readFileSync(docPath, 'utf8');
      const relDoc = relative(dtSkillDir, docPath).replaceAll('\\', '/');
      const cmdInvocations = content.matchAll(
        /(?:token-engine(?:\.mjs)?)\s+([a-z0-9-]+)([^\n`]+)/g,
      );
      for (const [, cmd, rest] of cmdInvocations) {
        if (!(cmd in COMMANDS)) continue;
        const spec = COMMANDS[cmd];
        const validFlags = new Set(spec.flags.map((f) => f.flag));
        validFlags.add('--help');
        const flagMatches = rest.matchAll(/--[a-z0-9-]+/g);
        for (const [flag] of flagMatches) {
          if (!validFlags.has(flag)) {
            failures.push(
              `design-tokens: invalid flag "${flag}" documented for command "${cmd}" in ${relDoc}`,
            );
          }
        }
      }
    }
  }

  // Check plugin.json manifest version parity and skills set equality
  const pluginJsonPath = join(root, '.claude', 'plugin.json');
  const packageJsonPath = join(root, 'package.json');
  if (existsSync(pluginJsonPath)) {
    const pluginJson = JSON.parse(readFileSync(pluginJsonPath, 'utf8'));
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      if (pluginJson.version !== packageJson.version) {
        failures.push(
          `.claude/plugin.json: version "${pluginJson.version}" drifted from package.json version "${packageJson.version}"`,
        );
      }
    }
    if (existsSync(skillsDir)) {
      const pluginSkillNames = (pluginJson.skills ?? []).map((s) => s.name).sort();
      const actualSkillNames = readdirSync(skillsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();
      if (JSON.stringify(pluginSkillNames) !== JSON.stringify(actualSkillNames)) {
        failures.push(
          `.claude/plugin.json skills [${pluginSkillNames.join(', ')}] does not match src/skills [${actualSkillNames.join(', ')}]`,
        );
      }
    }
  }

  return failures;
}

if (isMainModule(import.meta.url, 'lint-skills.mjs')) {
  const failures = runLint();
  if (failures.length > 0) {
    for (const failure of failures) console.error(`[lint:skills] FAIL ${failure}`);
    process.exit(1);
  }
  console.log('[lint:skills] all SKILL.md frontmatter blocks, prose, and flag parity checks parse');
}
