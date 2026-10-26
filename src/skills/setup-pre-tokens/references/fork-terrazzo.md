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

Scaffold `terrazzo.config.mjs` (or `.ts`) at the project root based on `templates/configs/terrazzo.config.mjs`:

```ts
import { defineConfig } from '@terrazzo/cli';
import css from '@terrazzo/plugin-css';
import sass from '@terrazzo/plugin-sass';

export default defineConfig({
  tokens: [
    './tokens/primitive/**/*.tokens.json',
    './tokens/semantic/light.tokens.json',
    './tokens/component/**/*.tokens.json',
  ],
  outDir: './build/',
  plugins: [
    css({
      filename: 'tokens.css',
      modeSelectors: [{ mode: 'light', selectors: [':root'] }],
    }),
    sass({
      filename: 'index.scss',
    }),
  ],
});
```

If dark theme tokens exist (`tokens/semantic/dark.tokens.json`), scaffold a secondary configuration `terrazzo.dark.config.mjs`:

```ts
import { defineConfig } from '@terrazzo/cli';
import css from '@terrazzo/plugin-css';

export default defineConfig({
  tokens: [
    './tokens/primitive/**/*.tokens.json',
    './tokens/semantic/dark.tokens.json',
    './tokens/component/**/*.tokens.json',
  ],
  outDir: './build/',
  plugins: [
    css({
      filename: 'tokens.dark.css',
      modeSelectors: [{ mode: 'dark', selectors: ['[data-theme="dark"]'] }],
    }),
  ],
});
```

---

## 4. Script Updates & Sass Variable Aliasing

In `package.json`, set the token build script:
```json
"scripts": {
  "tokens:build": "tz build && tz build --config terrazzo.dark.config.mjs"
}
```

### Sass Variables Limitation & Integration
Because Terrazzo outputs to a single global `outDir` (`./build/index.scss`), update `styles/abstracts/_index.scss` to forward the generated Terrazzo index:
```scss
// styles/abstracts/_index.scss
@forward '../../build/index';
@forward 'mixins';
```
Alternatively, configure Sass bundler include paths to point directly to `build/`.

---

## 5. Verification

Run the Terrazzo build:
```bash
npm run tokens:build
```
Expected output: `build/tokens.css`, `build/tokens.dark.css`, and `build/index.scss` generated successfully.
