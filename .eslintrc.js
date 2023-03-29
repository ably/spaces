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
  plugins: ['@typescript-eslint', 'security', 'jsdoc'],
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
      },
    },
    {
      files: 'ably.d.ts',
      extends: ['plugin:jsdoc/recommended'],
    },
  ],
  ignorePatterns: ["dist", "build"],
  settings: {
    jsdoc: {
      tagNamePreference: {
        default: 'defaultValue',
      },
    },
  },
};
