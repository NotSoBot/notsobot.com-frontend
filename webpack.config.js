const path = require('path');

const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const { DefinePlugin } = require('webpack');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WebpackGoogleCloudStoragePlugin  = require('webpack-google-cloud-storage-plugin');


const EnvironmentTypes = Object.freeze({
  BETA: 'beta',
  STABLE: 'stable',
  STAGING: 'staging',
});


const GOOGLE_CLOUD_BUCKET_NAME = 'notsobot';
const GOOGLE_CLOUD_PROJECT_ID = 'notsobot';


const DIR = {
  APP: path.resolve(__dirname, './src'),
  BUILD: path.resolve(__dirname, './dist/assets'),
};

const BabelOptions = {
  cacheDirectory: true,
  presets: [
    '@babel/preset-env',
    '@babel/react',
  ],
};

const EnvironmentTypes = Object.freeze({
  BETA: 'beta',
  STABLE: 'stable',
  STAGING: 'staging',
});


const FILES_TO_DISALLOW_CACHE = ['manifest.json', 'app.js', 'app.css'];

module.exports = (env) => {
  const production = !!env.production;
  const shouldHash = !!(env.hash || env.production);
  const VERSION = (env.production) ? EnvironmentTypes.STABLE : EnvironmentTypes.BETA;

  return {
    entry: [
      '@babel/polyfill',
      'url-search-params-polyfill',
      'whatwg-fetch',
      path.join(DIR.APP, 'index.ts'),
    ],
    output: {
      assetModuleFilename: '[hash][ext][query]',
      chunkFilename: '[chunkhash].js',
      filename: (shouldHash) ? '[chunkhash].js' : 'app.js',
      path: DIR.BUILD,
      publicPath: '/assets/',
    },
    devtool: 'source-map',
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    module: {
      rules: [
        {
          test: /\.s[ac]ss$/i,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                import: true,
                importLoaders: 2,
                modules: {
                  exportGlobals: true,
                  exportLocalsConvention: 'camelCaseOnly',
                  localIdentName: '[local]-[hash:base64:5]',
                  mode: 'local',
                  namedExport: true,
                },
                sourceMap: true,
              },
            },
            {
              loader: 'postcss-loader',
            },
            {
              loader: 'sass-loader',
              options: {
                implementation: require('node-sass'),
                sourceMap: true,
              },
            },
          ],
        },
        {
          test: /\.ts(x?)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: BabelOptions,
            },
            {
              loader: 'ts-loader',
            },
          ],
        },
        {
          test: /\.js$/g,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: BabelOptions,
          },
        },
        {
          test: /\.(png|jpe?g|gif|svg|eot|ttf|woff|woff2)$/i,
          type: 'asset/resource',
        },
        {
          test: /favicon\.ico$/,
          type: 'asset/resource',
        },
      ],
    },
    mode: (production) ? 'production' : 'development',
    performance: {
      //hints: false,
      maxAssetSize: 512 * 1024,
      maxEntrypointSize: 512 * 1024,
    },
    plugins: [
      new CleanWebpackPlugin(),
      new DefinePlugin({
        __ENVIRONMENT__: `'${VERSION}'`,
      }),
      new WebpackManifestPlugin({
        filename: 'manifest.json',
        filter: (file) => file.isInitial,
        map: (file) => {
          file.name = file.name.split('.').pop();
          return file;
        },
        serialize: (manifest) => JSON.stringify(manifest),
      }),
      new MiniCssExtractPlugin({filename: (shouldHash) ? '[fullhash].css' : 'app.css'}),
      new WebpackGoogleCloudStoragePlugin({
        directory: './dist/assets',
        include: ['.*'],
        storageOptions: {
          keyFilename: './keys/google.key.json',
          projectId: GOOGLE_CLOUD_PROJECT_ID,
        },
        uploadOptions: {
          bucketName: GOOGLE_CLOUD_BUCKET_NAME,
          concurrency: 10,
          destinationNameFn: (file) => path.join('assets', VERSION, file.name),
          metadataFn: (file) => {
            if (FILES_TO_DISALLOW_CACHE.includes(file.name)) {
              return {cacheControl: 'private'};
            }
            return {};
          },
          makePublic: true,
        },
      }),
    ],
  };
};
