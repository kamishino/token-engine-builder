// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'smoke/**', 'smoke-*.mjs', 'skills/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'vite.config.ts'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: {
      // Tree-shaking contract: the monolithic colorjs.io entry must never enter a bundle.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'colorjs.io',
              message: "Use procedural partial imports from 'colorjs.io/fn' instead.",
            },
          ],
        },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { console: 'readonly', process: 'readonly' },
    },
  },
);
