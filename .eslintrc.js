// eslint-disable-next-line no-undef
module.exports = {
  env: {
    browser: true,
    es2021: true,
    "jest/globals": true

  },
  extends: [
    'plugin:react/recommended',
    'eslint:recommended',
    "plugin:jest/recommended"
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    'react',
  ],
  rules: {
    "jest/prefer-expect-assertions": [
      "warn",
      { "onlyFunctionsWithAsyncKeyword": true }
    ]
  },
};
