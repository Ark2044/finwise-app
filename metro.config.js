const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add polyfills for Node.js globals and modules
config.resolver.alias = {
  ...config.resolver.alias,
  // Polyfill node:buffer and other node: prefixed modules
  'node:buffer': 'buffer',
  'node:util': 'util',
  'node:stream': 'readable-stream',
  'node:url': 'react-native-url-polyfill',
  'crypto': 'expo-crypto',
  'stream': 'readable-stream',
  'util': 'util',
  'lucide-react-native': path.resolve(__dirname, 'node_modules/lucide-react-native/dist/esm/lucide-react-native.js'),
};

// Enable unstable_allowRequireContext for better compatibility
config.transformer.unstable_allowRequireContext = true;

// Add resolver configuration for node modules
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

// Add nodeModulesPaths configuration
config.resolver.nodeModulesPaths = [
  'node_modules',
];

module.exports = config;