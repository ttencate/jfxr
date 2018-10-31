const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const outputPath = path.resolve(__dirname, 'dist');

module.exports = {
  mode: 'production',
  entry: './js/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[hash].js',
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
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: { sourceMap: true },
          },
          {
            loader: 'sass-loader',
            options: {
              outputStyle: 'compressed',
              sourceMap: true,
            },
          },
        ],
      },
      {
        test: /\.png$/,
        use: [
          'file-loader',
          {
            loader: 'image-webpack-loader',
            options: {
              optipng: {
                enabled: true,
                optimizationLevel: 7,
              },
            },
          },
        ],
      },
    ],
  },
  devtool: 'source-map',
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
    }),
    new MiniCssExtractPlugin({
      filename: '[hash].css',
    }),
  ],
  stats: 'minimal',
};
