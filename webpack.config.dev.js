const path = require('path');
const defaultConfig = require('./webpack.config.default');

const config = {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    contentBase: [path.join(__dirname, 'dist'), path.join(__dirname, 'data')],
  },
};

module.exports = {
  ...defaultConfig,
  ...config,
};
