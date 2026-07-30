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
  background: string
  surface: string
  surfaceSecondary: string
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

const whiteBlueLight: ThemeColors = {
  background: '#F5F7FA', surface: '#FFFFFF', surfaceSecondary: '#EAF0F7', card: '#FFFFFF',
  border: '#CBD5E1', primary: '#155EEF', primaryPressed: '#124DC5', onPrimary: '#FFFFFF',
  textPrimary: '#111827', textSecondary: '#4B5563', success: '#147A3D', successSurface: '#DCFCE7',
  warning: '#9A4D00', danger: '#B42318', dangerSurface: '#FEE4E2', focus: '#2563EB',
  disabled: '#94A3B8', tabBar: '#FFFFFF', overlay: 'rgba(15,23,42,0.64)', scrim: 'rgba(15,23,42,0.64)',
  black: '#0F172A', nearBlack: '#111827', ink: '#111827', gray700: '#374151', gray500: '#4B5563',
  gray400: '#4B5563', gray300: '#CBD5E1', gray200: '#D8E0EA', gray100: '#EAF0F7', white: '#FFFFFF',
  workout: {
    background: '#FFFFFF', surface: '#F8FAFC', border: '#334155', text: '#0F172A',
    textSecondary: '#334155', completed: '#166534', onCompleted: '#FFFFFF', pending: '#FFFFFF',
    timer: '#0F172A', timerText: '#FFFFFF', danger: '#991B1B',
  },
}

const whiteBlueDark: ThemeColors = {
  background: '#0B1220', surface: '#121C2E', surfaceSecondary: '#1B2940', card: '#121C2E',
  border: '#40516B', primary: '#74A7FF', primaryPressed: '#4D8FF7', onPrimary: '#07101F',
  textPrimary: '#F8FAFC', textSecondary: '#C0CAD8', success: '#5EE68A', successSurface: '#143522',
  warning: '#FFD166', danger: '#FF8A80', dangerSurface: '#431C20', focus: '#9BC1FF',
  disabled: '#728097', tabBar: '#121C2E', overlay: 'rgba(0,0,0,0.76)', scrim: 'rgba(0,0,0,0.76)',
  black: '#07101F', nearBlack: '#121C2E', ink: '#F8FAFC', gray700: '#E2E8F0', gray500: '#C0CAD8',
  gray400: '#C0CAD8', gray300: '#607089', gray200: '#40516B', gray100: '#1B2940', white: '#FFFFFF',
  workout: {
    background: '#07101F', surface: '#101D31', border: '#AFCBFF', text: '#FFFFFF',
    textSecondary: '#D8E6FF', completed: '#6EE7A0', onCompleted: '#071510', pending: '#101D31',
    timer: '#FFFFFF', timerText: '#07101F', danger: '#FFB4AC',
  },
}

const darkBlueLight: ThemeColors = {
  ...whiteBlueLight,
  background: '#EEF4FA', surfaceSecondary: '#E1EBF5', primary: '#075985', primaryPressed: '#064667',
  focus: '#0369A1', tabBar: '#F8FBFF', gray100: '#E1EBF5',
  workout: { ...whiteBlueLight.workout, completed: '#14532D', timer: '#082F49' },
}

const darkBlueDark: ThemeColors = {
  ...whiteBlueDark,
  background: '#071421', surface: '#0D2133', surfaceSecondary: '#143047', card: '#0D2133',
  border: '#315979', primary: '#56B4F4', primaryPressed: '#2E9DDF', onPrimary: '#03111D',
  tabBar: '#0A1B2A', nearBlack: '#0D2133', gray200: '#315979', gray100: '#143047',
  workout: { ...whiteBlueDark.workout, background: '#020B12', surface: '#0A1B2A', border: '#9AD9FF', pending: '#0A1B2A' },
}

const monochromeLight: ThemeColors = {
  ...whiteBlueLight,
  background: '#F4F4F4', surfaceSecondary: '#E7E7E7', border: '#B8B8B8',
  primary: '#242424', primaryPressed: '#000000', focus: '#4A4A4A', tabBar: '#FFFFFF',
  success: '#2E5E3E', warning: '#674E10', danger: '#8F2424', gray100: '#E7E7E7',
  workout: { ...whiteBlueLight.workout, completed: '#1F432B', timer: '#171717' },
}

const monochromeDark: ThemeColors = {
  ...whiteBlueDark,
  background: '#101010', surface: '#1C1C1C', surfaceSecondary: '#292929', card: '#1C1C1C',
  border: '#555555', primary: '#F2F2F2', primaryPressed: '#D5D5D5', onPrimary: '#101010',
  focus: '#FFFFFF', tabBar: '#181818', nearBlack: '#1C1C1C', gray200: '#555555', gray100: '#292929',
  workout: { ...whiteBlueDark.workout, background: '#050505', surface: '#171717', border: '#FFFFFF', pending: '#171717' },
}

const draculaLight: ThemeColors = {
  ...whiteBlueLight,
  background: '#F8F4FC', surfaceSecondary: '#EEE5F6', border: '#CBBBDD',
  primary: '#6D28D9', primaryPressed: '#5B21B6', focus: '#7C3AED', tabBar: '#FFFAFF',
  success: '#147A3D', warning: '#8A4B00', danger: '#A61B48', gray100: '#EEE5F6',
  workout: { ...whiteBlueLight.workout, completed: '#166534', timer: '#3B1764' },
}

const draculaDark: ThemeColors = {
  ...whiteBlueDark,
  background: '#191622', surface: '#242033', surfaceSecondary: '#302A43', card: '#242033',
  border: '#574D70', primary: '#C7A0FF', primaryPressed: '#AD7CF3', onPrimary: '#1B1228',
  success: '#70E89B', warning: '#FFD37A', danger: '#FF8FB3', focus: '#8BE9FD',
  tabBar: '#211D2D', nearBlack: '#242033', gray200: '#574D70', gray100: '#302A43',
  workout: {
    ...whiteBlueDark.workout, background: '#100D17', surface: '#211C2F', border: '#E5D4FF',
    completed: '#70E89B', pending: '#211C2F', timer: '#F8F5FF', timerText: '#171020', danger: '#FFB3CB',
  },
}

export const themePalettes: Record<ThemePreset, { light: ThemeColors; dark: ThemeColors }> = {
  DARK_BLUE: { light: darkBlueLight, dark: darkBlueDark },
  MONOCHROME: { light: monochromeLight, dark: monochromeDark },
  DRACULA: { light: draculaLight, dark: draculaDark },
  WHITE_BLUE: { light: whiteBlueLight, dark: whiteBlueDark },
}

export const lightColors = whiteBlueLight
export const darkColors = darkBlueDark

export function resolvePalette(preset: ThemePreset, dark: boolean) {
  return themePalettes[preset][dark ? 'dark' : 'light']
}
