const darkSources = [
  'tokens/primitive/**/*.tokens.json',
  'tokens/semantic/dark.tokens.json',
  'tokens/component/**/*.tokens.json',
];

export default {
  source: darkSources,
  hooks: {
    transforms: {
      'pre-tokens/color-oklch': {
        type: 'value',
        transitive: true,
        filter: (token) => (token.$type ?? token.type) === 'color',
        transform: (token) => {
          const value = token.$value ?? token.value;
          if (
            value !== null &&
            typeof value === 'object' &&
            value.colorSpace === 'oklch'
          ) {
            const [l, c, h] = value.components;
            const fmt = (n, dp) => Number(n.toFixed(dp)).toString();
            const base = `oklch(${fmt(l * 100, 2)}% ${fmt(c, 4)} ${fmt(h, 2)}deg`;
            return value.alpha !== undefined && value.alpha < 1
              ? `${base} / ${value.alpha})`
              : `${base})`;
          }
          return value;
        },
      },
    },
  },
  platforms: {
    cssDark: {
      transforms: [
        'attribute/cti',
        'name/kebab',
        'time/seconds',
        'html/icon',
        'size/rem',
        'pre-tokens/color-oklch',
        'asset/url',
        'fontFamily/css',
        'cubicBezier/css',
        'strokeStyle/css/shorthand',
        'border/css/shorthand',
        'typography/css/shorthand',
        'transition/css/shorthand',
        'shadow/css/shorthand',
      ],
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
