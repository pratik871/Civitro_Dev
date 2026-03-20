const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// Disable watchman — use polling instead (watchman has socket issues on this Mac)
config.resolver.useWatchman = false;

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Workaround: Metro on Windows fails to resolve relative requires whose filename
// contains extra dots (e.g. "MapView.types.js", "store-shim.native.development.js").
// Intercept any relative require that has a dot after the first path segment and
// resolve it manually if the .js file exists on disk.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('.') && moduleName.lastIndexOf('.') > moduleName.lastIndexOf('/')) {
    const caller = context.originModulePath;
    const dir = path.dirname(caller);
    for (const ext of ['.js', '.ts', '.jsx', '.tsx']) {
      const candidate = path.resolve(dir, moduleName + ext);
      if (fs.existsSync(candidate)) {
        return { type: 'sourceFile', filePath: candidate };
      }
    }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
