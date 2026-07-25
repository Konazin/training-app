import { createContext, type ReactNode, useContext, useMemo, useState } from 'react'
import { useColorScheme } from 'react-native'

const lightColors = {
  black: '#0a0a0a',
  nearBlack: '#111111',
  ink: '#171717',
  gray700: '#404040',
  gray500: '#737373',
  gray400: '#a3a3a3',
  gray300: '#d4d4d4',
  gray200: '#e5e5e5',
  gray100: '#f5f5f5',
  background: '#f2f1ed',
  surface: '#fafaf8',
  white: '#ffffff',
  card: '#ffffff',
  danger: '#991b1b',
  primary: '#111111',
  onPrimary: '#ffffff',
} as const

const darkColors: ThemeColors = {
  black: '#0a0a0a',
  nearBlack: '#111111',
  ink: '#f5f5f5',
  gray700: '#d4d4d4',
  gray500: '#a3a3a3',
  gray400: '#858585',
  gray300: '#525252',
  gray200: '#353535',
  gray100: '#242424',
  background: '#0b0b0b',
  surface: '#202020',
  white: '#ffffff',
  card: '#171717',
  danger: '#f87171',
  primary: '#f5f5f5',
  onPrimary: '#111111',
}

export type ThemeColors = { [Key in keyof typeof lightColors]: string }
export const colors: ThemeColors = lightColors

interface ThemeContextValue {
  colors: ThemeColors
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
  toggleTheme: () => undefined,
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme()
  const [isDark, setIsDark] = useState(systemScheme === 'dark')
  const value = useMemo(
    () => ({
      colors: isDark ? darkColors : lightColors,
      isDark,
      toggleTheme: () => setIsDark((current) => !current),
    }),
    [isDark],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}

export const shared = {
  radius: 20,
  pagePadding: 20,
}
