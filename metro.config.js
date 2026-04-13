const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

const config = getDefaultConfig(__dirname);

// #region agent log
try {
  fs.appendFileSync(
    path.join(__dirname, '.cursor', 'debug-948bca.log'),
    JSON.stringify({
      sessionId: '948bca',
      hypothesisId: 'H1',
      location: 'metro.config.js:load',
      message: 'Metro default config loaded',
      data: {
        babelTransformerPath: config.transformer?.babelTransformerPath ?? null,
        transformerPath: config.transformerPath ?? null,
      },
      timestamp: Date.now(),
    }) + '\n'
  );
} catch (_) {}
// #endregion

module.exports = config;
