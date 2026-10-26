const darkSources = [
  'tokens/primitive/**/*.tokens.json',
  'tokens/semantic/dark.tokens.json',
  'tokens/component/**/*.tokens.json',
];

export default {
  source: darkSources,
  platforms: {
    cssDark: {
      transformGroup: 'css',
      buildPath: 'build/',
      files: [
        {
          destination: 'tokens.dark.css',
          format: 'css/variables',
          options: {
            selector: '[data-theme="dark"]',
            outputReferences: true,
          },
        },
      ],
    },
  },
};
