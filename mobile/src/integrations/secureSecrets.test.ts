import { describe, expect, it, vi } from 'vitest'

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => undefined),
  deleteItemAsync: vi.fn(async () => undefined),
}))

import { createSecureSecretsRepository } from './secureSecrets'

describe('SecureStore secrets repository', () => {
  it('namespaces provider keys and never accepts empty secrets', async () => {
    const values = new Map<string, string>()
    const repository = createSecureSecretsRepository({
      getItemAsync: async (key) => values.get(key) ?? null,
      setItemAsync: async (key, value) => { values.set(key, value) },
      deleteItemAsync: async (key) => { values.delete(key) },
    })

    await repository.set('nutrition.gemini.api-key', '  user-key  ')
    expect(await repository.get('nutrition.gemini.api-key')).toBe('user-key')
    expect([...values.keys()]).toEqual(['training.secret.nutrition.gemini.api-key'])
    await expect(repository.set('nutrition.gemini.api-key', '  ')).rejects.toThrow('vazia')
    await repository.remove('nutrition.gemini.api-key')
    expect(await repository.get('nutrition.gemini.api-key')).toBeNull()
  })

  it('rejects unsafe secret identifiers', async () => {
    const repository = createSecureSecretsRepository({
      getItemAsync: async () => null,
      setItemAsync: async () => undefined,
      deleteItemAsync: async () => undefined,
    })
    await expect(repository.get('../gemini')).rejects.toThrow('inválido')
  })
})
