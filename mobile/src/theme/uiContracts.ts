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
    ? { backgroundColor: colors.primary, borderColor: colors.primary, color: colors.onPrimary, indicator: true }
    : { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, indicator: false }
}

export function pressedChipColors(colors: ThemeColors) {
  return { backgroundColor: colors.primaryPressed, borderColor: colors.primaryPressed, color: colors.onPrimary }
}

export function feedbackColors(colors: ThemeColors, kind: 'info' | 'success' | 'warning' | 'error') {
  return {
    info: { background: colors.surface, border: colors.focus, text: colors.textPrimary },
    success: { background: colors.successSurface, border: colors.success, text: colors.textPrimary },
    warning: { background: colors.surfaceSecondary, border: colors.warning, text: colors.textPrimary },
    error: { background: colors.dangerSurface, border: colors.danger, text: colors.textPrimary },
  }[kind]
}

export function reorderControlColors(colors: ThemeColors, enabled: boolean) {
  return { color: colors.textPrimary, opacity: enabled ? 1 : 0.2 }
}

export function formFieldColors(colors: ThemeColors, focused: boolean, error: boolean, disabled: boolean) {
  return {
    backgroundColor: disabled ? colors.surfaceSecondary : colors.surface,
    borderColor: error ? colors.danger : focused ? colors.focus : colors.border,
    cursorColor: colors.primary,
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
  return { active: colors.primary, inactive: colors.textSecondary, background: colors.tabBar }
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
    background: colors.background,
    surface: colors.surface,
    border: colors.border,
    text: colors.textPrimary,
    textSecondary: colors.textSecondary,
    completed: colors.success,
    onCompleted: colors.background,
    pending: colors.surfaceSecondary,
    timer: colors.textPrimary,
    timerText: colors.background,
    danger: colors.danger,
  }
}
