const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro configuration for React Native
 * Standard Expo configuration for mobile builds
 */
const config = getDefaultConfig(__dirname);

module.exports = config;