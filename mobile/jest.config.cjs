module.exports = {
  preset: '@react-native/jest-preset',
  testMatch: ['<rootDir>/src/**/*.rntl.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.expo/', '/.eas-inspect/'],
}
