// @ts-check
/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  rules: {
    // Tailwind v4 theme block.
    'at-rule-no-unknown': [true, { ignoreAtRules: ['theme'] }],
    // Font stacks carry proper-noun family names (`Inter`) by design.
    'value-keyword-case': ['lower', { ignoreProperties: ['/^--font/'] }],
  },
  overrides: [{ files: ['**/*.scss'], customSyntax: 'postcss-scss' }],
};
