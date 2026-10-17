export type ThemePreset = 'DARK_BLUE' | 'MONOCHROME' | 'DRACULA' | 'WHITE_BLUE'
export type AppearancePreference = 'SYSTEM' | 'LIGHT' | 'DARK'
export type MotionPreference = 'SYSTEM' | 'FULL' | 'REDUCED' | 'OFF'
export type ThemePreference = 'system' | 'light' | 'dark'

export interface WorkoutColors {
  background: string
  surface: string
  border: string
  text: string
  textSecondary: string
  completed: string
  onCompleted: string
  pending: string
  timer: string
  timerText: string
  danger: string
}

export interface ThemeColors {
  /** MIV semantic roles. Components should prefer these names. */
  bg: string
  s1: string
  s2: string
  bd: string
  tx: string
  t2: string
  mu: string
  ac: string
  on: string
  dg: string
  pressed: string
  onDanger: string

  /** Compatibility aliases used while screens migrate to the MIV roles. */
  background: string
  surface: string
  surfaceSecondary: string
  surfaceTertiary: string
  card: string
  border: string
  primary: string
  primaryPressed: string
  onPrimary: string
  textPrimary: string
  textSecondary: string
  success: string
  successSurface: string
  warning: string
  danger: string
  dangerSurface: string
  focus: string
  disabled: string
  tabBar: string
  overlay: string
  scrim: string
  black: string
  nearBlack: string
  ink: string
  gray700: string
  gray500: string
  gray400: string
  gray300: string
  gray200: string
  gray100: string
  white: string
  workout: WorkoutColors
}

type SemanticPalette = Pick<ThemeColors, 'bg' | 's1' | 's2' | 'bd' | 'tx' | 't2' | 'mu' | 'ac' | 'on' | 'dg'>

const highContrastWorkout: WorkoutColors = {
  background: '#000000',
  surface: '#0A0A0A',
  border: '#6B6B6B',
  text: '#FFFFFF',
  textSecondary: '#D0D0D0',
  completed: '#FFFFFF',
  onCompleted: '#000000',
  pending: '#1A1A1A',
  timer: '#FFFFFF',
  timerText: '#000000',
  danger: '#FF9C8E',
}

function blend(background: string, foreground: string, opacity: number) {
  const channel = (base: number, top: number) => Math.round(base * (1 - opacity) + top * opacity)
  const hex = (value: string) => [1, 3, 5].map((start) => Number.parseInt(value.slice(start, start + 2), 16))
  const [br, bg, bb] = hex(background)
  const [fr, fg, fb] = hex(foreground)
  return `#${[channel(br, fr), channel(bg, fg), channel(bb, fb)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`
}

function createPalette(tokens: SemanticPalette, dark: boolean): ThemeColors {
  const scrim = dark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)'
  return {
    ...tokens,
    pressed: blend(tokens.s1, tokens.tx, 0.08),
    onDanger: dark ? tokens.bg : '#FFFFFF',
    background: tokens.bg,
    surface: tokens.s1,
    surfaceSecondary: tokens.s2,
    surfaceTertiary: tokens.s2,
    card: tokens.s1,
    border: tokens.bd,
    primary: tokens.ac,
    primaryPressed: blend(tokens.bg, tokens.ac, 0.88),
    onPrimary: tokens.on,
    textPrimary: tokens.tx,
    textSecondary: tokens.t2,
    success: tokens.tx,
    successSurface: tokens.s1,
    warning: tokens.t2,
    danger: tokens.dg,
    dangerSurface: tokens.s1,
    focus: tokens.ac,
    disabled: `rgba(${Number.parseInt(tokens.tx.slice(1, 3), 16)},${Number.parseInt(tokens.tx.slice(3, 5), 16)},${Number.parseInt(tokens.tx.slice(5, 7), 16)},0.38)`,
    tabBar: tokens.bg,
    overlay: scrim,
    scrim,
    black: '#000000',
    nearBlack: tokens.bg,
    ink: tokens.tx,
    gray700: tokens.tx,
    gray500: tokens.t2,
    gray400: tokens.mu,
    gray300: tokens.bd,
    gray200: tokens.s2,
    gray100: tokens.s1,
    white: '#FFFFFF',
    workout: highContrastWorkout,
  }
}

const monochromeLight = createPalette({
  bg: '#FAFAFA', s1: '#FFFFFF', s2: '#F0F0F0', bd: '#E2E2E2',
  tx: '#111111', t2: '#5C5C5C', mu: '#6E6E6E', ac: '#111111', on: '#FFFFFF', dg: '#B3261E',
}, false)

const monochromeDark = createPalette({
  bg: '#121212', s1: '#1A1A1A', s2: '#242424', bd: '#2B2B2B',
  tx: '#F2F2F2', t2: '#A0A0A0', mu: '#8A8A8A', ac: '#F2F2F2', on: '#121212', dg: '#FF8A7A',
}, true)

const violetLight = createPalette({
  bg: '#F7F5FC', s1: '#FFFFFF', s2: '#ECE8F7', bd: '#DDD7EE',
  tx: '#14102A', t2: '#57517A', mu: '#6A6490', ac: '#4A2BA8', on: '#FFFFFF', dg: '#B3261E',
}, false)

const violetDark = createPalette({
  bg: '#0C0A18', s1: '#151226', s2: '#1E1A35', bd: '#2A2546',
  tx: '#EFEBFA', t2: '#A59FC2', mu: '#8F89AE', ac: '#CBB8FF', on: '#0C0A18', dg: '#FF9A8A',
}, true)

const blueLight = createPalette({
  bg: '#F4F6FB', s1: '#FFFFFF', s2: '#E6EBF5', bd: '#D6DDEC',
  tx: '#0E1526', t2: '#4F5B78', mu: '#626E8C', ac: '#1B3A8C', on: '#FFFFFF', dg: '#B3261E',
}, false)

const blueDark = createPalette({
  bg: '#080D18', s1: '#101828', s2: '#18233A', bd: '#26324D',
  tx: '#EAF0FA', t2: '#9DAAC4', mu: '#8693B0', ac: '#A9C4FF', on: '#080D18', dg: '#FF9A8A',
}, true)

const whiteBlueLight = createPalette({
  bg: '#FFFFFF', s1: '#F5F7FA', s2: '#E9EDF3', bd: '#DCE2EA',
  tx: '#0E1116', t2: '#4D5663', mu: '#5F6978', ac: '#1B4FD6', on: '#FFFFFF', dg: '#B3261E',
}, false)

const whiteBlueDark = createPalette({
  bg: '#0D1015', s1: '#161A22', s2: '#1F2430', bd: '#2A3140',
  tx: '#EEF1F6', t2: '#A0A9B8', mu: '#8A94A5', ac: '#8AA9FF', on: '#0D1015', dg: '#FF9A8A',
}, true)

export const themePalettes: Record<ThemePreset, { light: ThemeColors; dark: ThemeColors }> = {
  DARK_BLUE: { light: blueLight, dark: blueDark },
  MONOCHROME: { light: monochromeLight, dark: monochromeDark },
  DRACULA: { light: violetLight, dark: violetDark },
  WHITE_BLUE: { light: whiteBlueLight, dark: whiteBlueDark },
}

export const lightColors: ThemeColors = monochromeLight
export const darkColors: ThemeColors = monochromeDark

export function resolvePalette(preset: ThemePreset, dark: boolean) {
  return themePalettes[preset][dark ? 'dark' : 'light']
}
