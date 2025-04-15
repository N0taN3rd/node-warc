const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: {
    'nodewarc': './index.js',
  },
  devtool: 'inline-source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'global',
    globalObject: 'self'
  },

  plugins: [
    new webpack.IgnorePlugin(/fs/),
    new webpack.IgnorePlugin(/untildify/),
  ],
};
