module.exports = {
  env: {
    es6: true,
    node: true,
    browser: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
  },
  plugins: ['import'],
  overrides: [
    {
      files: ['**/*.{ts,tsx}'],
      rules: {
        'import/extensions': ['off'],
      },
    },
  ],
};
