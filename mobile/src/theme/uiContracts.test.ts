import { describe, expect, it } from 'vitest'
import { darkColors, lightColors } from './palette'
import { typography } from './typography'
import { shared } from './tokens'
import {
  contrastRatio,
  formFieldColors,
  resolvedDarkTheme,
  screenPadding,
  selectableChipColors,
  tabColors,
} from './uiContracts'

describe.each([
  ['claro', lightColors],
  ['escuro', darkColors],
] as const)('contratos visuais do tema %s', (_, colors) => {
  it('mantém contraste AA nos pares principais', () => {
    expect(contrastRatio(colors.textPrimary, colors.background)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(colors.textSecondary, colors.background)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(colors.onPrimary, colors.primary)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(colors.danger, colors.background)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(tabColors(colors).active, tabColors(colors).background)).toBeGreaterThanOrEqual(3)
  })

  it('distingue chip selecionado com cor e indicador', () => {
    const normal = selectableChipColors(colors, false)
    const selected = selectableChipColors(colors, true)
    expect(selected.backgroundColor).not.toBe(normal.backgroundColor)
    expect(selected.color).not.toBe(normal.color)
    expect(selected.indicator).toBe(true)
  })

  it('usa cursor, seleção, foco e erro sem preto fixo', () => {
    expect(formFieldColors(colors, true, false, false).borderColor).toBe(colors.focus)
    expect(formFieldColors(colors, false, true, false).borderColor).toBe(colors.danger)
    expect(formFieldColors(colors, false, false, false).cursorColor).toBe(colors.primary)
    expect(formFieldColors(colors, false, false, false).selectionColor).toBe(colors.focus)
  })
})

it('aplica insets superior e inferior conforme a tela', () => {
  expect(screenPadding(32, 24, true)).toEqual({ paddingTop: 48, paddingBottom: 44 })
  expect(screenPadding(32, 24, false)).toEqual({ paddingTop: 48, paddingBottom: 120 })
})

it('resolve tema sistema, claro e escuro', () => {
  expect(resolvedDarkTheme('system', 'dark')).toBe(true)
  expect(resolvedDarkTheme('system', 'light')).toBe(false)
  expect(resolvedDarkTheme('light', 'dark')).toBe(false)
  expect(resolvedDarkTheme('dark', 'light')).toBe(true)
})

it('mantém escala tipográfica e alvos mínimos', async () => {
  expect(Math.min(...Object.values(typography).map((token) => token.fontSize))).toBe(12)
  expect(shared.touchTarget.minimum).toBeGreaterThanOrEqual(48)
  expect(tabColors(lightColors).active).not.toBe(tabColors(lightColors).inactive)
})

it.each([320, 360, 375, 390, 412, 430, 480])('mantém a grade da Home dentro de %i px', (viewport) => {
  const content = viewport - shared.screen.horizontalPadding * 2
  const minimumGrid = shared.responsive.metricMinWidth * 2 + shared.responsive.twoColumnGap
  expect(content).toBeGreaterThanOrEqual(minimumGrid)
})
