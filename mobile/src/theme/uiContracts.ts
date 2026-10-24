import type { ThemeColors, ThemePreference } from './palette'
import { shared } from './tokens'

export function contrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const channels = hex.slice(1).match(/.{2}/g)?.map((channel) => {
      const value = Number.parseInt(channel, 16) / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })
    if (!channels || channels.length !== 3) throw new Error(`Cor hexadecimal inválida: ${hex}`)
    return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
  }
  const first = luminance(foreground)
  const second = luminance(background)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

export function selectableChipColors(colors: ThemeColors, selected: boolean) {
  return selected
    ? { backgroundColor: colors.ac, borderColor: colors.ac, color: colors.on, indicator: true }
    : { backgroundColor: 'transparent', borderColor: colors.mu, color: colors.tx, indicator: false }
}

export function pressedChipColors(colors: ThemeColors) {
  return { backgroundColor: colors.pressed, borderColor: colors.mu, color: colors.tx }
}

export function feedbackColors(colors: ThemeColors, kind: 'info' | 'success' | 'warning' | 'error') {
  return {
    info: { background: colors.s1, border: colors.bd, text: colors.t2 },
    success: { background: colors.s1, border: colors.bd, text: colors.tx },
    warning: { background: colors.s1, border: colors.bd, text: colors.tx },
    error: { background: colors.s1, border: colors.dg, text: colors.dg },
  }[kind]
}

export function reorderControlColors(colors: ThemeColors, enabled: boolean) {
  return { color: colors.tx, opacity: enabled ? 1 : 0.2 }
}

export function formFieldColors(colors: ThemeColors, focused: boolean, error: boolean, disabled: boolean) {
  return {
    backgroundColor: disabled ? colors.s2 : colors.s1,
    color: colors.tx,
    borderColor: error ? colors.dg : focused ? colors.ac : colors.mu,
    cursorColor: colors.ac,
    selectionColor: colors.focus,
  }
}

export function screenPadding(top: number, bottom: number, includeBottomInset: boolean) {
  return {
    paddingTop: top + shared.screen.topSpacing,
    paddingBottom: includeBottomInset ? bottom + shared.spacing.xl : shared.screen.bottomSpacing,
  }
}

export function tabColors(colors: ThemeColors) {
  return { active: colors.tx, inactive: colors.mu, background: colors.bg }
}

export function resolvedDarkTheme(
  preference: ThemePreference | 'SYSTEM' | 'LIGHT' | 'DARK',
  systemScheme: 'light' | 'dark' | 'unspecified' | null | undefined,
) {
  const normalized = preference.toLowerCase()
  return normalized === 'system' ? systemScheme === 'dark' : normalized === 'dark'
}

export function systemBarStyle(dark: boolean) {
  return dark ? 'light' as const : 'dark' as const
}

export function workoutPalette(colors: ThemeColors, highContrast: boolean) {
  return highContrast ? colors.workout : {
    background: colors.bg,
    surface: colors.s1,
    border: colors.mu,
    text: colors.tx,
    textSecondary: colors.t2,
    completed: colors.tx,
    onCompleted: colors.bg,
    pending: colors.s2,
    timer: colors.ac,
    timerText: colors.on,
    danger: colors.dg,
  }
}
