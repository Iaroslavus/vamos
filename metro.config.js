const { getDefaultConfig } = require('expo/metro-config');

const { applyWatchExclusions } = require('./metro/blocklist');

const projectRoot = __dirname;

module.exports = applyWatchExclusions(getDefaultConfig(projectRoot), projectRoot);
