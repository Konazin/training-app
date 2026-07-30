import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AccessibilityInfo, useColorScheme, View } from 'react-native'
import { resolvedDarkTheme } from './uiContracts'
import {
  darkColors,
  lightColors,
  resolvePalette,
  type AppearancePreference,
  type ThemeColors,
  type ThemePreference,
} from './palette'
import {
  defaultUiPreferences,
  previewUiPreferences,
  cancelUiPreferencesPreview,
  restoreDefaultUiPreferences,
  type UiPreferences,
  uiPreferencesRepository,
} from './preferences'
import { motionSettings, resolveMotionPreference, type MotionSettings } from './motion'

export {
  darkColors,
  lightColors,
  resolvePalette,
  themePalettes,
  type AppearancePreference,
  type MotionPreference,
  type ThemeColors,
  type ThemePreference,
  type ThemePreset,
  type WorkoutColors,
} from './palette'
export {
  appearancePreferenceIds,
  defaultUiPreferences,
  isUiPreferences,
  motionPreferenceIds,
  themePresetIds,
  previewUiPreferences,
  cancelUiPreferencesPreview,
  restoreDefaultUiPreferences,
  type UiPreferences,
} from './preferences'
export { motionSettings, resolveMotionPreference, type EffectiveMotion, type MotionSettings } from './motion'
export { shared } from './tokens'

export const colors: ThemeColors = lightColors

export function resolveThemePreference(
  preference: AppearancePreference | ThemePreference,
  systemScheme: 'light' | 'dark' | 'unspecified' | null | undefined,
) {
  return resolvedDarkTheme(preference, systemScheme)
}

interface ThemeContextValue {
  colors: ThemeColors
  isDark: boolean
  ready: boolean
  preferences: UiPreferences
  savedPreferences: UiPreferences
  motion: MotionSettings
  previewPreferences: (preferences: UiPreferences) => void
  updatePreview: (partial: Partial<UiPreferences>) => void
  savePreferences: () => Promise<boolean>
  cancelPreview: () => void
  restoreDefaults: () => void
  applyImportedPreferences: (preferences: UiPreferences) => Promise<boolean>
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

const fallbackMotion = motionSettings('FULL')
const ThemeContext = createContext<ThemeContextValue>({
  colors: darkColors,
  isDark: true,
  ready: false,
  preferences: { ...defaultUiPreferences },
  savedPreferences: { ...defaultUiPreferences },
  motion: fallbackMotion,
  previewPreferences: () => undefined,
  updatePreview: () => undefined,
  savePreferences: async () => false,
  cancelPreview: () => undefined,
  restoreDefaults: () => undefined,
  applyImportedPreferences: async () => false,
  preference: 'system',
  setPreference: () => undefined,
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme()
  const [preferences, setPreferences] = useState<UiPreferences>({ ...defaultUiPreferences })
  const [savedPreferences, setSavedPreferences] = useState<UiPreferences>({ ...defaultUiPreferences })
  const savedRef = useRef<UiPreferences>({ ...defaultUiPreferences })
  const [ready, setReady] = useState(false)
  const [systemReduceMotion, setSystemReduceMotion] = useState(false)

  useEffect(() => {
    let mounted = true
    void Promise.all([
      uiPreferencesRepository.load(),
      AccessibilityInfo.isReduceMotionEnabled().catch(() => false),
    ]).then(([stored, reduceMotion]) => {
      if (!mounted) return
      savedRef.current = stored
      setSavedPreferences(stored)
      setPreferences(stored)
      setSystemReduceMotion(reduceMotion)
      setReady(true)
    })
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      if (mounted) setSystemReduceMotion(enabled)
    })
    return () => {
      mounted = false
      subscription.remove()
    }
  }, [])

  const previewPreferences = useCallback((next: UiPreferences) => setPreferences({ ...next }), [])
  const updatePreview = useCallback((partial: Partial<UiPreferences>) => {
    setPreferences((current) => previewUiPreferences(current, partial))
  }, [])
  const savePreferences = useCallback(async () => {
    try {
      await uiPreferencesRepository.save(preferences)
      savedRef.current = { ...preferences }
      setSavedPreferences({ ...preferences })
      return true
    } catch {
      return false
    }
  }, [preferences])
  const cancelPreview = useCallback(() => setPreferences(cancelUiPreferencesPreview(savedRef.current)), [])
  const restoreDefaults = useCallback(() => setPreferences(restoreDefaultUiPreferences()), [])
  const applyImportedPreferences = useCallback(async (imported: UiPreferences) => {
    try {
      await uiPreferencesRepository.save(imported)
      savedRef.current = { ...imported }
      setSavedPreferences({ ...imported })
      setPreferences({ ...imported })
      return true
    } catch {
      return false
    }
  }, [])
  const setPreference = useCallback((legacy: ThemePreference) => {
    updatePreview({ appearance: legacy.toUpperCase() as AppearancePreference })
  }, [updatePreview])

  const isDark = resolveThemePreference(preferences.appearance, systemScheme)
  const effectiveMotion = resolveMotionPreference(preferences.motion, systemReduceMotion)
  const value = useMemo<ThemeContextValue>(() => ({
    colors: resolvePalette(preferences.themePreset, isDark),
    isDark,
    ready,
    preferences,
    savedPreferences,
    motion: motionSettings(effectiveMotion),
    previewPreferences,
    updatePreview,
    savePreferences,
    cancelPreview,
    restoreDefaults,
    applyImportedPreferences,
    preference: preferences.appearance.toLowerCase() as ThemePreference,
    setPreference,
  }), [
    cancelPreview,
    effectiveMotion,
    isDark,
    preferences,
    previewPreferences,
    ready,
    restoreDefaults,
    applyImportedPreferences,
    savePreferences,
    savedPreferences,
    setPreference,
    updatePreview,
  ])

  if (!ready) {
    const fallbackDark = resolveThemePreference(defaultUiPreferences.appearance, systemScheme)
    return <View style={{ backgroundColor: resolvePalette(defaultUiPreferences.themePreset, fallbackDark).background, flex: 1 }} />
  }
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
