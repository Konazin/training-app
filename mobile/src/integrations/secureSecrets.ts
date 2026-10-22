import * as SecureStore from 'expo-secure-store'
import type { SecretsRepository } from '@training/training-domain'

export const GEMINI_API_KEY_SECRET = 'nutrition.gemini.api-key'

type SecureStoreAdapter = Pick<typeof SecureStore, 'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'>

/** Stores provider credentials outside SQLite, AsyncStorage, and portable backups. */
export function createSecureSecretsRepository(store: SecureStoreAdapter = SecureStore): SecretsRepository {
  return {
    get: async (key) => store.getItemAsync(storageKey(key)),
    set: async (key, value) => {
      const normalized = value.trim()
      if (!normalized) throw new Error('A chave não pode ficar vazia.')
      await store.setItemAsync(storageKey(key), normalized)
    },
    remove: async (key) => { await store.deleteItemAsync(storageKey(key)) },
  }
}

function storageKey(key: string) {
  const normalized = key.trim()
  if (!normalized || normalized.length > 120 || !/^[a-zA-Z0-9._-]+$/.test(normalized)) {
    throw new Error('Identificador de segredo inválido.')
  }
  return `training.secret.${normalized}`
}
