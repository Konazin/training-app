import { describe, expect, it } from 'vitest'
import type { SecretsRepository } from '..'

describe('SecretsRepository', () => {
  it('define contrato assíncrono sem expor storage ou chaves reais', async () => {
    const values = new Map<string, string>()
    const repository: SecretsRepository = {
      get: async (key) => values.get(key) ?? null,
      set: async (key, value) => { values.set(key, value) },
      remove: async (key) => { values.delete(key) },
    }
    await repository.set('future-provider', 'test-only')
    expect(await repository.get('future-provider')).toBe('test-only')
    await repository.remove('future-provider')
    expect(await repository.get('future-provider')).toBeNull()
  })
})
