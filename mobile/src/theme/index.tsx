import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { useColorScheme } from 'react-native'
import { resolvedDarkTheme } from './uiContracts'
import { darkColors, lightColors, type ThemeColors, type ThemePreference } from './palette'
export { darkColors, lightColors, type ThemeColors, type ThemePreference } from './palette'
export { shared } from './tokens'

export const colors: ThemeColors = lightColors
const STORAGE_KEY = 'training-app:theme'

export function resolveThemePreference(preference: ThemePreference, systemScheme: 'light' | 'dark' | 'unspecified' | null | undefined) {
  return resolvedDarkTheme(preference, systemScheme)
}

interface ThemeContextValue {
  colors: ThemeColors
  isDark: boolean
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
  preference: 'system',
  setPreference: () => undefined,
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme()
  const [preference, setPreferenceState] = useState<ThemePreference>('system')

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'system' || stored === 'light' || stored === 'dark') setPreferenceState(stored)
    })
  }, [])

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next)
    void AsyncStorage.setItem(STORAGE_KEY, next)
  }
  const isDark = resolveThemePreference(preference, systemScheme)
  const value = useMemo(
    () => ({ colors: isDark ? darkColors : lightColors, isDark, preference, setPreference }),
    [isDark, preference],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
