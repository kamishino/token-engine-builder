import { defineConfig } from '@terrazzo/cli';
import css from '@terrazzo/plugin-css';
import sass from '@terrazzo/plugin-sass';

export default defineConfig({
  tokens: [
    './tokens/primitive/color.tokens.json',
    './tokens/primitive/spacing.tokens.json',
    './tokens/primitive/typography.tokens.json',
    './tokens/primitive/radius.tokens.json',
    './tokens/semantic/light.tokens.json',
    './tokens/component/button.tokens.json',
  ],
  outDir: './build/',
  lint: { build: { enabled: false } },
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
