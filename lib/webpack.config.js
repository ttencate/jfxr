const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'jfxr.js',
    libraryTarget: 'umd',
    library: 'jfxr',
  },
  devtool: 'source-map',
};
