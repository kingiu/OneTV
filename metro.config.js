// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// Find the project and workspace directories
// eslint-disable-next-line no-undef
const projectRoot = __dirname;

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Enable TV-specific extensions when EXPO_TV is set
if (process.env?.EXPO_TV === '1') {
  const originalSourceExts = config.resolver.sourceExts;
  const tvSourceExts = [
    ...originalSourceExts.map((e) => `tv.${e}`),
    ...originalSourceExts,
  ];
  config.resolver.sourceExts = tvSourceExts;
}

// Optimize Metro for memory usage and performance
config.transformer = {
  ...config.transformer,
};

// Fix 'Too many elements passed to Promise.all' error by limiting file processing
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.platforms = ['android', 'ios', 'web'];
config.resolver.useWatchman = false;
config.maxWorkers = 4;

// Only watch the current project directory to reduce memory usage
config.watchFolders = [projectRoot];

// Optimize resolver paths
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules")
];
config.resolver.disableHierarchicalLookup = true;

// Add cache optimization
config.cacheStores = [
  new (require('metro-cache').FileStore)({
    root: path.join(projectRoot, '.metro-cache'),
    ttl: 86400000, // 1 day in milliseconds
  }),
];


module.exports = config;
