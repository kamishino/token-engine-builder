#!/usr/bin/env node
/**
 * Guard SKILL.md frontmatter, prose consistency, and flag parity:
 * - Every src/skills/<skill>/SKILL.md must carry name, description, license, compatibility, allowed-tools.
 * - Any value containing ": " must be quoted.
 * - Prohibited stale literals (e.g. color.brand.500, manual-edit advice) must not appear in SKILL.md or README.md.
 * - Flags documented in scripts' --help usage strings must appear in the corresponding SKILL.md.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const FORBIDDEN_LITERALS = [
  'color.brand.500',
  '{color.brand.500}',
  'Respect the tiers in any manual edit',
  '7 fg/bg role pairs',
];
export function runLint({ root = rootDir } = {}) {
  const skillsDir = join(root, 'src', 'skills');
  const failures = [];
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillDir = join(skillsDir, entry.name);
      const skillFile = join(skillDir, 'SKILL.md');
      const readmeFile = join(skillDir, 'README.md');

      // Check prohibited stale literals
      for (const docFile of [skillFile, readmeFile]) {
        if (!existsSync(docFile)) continue;
        const content = readFileSync(docFile, 'utf8');
        for (const forbidden of FORBIDDEN_LITERALS) {
          if (content.includes(forbidden)) {
            failures.push(
              `${entry.name}/${docFile.endsWith('SKILL.md') ? 'SKILL.md' : 'README.md'}: contains forbidden stale literal "${forbidden}"`,
            );
          }
        }
      }

      const skillContent = readFileSync(skillFile, 'utf8');
      const match = skillContent.match(/^---\n([\s\S]*?)\n---/);
      if (match?.[1] === undefined) {
        failures.push(`${entry.name}: missing frontmatter block`);
        continue;
      }
      const fields = new Map();
      for (const line of match[1].split('\n')) {
        const colon = line.indexOf(':');
        if (colon === -1 || line.startsWith(' ') || line.startsWith('\t')) continue;
        fields.set(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
      }
      const fail = (reason) => failures.push(`${entry.name}: ${reason}`);
      if (fields.get('name') !== entry.name) fail(`name is ${JSON.stringify(fields.get('name'))}`);
      if (!fields.get('description')) fail('description is missing or empty');
      if (!fields.get('license'))
        fail('license is missing (Agent Skills spec optional field, required here)');
      if (!fields.get('compatibility'))
        fail('compatibility is missing (Agent Skills spec optional field, required here)');
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

      // Check flag parity between script --help string and SKILL.md
      const scriptsSubDir = join(skillDir, 'scripts');
      if (existsSync(scriptsSubDir)) {
        for (const scriptFile of readdirSync(scriptsSubDir)) {
          if (!scriptFile.endsWith('.ts')) continue;
          const scriptSource = readFileSync(join(scriptsSubDir, scriptFile), 'utf8');
          const helpBlockMatch =
            scriptSource.match(
              /hasFlag\(argv,\s*['"]--help['"]\)[\s\S]*?console\.log\(\s*[`'"]([\s\S]*?)[`'"]\s*\)/,
            ) ?? scriptSource.match(/Usage:[^\n\r]+/);
          if (helpBlockMatch === null) {
            failures.push(
              `${entry.name}: scripts/${scriptFile}: no usage string found (add --help)`,
            );
          } else {
            const textToScan = helpBlockMatch[1] ?? helpBlockMatch[0];
            const flags = [...textToScan.matchAll(/--[a-z-]+/g)].map((m) => m[0]);
            for (const flag of flags) {
              if (!new RegExp(`${flag}(?![\\w-])`).test(skillContent)) {
                failures.push(
                  `${entry.name}: SKILL.md missing documentation for script flag "${flag}" (from scripts/${scriptFile})`,
                );
              }
            }
          }
        }
      }
    }
  }

  // Check plugin.json manifest version parity
  const pluginJsonPath = join(root, '.claude', 'plugin.json');
  const packageJsonPath = join(root, 'package.json');
  if (existsSync(pluginJsonPath) && existsSync(packageJsonPath)) {
    const pluginJson = JSON.parse(readFileSync(pluginJsonPath, 'utf8'));
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    if (pluginJson.version !== packageJson.version) {
      failures.push(
        `.claude/plugin.json: version "${pluginJson.version}" drifted from package.json version "${packageJson.version}"`,
      );
    }
  }

  return failures;
}

const isMain =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const failures = runLint();
  if (failures.length > 0) {
    for (const failure of failures) console.error(`[lint:skills] FAIL ${failure}`);
    process.exit(1);
  }
  console.log('[lint:skills] all SKILL.md frontmatter blocks, prose, and flag parity checks parse');
}
