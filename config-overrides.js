const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = function override(config, env) {
  // Ajouter le plugin de polyfill Node.js
  config.plugins.push(
    new NodePolyfillPlugin({
      excludeAliases: ['console']
    })
  );

  // Configuration pour sql.js
  config.resolve.fallback = {
    ...config.resolve.fallback,
    fs: false,
    path: false,
    crypto: false,
    stream: false,
    buffer: false,
    util: false,
    assert: false,
    http: false,
    https: false,
    os: false,
    url: false,
  };

  return config;
};
