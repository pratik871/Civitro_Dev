module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    'react-native-reanimated/plugin',
    [
      'module-resolver',
      {
        root: ['.'],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@screens': './src/screens',
          '@navigation': './src/navigation',
          '@lib': './src/lib',
          '@stores': './src/stores',
          '@hooks': './src/hooks',
          '@types': './src/types',
          '@theme': './src/theme',
        },
      },
    ],
  ],
};
