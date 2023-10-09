module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
    browser: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'security', 'jsdoc', 'import'],
  extends: ['eslint:recommended', 'plugin:security/recommended'],
  rules: {
    'eol-last': 'error',
    // security/detect-object-injection just gives a lot of false positives
    // see https://github.com/nodesecurity/eslint-plugin-security/issues/21
    'security/detect-object-injection': 'off',
  },
  overrides: [
    {
      files: ['**/*.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-unused-vars': ['error'],
        // TypeScript already enforces these rules better than any eslint setup can
        'no-undef': 'off',
        'no-dupe-class-members': 'off',
        // see:
        // https://github.com/ably/spaces/issues/76
        // https://github.com/microsoft/TypeScript/issues/16577#issuecomment-703190339
        'import/extensions': [
          'error',
          'always',
          {
            ignorePackages: true,
          },
        ],
      },
    },
    {
      files: 'ably.d.ts',
      extends: ['plugin:jsdoc/recommended'],
    },
  ],
  ignorePatterns: ['dist', 'build', 'examples', 'test/ably-common'],
  settings: {
    jsdoc: {
      tagNamePreference: {
        default: 'defaultValue',
      },
    },
  },
};
