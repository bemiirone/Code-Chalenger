const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  mode: 'production',
  output: {
    path: join(__dirname, '../../dist/apps/api'),
    filename: 'main.js',
    library: {
      type: 'commonjs2', // CJS output — no .js extension issues in Node runtime
    },
    clean: true,
  },
  externals: [
    // Keep all node_modules external — resolved at runtime on Vercel
    (context, request, callback) => {
      if (/^[a-z@]/.test(request)) {
        return callback(null, `commonjs ${request}`);
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
      sourceMap: false,
    }),
  ],
};
