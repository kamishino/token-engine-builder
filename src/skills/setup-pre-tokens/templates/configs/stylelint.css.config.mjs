export default {
  extends: ['stylelint-config-standard'],
  rules: {
    'color-no-hex': true,
    'selector-class-pattern': [
      '^(?:[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?|(?:is|has)-[a-z0-9]+(?:-[a-z0-9]+)*)$',
      {
        message:
          'Expected a BEM class (block__element--modifier) or state class (is-…, has-…)',
      },
    ],
  },
  ignoreFiles: ['build/**'],
  overrides: [
    {
      files: ['__STYLES_ROOT__/vendors/**/*.css'],
      rules: { 'selector-class-pattern': null, 'color-no-hex': null },
    },
  ],
};
