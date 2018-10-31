const path = require('path');

module.exports = {
  mode: 'production',
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'jfxr.min.js',
    libraryTarget: 'umd',
    library: 'jfxr',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'eslint-loader',
        enforce: 'pre',
        options: {
          emitWarning: true,
        },
      },
    ],
  },
  devtool: 'source-map',
  stats: 'minimal',
};
