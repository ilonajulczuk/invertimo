const path = require('path');
const webpack = require('webpack');

const CompressionPlugin = require("compression-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');


module.exports = (env, argv) => {

  return {

    plugins: [
      new CompressionPlugin({
        algorithm: "gzip",
      }),
      new HtmlWebpackPlugin({
        title: 'Invertimo',
        filename: '../templates/base_internal.webpack.html',
        template: 'templates/base_internal.tmpl.html',
      }),
      new webpack.DefinePlugin({
        'process.env': {
          'PRODUCTION': argv.mode != "development",
        }
      })
    ],
    entry: './assets/index.js',  // path to our input file
    output: {
      filename: '[name].[contenthash].index-bundle.js',  // output bundle file name
      path: path.resolve(__dirname, './static'),  // path to our Django static directory
    },
    devtool: 'eval-source-map',
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"]

          }
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: 'asset/resource',
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader'],
        },
      ]
    },
    optimization: {
      usedExports: true,
      moduleIds: 'deterministic',
      runtimeChunk: 'single',
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    },

  };
};
