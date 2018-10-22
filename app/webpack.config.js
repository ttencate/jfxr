const path = require('path');

module.exports = {
  mode: 'production',
  entry: './js/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    libraryTarget: 'umd',
    library: 'jfxr',
  },
  devtool: 'source-map',
};
