module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^@expo/vector-icons$': '<rootDir>/test/mocks/expoVectorIcons.cjs',
    '^expo-image-picker$': '<rootDir>/test/mocks/expoImagePicker.cjs',
  },
  testMatch: ['<rootDir>/src/**/*.rntl.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.expo/', '/.eas-inspect/'],
}
