import { describe, expect, it } from 'vitest'
import {
  cancelUiPreferencesPreview,
  createUiPreferencesRepository,
  defaultUiPreferences,
  previewUiPreferences,
  restoreDefaultUiPreferences,
  UI_PREFERENCES_STORAGE_KEY,
} from './preferences'

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => { values.set(key, value) },
    value: (key: string) => values.get(key),
  }
}

describe('preferências de interface', () => {
  it('usa padrões seguros para JSON ausente, inválido ou versão desconhecida', async () => {
    for (const raw of [undefined, '{', '{"version":2,"preferences":{}}', '{"version":1,"preferences":{}}']) {
      const storage = memoryStorage(raw === undefined ? {} : { [UI_PREFERENCES_STORAGE_KEY]: raw })
      await expect(createUiPreferencesRepository(storage).load()).resolves.toEqual(defaultUiPreferences)
    }
  })

  it('salva em payload único versionado e restaura todos os campos', async () => {
    const storage = memoryStorage()
    const repository = createUiPreferencesRepository(storage)
    const preferences = {
      ...defaultUiPreferences,
      themePreset: 'DRACULA' as const,
      appearance: 'DARK' as const,
      motion: 'OFF' as const,
      workoutHighContrast: true,
      hapticsEnabled: false,
    }
    await repository.save(preferences)
    expect(JSON.parse(storage.value(UI_PREFERENCES_STORAGE_KEY)!)).toEqual({
      version: 1,
      preferences,
    })
    await expect(repository.load()).resolves.toEqual(preferences)
  })

  it('preserva a preferência simples da versão anterior', async () => {
    const repository = createUiPreferencesRepository(memoryStorage({ 'training-app:theme': 'dark' }))
    await expect(repository.load()).resolves.toEqual({ ...defaultUiPreferences, appearance: 'DARK' })
  })

  it('cancela prévia e restaura padrões sem alterar os objetos recebidos', () => {
    const saved = { ...defaultUiPreferences, themePreset: 'MONOCHROME' as const }
    const preview = previewUiPreferences(saved, { themePreset: 'DRACULA', hapticsEnabled: false })
    expect(preview.themePreset).toBe('DRACULA')
    expect(cancelUiPreferencesPreview(saved)).toEqual(saved)
    expect(restoreDefaultUiPreferences()).toEqual(defaultUiPreferences)
    expect(saved.themePreset).toBe('MONOCHROME')
  })
})
