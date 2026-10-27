# Fork: CSS Transformers (Lightning CSS & PostCSS)

Integration guide when a project explicitly requires CSS transformations.

---

## 1. Default Stance: None Required

Modern frontend bundlers (e.g. Vite, Next.js, Webpack 5) already include native CSS nesting, autoprefixing, and minification. By default, **no CSS transformer is installed**.

Choose a transformer only when:
- Compiling complex legacy CSS with custom JavaScript AST plugins (PostCSS)
- Optimizing production CSS bundle sizes with ultra-fast Rust minification (Lightning CSS)

---

## 2. Option A: Lightning CSS (Speed-First)

[Lightning CSS](https://lightningcss.dev/) is an extremely fast Rust-based CSS parser, transformer, and minifier.

### Installation
```bash
# npm
npm install -D lightningcss@^1

# pnpm
pnpm add -D lightningcss@^1

# yarn
yarn add -D lightningcss@^1

# bun
bun add -d lightningcss@^1
```

### Vite Integration
If `vite.config.ts` or `vite.config.js` exists, enable Lightning CSS via `css.transformer`:
```ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets: {
        chrome: 100 << 16,
      },
    },
  },
});
```
*(This is the only framework config modification permitted by the skill, and is always listed in the initial confirmation plan).*

---

## 3. Option B: PostCSS (Ecosystem-First)

[PostCSS](https://postcss.org/) provides a rich ecosystem of JavaScript-driven AST transformation plugins.

### Installation
```bash
# npm
npm install -D postcss@^8 autoprefixer@^10

# pnpm
pnpm add -D postcss@^8 autoprefixer@^10

# yarn
yarn add -D postcss@^8 autoprefixer@^10

# bun
bun add -d postcss@^8 autoprefixer@^10
```

### Configuration
Copy `templates/configs/postcss.config.mjs` to `postcss.config.mjs`:
```js
export default {
  plugins: {
    autoprefixer: {},
  },
};
```

### Bundler Execution Order
In your build pipeline, ensure Sass compilation executes **before** PostCSS:
```text
styles/main.scss ──> (Dart Sass) ──> CSS AST ──> (PostCSS / Autoprefixer) ──> Output CSS
```

### Interaction with Tailwind CSS
If Tailwind CSS is selected alongside PostCSS, install `@tailwindcss/postcss@^4` instead of `autoprefixer`, and configure:
```js
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```
