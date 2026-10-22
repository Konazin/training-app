module.exports = {
  preset: '@react-native/jest-preset',
  testMatch: ['<rootDir>/src/**/*.rntl.test.tsx'],
  moduleNameMapper: { '^lucide-react-native$': '<rootDir>/../node_modules/lucide-react-native/dist/cjs/lucide-react-native.js' },
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.expo/', '/.eas-inspect/'],
}
