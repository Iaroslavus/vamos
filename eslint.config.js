// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

const zustandStableSelectors = require('./eslint/zustand-stable-selectors');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    plugins: {
      vamos: {
        rules: {
          'zustand-stable-selectors': zustandStableSelectors,
        },
      },
    },
    rules: {
      'vamos/zustand-stable-selectors': 'error',
    },
  },
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
]);
