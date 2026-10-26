import { defineConfig } from '@terrazzo/cli';
import css from '@terrazzo/plugin-css';

export default defineConfig({
  tokens: [
    './tokens/primitive/color.tokens.json',
    './tokens/primitive/spacing.tokens.json',
    './tokens/primitive/typography.tokens.json',
    './tokens/primitive/radius.tokens.json',
    './tokens/semantic/dark.tokens.json',
    './tokens/component/button.tokens.json',
  ],
  outDir: './build/',
  lint: { build: { enabled: false } },
  plugins: [
    css({
      filename: 'tokens.dark.css',
      modeSelectors: [{ mode: 'dark', selectors: ['[data-theme="dark"]'] }],
    }),
  ],
});
