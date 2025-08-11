const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

// Load environment variables
require('dotenv').config();



module.exports = {
  entry: {
    content: './src/content.ts',
    background: './src/background.js',
    popup: './src/popup.js',
    pageWorld: '@inboxsdk/core/pageWorld.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader'
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  chrome: '88'
                }
              }]
            ]
          }
        }
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.FIREBASE_FUNCTION_ENDPOINT': JSON.stringify(process.env.FIREBASE_FUNCTION_ENDPOINT || 'https://us-central1-propertymanager-66f54.cloudfunctions.net/generateWordDoc'),
      'process.env.PROJECT_ID': JSON.stringify(process.env.PROJECT_ID || 'propertymanager-66f54'),
      'process.env.FIREBASE_STORAGE_ENDPOINT': JSON.stringify(process.env.FIREBASE_STORAGE_ENDPOINT || 'https://firebasestorage.googleapis.com/v0/b/propertymanager-66f54.firebasestorage.app')
    }),
    new CopyPlugin({
      patterns: [
        { 
          from: 'src/manifest.json', 
          to: 'manifest.json',
          transform(content) {
            const manifestContent = content.toString();
            return manifestContent
              .replace(/\$\{PROJECT_ID\}/g, process.env.PROJECT_ID || 'propertymanager-66f54')
              .replace(/\$\{FIREBASE_STORAGE_ENDPOINT\}/g, process.env.FIREBASE_STORAGE_ENDPOINT || 'https://firebasestorage.googleapis.com/v0/b/propertymanager-66f54.firebasestorage.app');
          }
        },
        { from: 'src/popup.html', to: 'popup.html' },
        { from: 'src/popup.css', to: 'popup.css' },
        { from: 'src/home.svg', to: 'home.svg' }
      ]
    })
  ],
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      "buffer": false,
      "crypto": false,
      "stream": false,
      "util": false,
      "assert": false,
      "http": false,
      "https": false,
      "os": false,
      "url": false
    }
  },

};
