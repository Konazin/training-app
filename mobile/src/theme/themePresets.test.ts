import { describe, expect, it } from 'vitest'
import {
  resolvePalette,
  themePalettes,
  type ThemePreset,
} from './palette'
import { contrastRatio, resolvedDarkTheme, systemBarStyle, workoutPalette } from './uiContracts'
import { themePresetIds } from './preferences'

describe('presets semânticos', () => {
  it('expõe exatamente os quatro IDs previstos', () => {
    expect(themePresetIds).toEqual(['DARK_BLUE', 'MONOCHROME', 'DRACULA', 'WHITE_BLUE'])
    expect(Object.keys(themePalettes)).toEqual(themePresetIds)
  })

  it.each(themePresetIds)('%s resolve variantes clara e escura acessíveis', (preset: ThemePreset) => {
    const light = resolvePalette(preset, false)
    const dark = resolvePalette(preset, true)
    expect(light).not.toBe(dark)
    for (const palette of [light, dark]) {
      expect(contrastRatio(palette.textPrimary, palette.background)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(palette.textSecondary, palette.background)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(palette.onPrimary, palette.primary)).toBeGreaterThanOrEqual(4.5)
      const workout = workoutPalette(palette, true)
      expect(contrastRatio(workout.text, workout.background)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(workout.textSecondary, workout.background)).toBeGreaterThanOrEqual(4.5)
      expect(workout.border).not.toBe(workout.surface)
    }
  })

  it('SYSTEM reage ao SO; preferências explícitas e barras o ignoram', () => {
    expect(resolvedDarkTheme('SYSTEM', 'dark')).toBe(true)
    expect(resolvedDarkTheme('SYSTEM', 'light')).toBe(false)
    expect(resolvedDarkTheme('LIGHT', 'dark')).toBe(false)
    expect(resolvedDarkTheme('DARK', 'light')).toBe(true)
    expect(systemBarStyle(true)).toBe('light')
    expect(systemBarStyle(false)).toBe('dark')
  })
})
