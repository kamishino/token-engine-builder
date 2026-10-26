# Fork: Terrazzo DTCG Token Compiler

Instructions for substituting Terrazzo in place of Style Dictionary v5.

---

## 1. When to Choose Terrazzo

[Terrazzo](https://terrazzo.app/) (formerly Cobalt UI) is built natively around W3C DTCG 2025 specifications with high-performance Rust parsing and TypeScript configurations.

*Tradeoff Note*: The rest of the `token-engine-builder` toolchain and `design-tokens` flagship are optimized around Style Dictionary v5 output formats. Choosing Terrazzo produces DTCG-native CSS and SCSS, but diverges from the repository's programmatic compiler pipeline (`src/shared/compiler.ts`).

---

## 2. Package Changes

Install `@terrazzo/cli` and its official plugins instead of `style-dictionary`:

```bash
# npm
npm install -D @terrazzo/cli@^2 @terrazzo/plugin-css@^2 @terrazzo/plugin-sass@^2

# pnpm
pnpm add -D @terrazzo/cli@^2 @terrazzo/plugin-css@^2 @terrazzo/plugin-sass@^2

# yarn
yarn add -D @terrazzo/cli@^2 @terrazzo/plugin-css@^2 @terrazzo/plugin-sass@^2

# bun
bun add -d @terrazzo/cli@^2 @terrazzo/plugin-css@^2 @terrazzo/plugin-sass@^2
```

Do not install `style-dictionary`, and do not write `sd.config.mjs`.

---

## 3. Configuration Scaffolding

Copy `templates/configs/terrazzo.config.mjs` to `terrazzo.config.mjs` at the project root.

If dark theme tokens exist (`tokens/semantic/dark.tokens.json`), also copy `templates/configs/terrazzo.dark.config.mjs` to `terrazzo.dark.config.mjs`.

---

## 4. Script Updates & Sass Variable Aliasing

In `package.json`, set the token build script:
```json
"scripts": {
  "tokens:build": "tz build && tz build --config terrazzo.dark.config.mjs && node scripts/tz-vars.mjs"
}
```

### Sass Variables Limitation & Integration
Terrazzo's `@terrazzo/plugin-sass` emits a `$__token-values` map with a `@function token($name)` helper rather than flat `$kebab-case` SCSS variables. To maintain uniform Sass syntax (`$semantic-color-action-primary`, `$spacing-4`) across both compilers without coupling partials to Terrazzo's `token(...)` function, create `scripts/tz-vars.mjs` to extract variables from `build/tokens.css` into `<stylesRoot>/abstracts/_variables.scss`:

```js
import { readFileSync, writeFileSync } from 'node:fs';

const css = readFileSync('build/tokens.css', 'utf8');
const lines = ['// Generated from Terrazzo tokens.css', ''];
for (const line of css.split('\n')) {
  const match = line.match(/^\s*--([a-z0-9-]+):\s*([^;]+);/);
  if (match) {
    const [, name, val] = match;
    const root = name.split('-')[0];
    if (root === 'semantic' || root === 'component' || root === 'layout') {
      lines.push(`$${name}: var(--${name});`);
    } else if (root === 'spacing' || root === 'font' || root === 'radius' || root === 'rhythm') {
      lines.push(`$${name}: ${val.trim()};`);
    }
  }
}
lines.push('');
writeFileSync('<stylesRoot>/abstracts/_variables.scss', lines.join('\n'));
```

---

## 5. Verification

Run the Terrazzo build:
```bash
npm run tokens:build
```
Expected output: `build/tokens.css`, `build/tokens.dark.css`, and `build/index.scss` generated successfully.
