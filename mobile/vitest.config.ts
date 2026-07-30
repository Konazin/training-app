import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [
      ...configDefaults.exclude,
      '**/.eas-inspect/**',
      '**/.expo/**',
      '**/dist/**',
      '**/*.rntl.test.tsx',
    ],
  },
})
