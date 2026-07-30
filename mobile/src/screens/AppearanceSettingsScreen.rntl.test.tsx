import { createElement } from 'react'
import { Animated, Text } from 'react-native'
import {
  fireEvent,
  renderAsync,
  screen,
  waitFor,
} from '@testing-library/react-native'

const mockTheme = {
  cancelPreview: jest.fn(),
  restoreDefaults: jest.fn(),
  savePreferences: jest.fn(async () => false),
  updatePreview: jest.fn(),
  motion: { effective: 'OFF', duration: 0, translate: 0, scale: 1 },
  preferences: {
    themePreset: 'DARK_BLUE',
    appearance: 'SYSTEM',
    motion: 'OFF',
    workoutHighContrast: false,
    hapticsEnabled: false,
  },
}

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}))
jest.mock('../theme', () => ({
  appearancePreferenceIds: ['SYSTEM', 'LIGHT', 'DARK'],
  motionPreferenceIds: ['SYSTEM', 'FULL', 'REDUCED', 'OFF'],
  shared: { spacing: { sm: 8, lg: 16 }, touchTarget: { minimum: 48 } },
  themePresetIds: ['DARK_BLUE', 'MONOCHROME', 'DRACULA', 'WHITE_BLUE'],
  useTheme: () => ({
    colors: new Proxy({}, { get: () => '#000000' }),
    ...mockTheme,
  }),
}))
jest.mock('../theme/haptics', () => ({ triggerHaptic: jest.fn() }))
jest.mock('../theme/typography', () => ({
  typography: { body: {}, bodySmall: {}, caption: {}, label: {}, title: {} },
}))
jest.mock('../components/Screen', () => {
  const { View } = require('react-native')
  return { ScreenScrollView: View }
})
jest.mock('../components/ScreenHeader', () => {
  const React = require('react')
  const { Text, View } = require('react-native')
  return {
    ScreenHeader: ({ title, action }: { title: string; action?: React.ReactNode }) =>
      React.createElement(View, null, action, React.createElement(Text, null, title)),
  }
})

import { MotionView } from '../components/MotionView'
import { AppearanceSettingsScreen } from './AppearanceSettingsScreen'

describe('aparência e movimento renderizados', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTheme.motion = { effective: 'OFF', duration: 0, translate: 0, scale: 1 }
  })

  it('aplica prévia, informa falha ao salvar e cancela alterações ao sair', async () => {
    const view = await renderAsync(createElement(AppearanceSettingsScreen))
    fireEvent.press(screen.getByText('Violeta'))
    expect(mockTheme.updatePreview).toHaveBeenCalledWith({ themePreset: 'DRACULA' })

    fireEvent.press(screen.getByText('Salvar preferências'))
    await waitFor(() => {
      expect(screen.getByText('Não foi possível salvar as preferências.')).toBeTruthy()
    })

    await view.unmountAsync()
    expect(mockTheme.cancelPreview).toHaveBeenCalledTimes(1)
  })

  it('reinicia a animação ao trocar de desativado para completo', async () => {
    const setValue = jest.spyOn(Animated.Value.prototype, 'setValue')
    const timing = jest.spyOn(Animated, 'timing')
    const child = createElement(Text, null, 'Prévia')
    const view = await renderAsync(createElement(MotionView, null, child))
    expect(setValue).toHaveBeenCalledWith(1)

    mockTheme.motion = { effective: 'FULL', duration: 180, translate: 8, scale: 0.98 }
    await view.rerenderAsync(createElement(MotionView, null, child))

    expect(setValue).toHaveBeenLastCalledWith(0)
    expect(timing).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({ duration: 180, toValue: 1 }),
    )
  })
})
