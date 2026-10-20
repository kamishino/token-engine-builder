import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { oklchToHex } from '../src/shared/colors.ts';
import { guideFromSpec } from '../src/shared/compiler.ts';
import { publishCssOutputs } from '../src/shared/guard.ts';
import { loadStyleSpec } from '../src/shared/spec.ts';

test('guideFromSpec maps palette roles and typography to DESIGN.md guide data', () => {
  const spec = loadStyleSpec('src/skills/token-style/assets/style-spec.example.json').spec;
  const guide = guideFromSpec(spec);
  const primary = spec.palette.find((entry) => entry.role === 'primary');
  const secondary = spec.palette.find((entry) => entry.role === 'secondary');
  assert.equal(guide.name, 'Example Brand');
  assert.equal(guide.primaryHex, oklchToHex(primary.anchor));
  assert.equal(guide.secondaryHex, oklchToHex(secondary.anchor));
  assert.equal(guide.scale, spec.typography.ratio);
  assert.equal(guide.density, spec.density);
});

test('publishCssOutputs writes a manifest and reports missing artifacts', () => {
  const dir = mkdtempSync(join(tmpdir(), 'publish-css-'));
  try {
    const tokensDir = join(dir, 'tokens');
    const cssDir = join(dir, 'out');
    mkdirSync(tokensDir, { recursive: true });
    mkdirSync(cssDir, { recursive: true });
    writeFileSync(join(tokensDir, 'color.tokens.json'), '{"color":{}}', 'utf8');
    writeFileSync(join(cssDir, 'tokens.css'), ':root {}', 'utf8');

    const ok = publishCssOutputs(cssDir, tokensDir, {
      'tokens.css': join(cssDir, 'tokens.css'),
    });
    assert.deepEqual(ok.missing, []);
    assert.ok(existsSync(join(cssDir, '.token-engine-css-manifest.json')));

    const missing = publishCssOutputs(cssDir, tokensDir, {
      'missing.css': join(cssDir, 'missing.css'),
    });
    assert.deepEqual(missing.missing, [join(cssDir, 'missing.css')]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
