import AsyncStorage from '@react-native-async-storage/async-storage'
import type {
  AppearancePreference,
  MotionPreference,
  ThemePreset,
} from './palette'

export interface UiPreferences {
  themePreset: ThemePreset
  appearance: AppearancePreference
  motion: MotionPreference
  workoutHighContrast: boolean
  hapticsEnabled: boolean
}

export const defaultUiPreferences: Readonly<UiPreferences> = Object.freeze({
  themePreset: 'DARK_BLUE',
  appearance: 'SYSTEM',
  motion: 'SYSTEM',
  workoutHighContrast: false,
  hapticsEnabled: true,
})

export const themePresetIds: readonly ThemePreset[] = ['DARK_BLUE', 'MONOCHROME', 'DRACULA', 'WHITE_BLUE']
export const appearancePreferenceIds: readonly AppearancePreference[] = ['SYSTEM', 'LIGHT', 'DARK']
export const motionPreferenceIds: readonly MotionPreference[] = ['SYSTEM', 'FULL', 'REDUCED', 'OFF']

interface Storage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

interface StoredUiPreferences {
  version: 1
  preferences: UiPreferences
}

export interface UiPreferencesRepository {
  load(): Promise<UiPreferences>
  save(preferences: UiPreferences): Promise<void>
}

export const UI_PREFERENCES_STORAGE_KEY = 'training-app:ui-preferences'
const LEGACY_THEME_STORAGE_KEY = 'training-app:theme'

export function isUiPreferences(value: unknown): value is UiPreferences {
  if (!value || typeof value !== 'object') return false
  const input = value as Partial<UiPreferences>
  return themePresetIds.includes(input.themePreset as ThemePreset)
    && appearancePreferenceIds.includes(input.appearance as AppearancePreference)
    && motionPreferenceIds.includes(input.motion as MotionPreference)
    && typeof input.workoutHighContrast === 'boolean'
    && typeof input.hapticsEnabled === 'boolean'
}

export function createUiPreferencesRepository(storage: Storage = AsyncStorage): UiPreferencesRepository {
  return {
    async load() {
      try {
        const raw = await storage.getItem(UI_PREFERENCES_STORAGE_KEY)
        if (!raw) {
          const legacy = await storage.getItem(LEGACY_THEME_STORAGE_KEY)
          return legacy === 'system' || legacy === 'light' || legacy === 'dark'
            ? { ...defaultUiPreferences, appearance: legacy.toUpperCase() as AppearancePreference }
            : { ...defaultUiPreferences }
        }
        const stored = JSON.parse(raw) as Partial<StoredUiPreferences>
        return stored.version === 1 && isUiPreferences(stored.preferences)
          ? { ...stored.preferences }
          : { ...defaultUiPreferences }
      } catch {
        return { ...defaultUiPreferences }
      }
    },
    async save(preferences) {
      if (!isUiPreferences(preferences)) throw new Error('Preferências de interface inválidas.')
      const payload: StoredUiPreferences = { version: 1, preferences: { ...preferences } }
      await storage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(payload))
    },
  }
}

export const uiPreferencesRepository = createUiPreferencesRepository()

export function previewUiPreferences(current: UiPreferences, partial: Partial<UiPreferences>) {
  return { ...current, ...partial }
}

export function cancelUiPreferencesPreview(saved: UiPreferences) {
  return { ...saved }
}

export function restoreDefaultUiPreferences() {
  return { ...defaultUiPreferences }
}
