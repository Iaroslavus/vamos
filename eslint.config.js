// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

const noLiteralUiText = require('./eslint/no-literal-ui-text');
const zustandStableSelectors = require('./eslint/zustand-stable-selectors');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    plugins: {
      vamos: {
        rules: {
          'zustand-stable-selectors': zustandStableSelectors,
          'no-literal-ui-text': noLiteralUiText,
        },
      },
    },
    rules: {
      'vamos/zustand-stable-selectors': 'error',
      'vamos/no-literal-ui-text': 'error',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.test.js', 'app/dev/**', 'app/+html.tsx'],
    rules: {
      'vamos/no-literal-ui-text': 'off',
    },
  },
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
]);
