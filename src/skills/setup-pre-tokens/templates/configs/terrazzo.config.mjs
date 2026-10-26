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
