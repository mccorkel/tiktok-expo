module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['@babel/plugin-proposal-class-static-block'],
      ["module:react-native-dotenv"],
      ['module-resolver', {
        alias: {
          'stream': 'stream-browserify',
          'buffer': '@craftzdog/react-native-buffer',
          'web-streams-polyfill/es6': 'web-streams-polyfill'
        }
      }]
    ]
  };
}; 