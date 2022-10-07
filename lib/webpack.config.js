const path = require('path');

const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'jfxr.min.js',
    libraryTarget: 'umd',
    library: 'jfxr',
  },
  devtool: 'source-map',
  plugins: [
    new ESLintPlugin({
      emitWarning: true,
    }),
  ],
  stats: 'minimal',
};
