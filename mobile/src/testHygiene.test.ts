import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('higiene de artefatos de teste', () => {
  it('exclui cópias EAS, metadados Expo e bundles sem esconder src', () => {
    const config = readFileSync(new URL('../vitest.config.ts', import.meta.url), 'utf8')
    expect(config).toContain('...configDefaults.exclude')
    expect(config).toContain("'**/.eas-inspect/**'")
    expect(config).toContain("'**/.expo/**'")
    expect(config).toContain("'**/dist/**'")
    expect(config).not.toContain("'**/src/**'")
  })
})
