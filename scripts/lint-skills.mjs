#!/usr/bin/env node
/**
 * Guard SKILL.md frontmatter: every src/skills/<skill>/SKILL.md must carry a
 * `name` matching its folder and a `description`, and any value containing
 * ": " must be quoted — bare colons are a YAML syntax error that breaks
 * skill loaders.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillsDir = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'src', 'skills');
const failures = [];

for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = join(skillsDir, entry.name, 'SKILL.md');
  const match = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
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
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`[lint:skills] FAIL ${failure}`);
  process.exit(1);
}
console.log('[lint:skills] all SKILL.md frontmatter blocks parse');
