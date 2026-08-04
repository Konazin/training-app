import type { SettingsRepository } from '../repositories'

export const DEFAULT_DISPLAY_NAME = 'Atleta'
export const DISPLAY_NAME_MAX_LENGTH = 24
export const LOCAL_PREFERENCES_KEY = 'preferences.local'

export interface LocalPreferences {
  displayName: string
}

export interface LocalPreferencesRepository {
  load(): Promise<LocalPreferences>
  saveDisplayName(value: unknown): Promise<LocalPreferences>
}

export function normalizeDisplayName(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_DISPLAY_NAME
  const trimmed = value.trim()
  if (!trimmed) return DEFAULT_DISPLAY_NAME
  return Array.from(trimmed).slice(0, DISPLAY_NAME_MAX_LENGTH).join('')
}

export function resolveDisplayName(preferences: unknown): string {
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
    return DEFAULT_DISPLAY_NAME
  }
  return normalizeDisplayName((preferences as { displayName?: unknown }).displayName)
}

export function createLocalPreferencesRepository(
  settings: Pick<SettingsRepository, 'get' | 'set'>,
): LocalPreferencesRepository {
  return {
    async load() {
      const stored = await settings.get<unknown>(LOCAL_PREFERENCES_KEY)
      return { displayName: resolveDisplayName(stored) }
    },
    async saveDisplayName(value) {
      const preferences = { displayName: normalizeDisplayName(value) }
      await settings.set(LOCAL_PREFERENCES_KEY, preferences)
      return preferences
    },
  }
}
