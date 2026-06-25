const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  mode: 'production',
  experiments: {
    outputModule: true, // Enable ES module output
  },
  output: {
    path: join(__dirname, '../../dist/apps/api'),
    filename: 'main.js',
    library: {
      type: 'module', // Output as ESM module
    },
    clean: process.env.NODE_ENV === 'production',
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  externals: [
    // Exclude all node_modules from bundling to avoid ESM/CommonJS conflicts
    (context, request, callback) => {
      if (/^[a-z@]/.test(request)) {
        return callback(null, `module ${request}`);
      }
      callback();
    },
  ],
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMap: true,
    }),
  ],
};
